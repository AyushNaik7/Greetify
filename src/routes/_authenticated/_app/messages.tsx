import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, Eye, MessageSquare, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone, useBusiness } from "@/lib/business";
import { EmptyState, PageHeader, Panel } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_app/messages")({
  head: () => ({
    meta: [
      { title: "Messages & Callbacks — AI Receptionist" },
      { name: "description", content: "Callback requests and messages taken by your AI receptionist." },
      { property: "og:title", content: "Messages & Callbacks — AI Receptionist" },
      { property: "og:description", content: "Callback requests and messages taken by your AI receptionist." },
    ],
  }),
  component: Messages,
});

const FILTERS = ["unread", "read", "resolved", "all"] as const;

function Messages() {
  const biz = useBusiness();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("unread");
  const key = ["messages", biz.id];
  const { data: msgs = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("messages").select("*").eq("business_id", biz.id).order("created_at", { ascending: false })).data ?? [],
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("messages").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e.message),
  });
  const list = filter === "all" ? msgs : msgs.filter((m) => m.status === filter);

  return (
    <>
      <PageHeader title="Messages & callbacks" description="People who asked to be called back." />
      <div className="inline-flex rounded-xl bg-muted p-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all ${filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {f} <span className="ml-1 text-xs opacity-60">{f === "all" ? msgs.length : msgs.filter((m) => m.status === f).length}</span>
          </button>
        ))}
      </div>
      {isLoading ? <div className="h-48 animate-pulse rounded-2xl bg-muted" /> : list.length === 0 ? (
        <Panel><EmptyState icon={MessageSquare} title="Nothing here" text="When callers ask for a callback, the AI records it here." /></Panel>
      ) : (
        <div className="space-y-3">
          {list.map((m, i) => (
            <Panel key={m.id} delay={i * 30} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${m.priority === "high" ? "bg-destructive/15" : "bg-warning/20"}`}>
                    <Phone className={`h-5 w-5 ${m.priority === "high" ? "text-destructive" : "text-warning-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{m.customer_name}</p>
                      <Badge variant={m.priority === "high" ? "error" : m.priority === "medium" ? "warning" : "secondary"}>{m.priority}</Badge>
                      <Badge variant={m.status === "resolved" ? "success" : m.status === "read" ? "info" : "outline"}>{m.status}</Badge>
                    </div>
                    <p className="mt-1.5 text-foreground/85">{m.message}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      <a href={`tel:${m.customer_phone}`} className="font-medium text-primary hover:underline">{formatPhone(m.customer_phone)}</a> · {format(new Date(m.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {m.status === "unread" && <Button size="sm" variant="outline" onClick={() => update.mutate({ id: m.id, status: "read" })}><Eye /> Mark read</Button>}
                  {m.status !== "resolved" ? (
                    <Button size="sm" onClick={() => update.mutate({ id: m.id, status: "resolved" })}><CheckCircle /> Resolve</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: m.id, status: "unread" })}><RotateCcw /> Reopen</Button>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
