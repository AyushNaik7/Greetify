import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Bot, CalendarCheck, Phone, PhoneCall, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDuration, formatPhone, useBusiness } from "@/lib/business";
import { EmptyState, PageHeader, Panel } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/_app/calls")({
  head: () => ({
    meta: [
      { title: "Call History — AI Receptionist" },
      { name: "description", content: "Every phone call handled by your AI receptionist." },
      { property: "og:title", content: "Call History — AI Receptionist" },
      { property: "og:description", content: "Every phone call handled by your AI receptionist." },
    ],
  }),
  component: Calls,
});

function Calls() {
  const biz = useBusiness();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["call_logs", biz.id],
    queryFn: async () => (await supabase.from("call_logs").select("*").eq("business_id", biz.id).order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = calls.filter((c) => `${c.caller_name ?? ""} ${c.from_number} ${c.status} ${c.conversation_summary ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Call history" description="Every call your AI receptionist has answered." />
      <Panel className="p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-10" placeholder="Search by name, phone number or status…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Panel>
      <Panel delay={80}>
        {isLoading ? <div className="h-48 animate-pulse" /> : filtered.length === 0 ? (
          <EmptyState icon={Phone} title={calls.length ? "No matching calls" : "No calls yet"} text="Once your phone number is connected, every call the AI answers is logged here with its transcript." />
        ) : (
          <ul className="divide-y divide-border/70">
            {filtered.map((c) => {
              const convo = Array.isArray(c.conversation) ? (c.conversation as { role: string; content: string }[]) : [];
              return (
                <li key={c.id}>
                  <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-accent/50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-info"><PhoneCall className="h-5 w-5 text-info-foreground" /></div>
                      <div>
                        <p className="font-semibold text-foreground">{c.caller_name || formatPhone(c.from_number)}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy · h:mm a")} · {formatDuration(c.duration)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {c.ai_handled && <Badge variant="info"><Bot className="mr-1 h-3 w-3" />AI</Badge>}
                      {c.appointment_created && <Badge variant="success"><CalendarCheck className="mr-1 h-3 w-3" />Booked</Badge>}
                      {c.callback_requested && <Badge variant="warning">Callback</Badge>}
                      <Badge variant={c.status === "completed" ? "success" : "secondary"}>{c.status}</Badge>
                    </div>
                  </button>
                  {openId === c.id && (
                    <div className="space-y-2 bg-muted/40 px-6 py-4 animate-fade-up">
                      {c.conversation_summary && <p className="text-sm text-foreground"><span className="font-semibold">Summary: </span>{c.conversation_summary}</p>}
                      {convo.length ? convo.map((t, i) => (
                        <p key={i} className="text-sm"><span className="font-semibold text-primary">{t.role === "user" ? "Caller" : "AI"}: </span><span className="text-foreground/85">{t.content}</span></p>
                      )) : <p className="text-sm text-muted-foreground">No transcript recorded.</p>}
                      {c.tools_used?.length ? <p className="text-xs text-muted-foreground">Actions: {c.tools_used.join(", ")}</p> : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
