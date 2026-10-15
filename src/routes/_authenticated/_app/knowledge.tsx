import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useBusiness } from "@/lib/business";
import { EmptyState, FieldLabel, PageHeader, Panel, Toggle } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/_app/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — AI Receptionist" },
      { name: "description", content: "Answers your AI receptionist uses for customer questions." },
      { property: "og:title", content: "Knowledge Base — AI Receptionist" },
      { property: "og:description", content: "Answers your AI receptionist uses for customer questions." },
    ],
  }),
  component: Knowledge,
});

type Entry = Tables<"knowledge_entries">;

function Knowledge() {
  const biz = useBusiness();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);
  const key = ["knowledge", biz.id];
  const { data: entries = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("knowledge_entries").select("*").eq("business_id", biz.id).order("created_at", { ascending: false })).data ?? [],
  });
  const mutate = useMutation({
    mutationFn: async (op: { id: string; del?: boolean; enabled?: boolean }) => {
      const { error } = op.del ? await supabase.from("knowledge_entries").delete().eq("id", op.id) : await supabase.from("knowledge_entries").update({ enabled: !!op.enabled }).eq("id", op.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e.message),
  });
  const cats = Array.from(new Set(entries.map((e) => e.category).filter(Boolean))) as string[];
  const list = entries.filter((e) => (!cat || e.category === cat) && `${e.question} ${e.answer}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Knowledge base" description="Teach your AI the answers to common questions." actions={<Button variant="hero" onClick={() => setEditing({})}><Plus /> Add entry</Button>} />
      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-10" placeholder="Search questions and answers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCat(null)} className={`rounded-full px-3 py-1 text-sm transition-colors ${!cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>All</button>
            {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1 text-sm transition-colors ${cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{c}</button>)}
          </div>
        )}
      </Panel>
      {isLoading ? <div className="h-48 animate-pulse rounded-2xl bg-muted" /> : list.length === 0 ? (
        <Panel><EmptyState icon={BookOpen} title={entries.length ? "No matches" : "Your knowledge base is empty"} text="Add questions like “What are your hours?” or “Do you take walk-ins?”" action={<Button variant="outline" onClick={() => setEditing({})}><Plus /> Add first entry</Button>} /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((e, i) => (
            <Panel key={e.id} delay={i * 30} className={`group p-5 ${e.enabled ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-foreground">{e.question}</p>
                <div className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <button aria-label="Edit" onClick={() => setEditing(e)} className="rounded-lg p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Delete" onClick={() => confirm("Delete this entry?") && mutate.mutate({ id: e.id, del: true })} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{e.answer}</p>
              <div className="mt-4 flex items-center justify-between">
                {e.category ? <Badge variant="info">{e.category}</Badge> : <span />}
                <button onClick={() => mutate.mutate({ id: e.id, enabled: !e.enabled })} className="text-xs font-medium text-primary hover:underline">{e.enabled ? "Disable" : "Enable"}</button>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {editing && <EntryDialog entry={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EntryDialog({ entry, onClose }: { entry: Partial<Entry>; onClose: () => void }) {
  const biz = useBusiness();
  const qc = useQueryClient();
  const [f, setF] = useState({ question: entry.question ?? "", answer: entry.answer ?? "", category: entry.category ?? "", enabled: entry.enabled ?? true });
  const save = useMutation({
    mutationFn: async () => {
      const row = { question: f.question, answer: f.answer, category: f.category || null, enabled: f.enabled };
      const { error } = entry.id ? await supabase.from("knowledge_entries").update(row).eq("id", entry.id) : await supabase.from("knowledge_entries").insert({ ...row, business_id: biz.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["knowledge", biz.id] }); toast.success("Entry saved"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{entry.id ? "Edit entry" : "New entry"}</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div><FieldLabel>Question</FieldLabel><input required className="field" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></div>
          <div><FieldLabel>Answer</FieldLabel><textarea required rows={5} className="field" value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></div>
          <div><FieldLabel>Category</FieldLabel><input className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Pricing, Hours, Policies…" /></div>
          <Toggle checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} label="Enabled" hint="The AI only uses enabled entries" />
          <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Save entry</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
