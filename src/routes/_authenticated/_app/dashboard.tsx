import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, MessageSquare, Phone, PhoneIncoming, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone, useBusiness } from "@/lib/business";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — AI Receptionist" },
      { name: "description", content: "Your AI receptionist's calls, appointments and messages at a glance." },
      { property: "og:title", content: "Overview — AI Receptionist" },
      { property: "og:description", content: "Your AI receptionist's activity at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const biz = useBusiness();
  const { data } = useQuery({
    queryKey: ["dashboard", biz.id],
    queryFn: async () => {
      const [calls, appts, msgs] = await Promise.all([
        supabase.from("call_logs").select("*").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("appointments").select("*").eq("business_id", biz.id).order("date_time"),
        supabase.from("messages").select("*").eq("business_id", biz.id).order("created_at", { ascending: false }),
      ]);
      return { calls: calls.data ?? [], appts: appts.data ?? [], msgs: msgs.data ?? [] };
    },
  });
  const calls = data?.calls ?? [], appts = data?.appts ?? [], msgs = data?.msgs ?? [];
  const now = new Date();
  const upcoming = appts.filter((a) => new Date(a.date_time) > now && a.status === "confirmed").slice(0, 4);
  const unread = msgs.filter((m) => m.status === "unread");

  const stats = [
    { label: "Recent calls", value: calls.length, icon: Phone },
    { label: "Appointments", value: appts.length, icon: Calendar },
    { label: "Pending messages", value: unread.length, icon: MessageSquare },
    { label: "Total messages", value: msgs.length, icon: PhoneIncoming },
  ];

  return (
    <>
      <PageHeader title={`Welcome back`} description={`Here's what your AI receptionist has been doing for ${biz.name}.`} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Panel key={s.label} delay={i * 60} className="p-6 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{data ? s.value : "—"}</p>
              </div>
              <div className="rounded-2xl bg-accent p-3.5"><s.icon className="h-7 w-7 text-accent-foreground" /></div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel delay={200}>
          <PanelHeader title="Recent calls" icon={Phone} right={<Link to="/calls" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="p-4">
            {calls.length ? calls.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-accent/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-info"><Phone className="h-5 w-5 text-info-foreground" /></div>
                  <div>
                    <p className="font-semibold text-foreground">{c.caller_name || "Unknown caller"}</p>
                    <p className="text-sm text-muted-foreground">{formatPhone(c.from_number)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={c.status === "completed" ? "success" : c.status === "failed" || c.status === "no-answer" ? "error" : "info"}>{c.status}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, h:mm a")}</p>
                </div>
              </div>
            )) : <EmptyState icon={Phone} title="No calls yet" text="Calls answered by your AI receptionist will appear here." />}
          </div>
        </Panel>

        <Panel delay={260}>
          <PanelHeader title="Upcoming appointments" icon={Calendar} right={<Link to="/appointments" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>} />
          <div className="p-4">
            {upcoming.length ? upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-accent/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent"><Calendar className="h-5 w-5 text-accent-foreground" /></div>
                  <div>
                    <p className="font-semibold text-foreground">{a.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{a.service}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{format(new Date(a.date_time), "MMM d")}</p>
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{format(new Date(a.date_time), "h:mm a")}</p>
                </div>
              </div>
            )) : <EmptyState icon={Calendar} title="No upcoming appointments" text="Bookings made by you or the AI will show here." />}
          </div>
        </Panel>
      </div>

      {unread.length > 0 && (
        <Panel delay={320}>
          <PanelHeader title="Pending callbacks" icon={MessageSquare} right={<Badge variant="warning">{unread.length} unread</Badge>} />
          <div className="space-y-2 p-4">
            {unread.slice(0, 5).map((m) => (
              <div key={m.id} className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{m.customer_name}</p>
                  <Badge variant={m.priority === "high" ? "error" : m.priority === "medium" ? "warning" : "secondary"}>{m.priority} priority</Badge>
                </div>
                <p className="mt-1.5 text-sm text-foreground/80">{m.message}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{formatPhone(m.customer_phone)} · {format(new Date(m.created_at), "MMM d, h:mm a")}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
