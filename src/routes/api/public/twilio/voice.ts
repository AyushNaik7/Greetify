import { createFileRoute } from "@tanstack/react-router";


// Twilio voice webhook. Point your Twilio number's "A call comes in" webhook (POST) here.
// Every request is verified with the X-Twilio-Signature header before any data is touched.

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const VOICES: Record<string, string> = {
  "female-natural": "Polly.Joanna", "male-natural": "Polly.Matthew",
  "female-professional": "Polly.Kendra", "male-professional": "Polly.Joey",
};
const xml = (body: string, status = 200) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, { status, headers: { "Content-Type": "text/xml" } });
const fail = (status = 200) => xml(`<Say voice="Polly.Joanna">We're sorry, we're having technical difficulties. Please try again later.</Say><Hangup/>`, status);

async function validSignature(url: string, params: Record<string, string>, signature: string, token: string) {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  const expected = btoa(String.fromCharCode(...mac));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

const digits = (s: string) => (s || "").replace(/\D/g, "").slice(-10);

export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      GET: async () => Response.json({ status: "ok", message: "Twilio voice webhook is ready" }),
      POST: async ({ request }) => {
        const token = process.env["TWILIO_AUTH_TOKEN"];
        if (!token) { console.error("[twilio] TWILIO_AUTH_TOKEN not configured"); return fail(); }

        const form = await request.formData();
        const params: Record<string, string> = {};
        form.forEach((v, k) => { params[k] = String(v); });

        const u = new URL(request.url);
        const host = request.headers.get("x-forwarded-host") ?? u.host;
        const publicUrl = `https://${host}${u.pathname}${u.search}`;
        if (!(await validSignature(publicUrl, params, request.headers.get("x-twilio-signature") ?? "", token))) {
          console.error("[twilio] invalid signature");
          return fail(403);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const step = u.searchParams.get("step") ?? "incoming";
        const callSid = params["CallSid"];
        if (!callSid) return fail(400);
        const self = `${u.pathname}`;

        if (step === "status") {
          await supabaseAdmin.from("call_logs").update({
            status: params["CallStatus"] ?? "completed",
            ended_at: new Date().toISOString(),
            duration: params["CallDuration"] ? Number(params["CallDuration"]) : null,
          }).eq("call_sid", callSid);
          return new Response(null, { status: 204 });
        }

        if (step === "incoming") {
          const { data: businesses } = await supabaseAdmin.from("businesses").select("id, phone");
          const biz = (businesses ?? []).find((b) => b.phone && digits(b.phone) === digits(params["To"] ?? ""));
          if (!biz) { console.error("[twilio] no business for number", params["To"]); return fail(); }
          const { data: settings } = await supabaseAdmin.from("business_settings").select("ai_greeting, voice_type").eq("business_id", biz.id).maybeSingle();
          await supabaseAdmin.from("call_logs").upsert({
            business_id: biz.id, call_sid: callSid, direction: "inbound",
            from_number: params["From"] ?? "unknown", to_number: params["To"] ?? "",
            status: "in-progress", started_at: new Date().toISOString(), answered_at: new Date().toISOString(), ai_handled: true,
            conversation: settings?.ai_greeting ? [{ role: "assistant", content: settings.ai_greeting }] : [],
          }, { onConflict: "call_sid" });
          const voice = VOICES[settings?.voice_type ?? ""] ?? "Polly.Joanna";
          const greeting = settings?.ai_greeting || "Hello! Thank you for calling. How can I help you today?";
          return xml(`<Gather input="speech" speechTimeout="auto" action="${self}?step=gather" method="POST"><Say voice="${voice}">${esc(greeting)}</Say></Gather><Redirect method="POST">${self}?step=gather</Redirect>`);
        }

        // step === "gather": caller said something
        const { data: log } = await supabaseAdmin.from("call_logs").select("*").eq("call_sid", callSid).maybeSingle();
        if (!log) return fail();
        const { data: settings } = await supabaseAdmin.from("business_settings").select("voice_type").eq("business_id", log.business_id).maybeSingle();
        const voice = VOICES[settings?.voice_type ?? ""] ?? "Polly.Joanna";
        const speech = (params["SpeechResult"] ?? "").trim();
        if (!speech) {
          return xml(`<Gather input="speech" speechTimeout="auto" action="${self}?step=gather" method="POST"><Say voice="${voice}">Sorry, I didn't catch that. How can I help?</Say></Gather><Say voice="${voice}">Thanks for calling. Goodbye!</Say><Hangup/>`);
        }
        const history = [...((log.conversation as { role: "user" | "assistant"; content: string }[]) ?? []), { role: "user" as const, content: speech }];
        try {
          const { runReceptionist } = await import("@/lib/receptionist.server");
          const r = await runReceptionist(supabaseAdmin, log.business_id, history, { channel: "phone", callerPhone: log.from_number });
          const tools = Array.from(new Set([...(log.tools_used ?? []), ...r.toolsUsed]));
          await supabaseAdmin.from("call_logs").update({
            conversation: [...history, { role: "assistant", content: r.reply }],
            transcription: [...history, { role: "assistant", content: r.reply }].map((t) => `${t.role === "user" ? "Caller" : "AI"}: ${t.content}`).join("\n"),
            tools_used: tools,
            appointment_created: log.appointment_created || r.toolsUsed.includes("create_appointment"),
            callback_requested: log.callback_requested || r.toolsUsed.includes("record_callback_request"),
          }).eq("id", log.id);
          return xml(`<Gather input="speech" speechTimeout="auto" action="${self}?step=gather" method="POST"><Say voice="${voice}">${esc(r.reply)}</Say></Gather><Say voice="${voice}">Thanks for calling. Goodbye!</Say><Hangup/>`);
        } catch (e) {
          console.error("[twilio] AI error", e);
          return fail();
        }
      },
    },
  },
});
