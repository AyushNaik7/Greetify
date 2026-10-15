// Server-only AI receptionist: model calls + tool execution against one business.
// Callers pass a Supabase client that is already authorized for that business
// (a user RLS client from a server function, or the admin client after a verified Twilio webhook).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { format, parseISO } from "date-fns";
import { computeSlots, createAppointmentRecord, samePhone, upcomingFor } from "@/lib/appointments";

type DB = SupabaseClient<Database>;

export type ChatTurn =
  | { role: "user" | "assistant"; content: string }
  | { role: "assistant"; content: string | null; tool_calls: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

const SYSTEM_PROMPT = `You are a professional AI receptionist for a business. Your role is to:

1. Answer questions using the knowledge base (services, pricing, hours, policies).
2. Manage appointments: check availability before suggesting times, collect ALL required information (name, phone, service, date/time) before booking, confirm details first, and help reschedule or cancel.
3. Look up existing customers to provide personalized service.
4. Record callback requests when you cannot help or a human is needed (high priority for urgent matters).

Guidelines: be polite, professional and concise. Ask clarifying questions when information is missing. Confirm before taking actions. Never make up information — use the knowledge base or say you don't know.
Escalate to a human (record a callback) for complex requests, complaints, refunds, special accommodations, or when the customer asks for a human.`;

const TOOLS = [
  {
    name: "search_knowledge_base",
    description: "Search the business knowledge base for services, pricing, policies, hours and FAQs.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "check_availability",
    description: "Check appointment availability for a date. Returns available time slots.",
    parameters: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD" }, service: { type: "string" } },
      required: ["date"],
    },
  },
  {
    name: "create_appointment",
    description: "Create a new appointment. Collect all required information first.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        customer_phone: { type: "string" },
        customer_email: { type: "string" },
        service: { type: "string" },
        date_time: { type: "string", description: "ISO 8601, e.g. 2026-05-01T14:00:00" },
        duration: { type: "number", description: "minutes" },
        notes: { type: "string" },
      },
      required: ["customer_name", "customer_phone", "service", "date_time", "duration"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Reschedule the customer's next upcoming appointment, found by phone number.",
    parameters: {
      type: "object",
      properties: { customer_phone: { type: "string" }, new_date_time: { type: "string" } },
      required: ["customer_phone", "new_date_time"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancel the customer's next upcoming appointment, found by phone number.",
    parameters: { type: "object", properties: { customer_phone: { type: "string" } }, required: ["customer_phone"] },
  },
  {
    name: "lookup_customer",
    description: "Look up an existing customer by phone number.",
    parameters: { type: "object", properties: { phone: { type: "string" } }, required: ["phone"] },
  },
  {
    name: "record_callback_request",
    description: "Record a request for a human to call the customer back.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        customer_phone: { type: "string" },
        message: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["customer_name", "customer_phone", "message"],
    },
  },
] as const;


// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTool(db: DB, businessId: string, name: string, args: any): Promise<unknown> {
  switch (name) {
    case "search_knowledge_base": {
      const { data } = await db.from("knowledge_entries").select("*").eq("business_id", businessId).eq("enabled", true);
      const words = String(args.query || "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      const hits = (data ?? []).filter((e) => {
        const hay = `${e.question} ${e.answer} ${e.category ?? ""}`.toLowerCase();
        return words.length === 0 || words.some((w) => hay.includes(w));
      });
      const { data: services } = await db.from("services").select("name, duration, price_range, description").eq("business_id", businessId).eq("enabled", true);
      return hits.length || services?.length
        ? { found: true, entries: hits.slice(0, 8).map((e) => ({ question: e.question, answer: e.answer, category: e.category })), services }
        : { found: false, message: "No relevant information found in the knowledge base." };
    }
    case "check_availability": {
      const date = String(args.date);
      const day = parseISO(date).getDay();
      const { data: hours } = await db.from("business_hours").select("*").eq("business_id", businessId).eq("day_of_week", day).maybeSingle();
      if (hours && !hours.is_open) return { date, availableSlots: [], message: "The business is closed that day." };
      const open = hours?.open_time ?? "09:00", close = hours?.close_time ?? "18:00";
      const { data: appts } = await db
        .from("appointments").select("date_time, duration, status").eq("business_id", businessId).neq("status", "cancelled")
        .gte("date_time", `${date}T00:00:00`).lte("date_time", `${date}T23:59:59`);
      const slots = computeSlots(date, open, close, (appts ?? []).map((a) => ({ start: parseISO(a.date_time), minutes: a.duration })));
      return { date, service: args.service, availableSlots: slots, bookedCount: appts?.length ?? 0 };
    }
    case "create_appointment": {
      await createAppointmentRecord(db, businessId, args);
      return { message: `Appointment created for ${args.customer_name} on ${format(parseISO(args.date_time), "MMMM d, yyyy 'at' h:mm a")}` };
    }
    case "reschedule_appointment": {
      const [appt] = await upcomingFor(db, businessId, args.customer_phone);
      if (!appt) throw new Error("No upcoming appointment found for this phone number");
      const { error } = await db.from("appointments").update({ date_time: new Date(args.new_date_time).toISOString() }).eq("id", appt.id);
      if (error) throw error;
      return { message: `Appointment rescheduled to ${format(parseISO(args.new_date_time), "MMMM d, yyyy 'at' h:mm a")}` };
    }
    case "cancel_appointment": {
      const [appt] = await upcomingFor(db, businessId, args.customer_phone);
      if (!appt) throw new Error("No upcoming appointment found for this phone number");
      const { error } = await db.from("appointments").update({ status: "cancelled" }).eq("id", appt.id);
      if (error) throw error;
      return { message: "Appointment cancelled successfully" };
    }
    case "lookup_customer": {
      const { data } = await db.from("contacts").select("name, phone, email, notes").eq("business_id", businessId);
      const c = (data ?? []).find((x) => samePhone(x.phone, args.phone));
      return c ? { found: true, customer: c } : { found: false, message: "Customer not found in system" };
    }
    case "record_callback_request": {
      const { error } = await db.from("messages").insert({
        business_id: businessId,
        customer_name: args.customer_name,
        customer_phone: args.customer_phone,
        message: args.message,
        priority: ["low", "medium", "high"].includes(args.priority) ? args.priority : "medium",
      });
      if (error) throw error;
      return { message: "Callback request recorded. Someone will contact the customer soon." };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function providerConfig() {
  const openRouterKey = process.env["OPENROUTER_API_KEY"];
  if (openRouterKey) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: { Authorization: `Bearer ${openRouterKey}` } as Record<string, string>,
      model: process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini",
      label: "OpenRouter",
    };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("AI service not configured");
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Lovable-AIG-SDK": "fetch" } as Record<string, string>,
    // Fast model on chat completions keeps phone-call turns low-latency.
    model: "google/gemini-3-flash-preview",
    label: "Lovable AI",
  };
}

export interface ReceptionistResult {
  reply: string;
  toolsUsed: string[];
  model: string;
}

export async function runReceptionist(
  db: DB,
  businessId: string,
  history: { role: "user" | "assistant"; content: string }[],
  opts: { channel?: "chat" | "phone"; callerPhone?: string } = {},
): Promise<ReceptionistResult> {
  const cfg = providerConfig();
  const [{ data: biz }, { data: settings }] = await Promise.all([
    db.from("businesses").select("name, business_type, timezone, phone, email, address").eq("id", businessId).single(),
    db.from("business_settings").select("ai_tone, booking_enabled, cancellation_enabled").eq("business_id", businessId).maybeSingle(),
  ]);
  const disabled = new Set<string>();
  if (settings?.booking_enabled === false) disabled.add("create_appointment").add("reschedule_appointment");
  if (settings?.cancellation_enabled === false) disabled.add("cancel_appointment");
  const tools = TOOLS.filter((t) => !disabled.has(t.name)).map((t) => ({ type: "function" as const, function: t }));

  const system = [
    SYSTEM_PROMPT,
    `Business: ${biz?.name ?? "the business"}${biz?.business_type ? ` (${biz.business_type})` : ""}. Timezone: ${biz?.timezone ?? "UTC"}. Today is ${format(new Date(), "EEEE, yyyy-MM-dd")}.`,
    biz?.address ? `Address: ${biz.address}.` : "",
    settings?.ai_tone ? `Tone: ${settings.ai_tone}.` : "",
    opts.channel === "phone"
      ? `You are on a live phone call. Reply in 1-3 short spoken sentences, no markdown or lists.${opts.callerPhone ? ` The caller's phone number is ${opts.callerPhone}.` : ""}`
      : "",
  ].filter(Boolean).join("\n");

  const messages: (ChatTurn | { role: "system"; content: string })[] = [{ role: "system", content: system }, ...history];
  const toolsUsed: string[] = [];

  for (let i = 0; i < 5; i++) {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cfg.headers },
      body: JSON.stringify({ model: cfg.model, messages, tools, tool_choice: "auto" }),
    });
    if (res.status === 429) throw new Error("AI service is temporarily busy. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please add credits to continue.");
    if (!res.ok) {
      console.error(`[receptionist] ${cfg.label} error`, res.status, await res.text());
      throw new Error("The AI service returned an error. Please try again.");
    }
    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    const calls: ToolCall[] = msg?.tool_calls ?? [];
    if (!calls.length) {
      return { reply: msg?.content || "Sorry, could you say that again?", toolsUsed, model: cfg.model };
    }
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
    for (const call of calls) {
      toolsUsed.push(call.function.name);
      let content: string;
      try {
        if (disabled.has(call.function.name)) throw new Error("This action is disabled for this business");
        const out = await runTool(db, businessId, call.function.name, JSON.parse(call.function.arguments || "{}"));
        content = JSON.stringify({ success: true, data: out });
      } catch (e) {
        content = JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Tool failed" });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
  }
  return {
    reply: "I'm having trouble with that request. May I take your name and number so someone can call you back?",
    toolsUsed,
    model: cfg.model,
  };
}
