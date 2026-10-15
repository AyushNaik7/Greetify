import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Mail, Pencil, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatPhone, initials, useBusiness } from "@/lib/business";
import { EmptyState, FieldLabel, PageHeader, Panel } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/_app/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts — AI Receptionist" },
      { name: "description", content: "Your customers, their history and notes." },
      { property: "og:title", content: "Contacts — AI Receptionist" },
      { property: "og:description", content: "Your customers, their history and notes." },
    ],
  }),
  component: Contacts,
});

type Contact = Tables<"contacts">;

function Contacts() {
  const biz = useBusiness();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);
  const key = ["contacts", biz.id];
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("contacts").select("*, appointments(count)").eq("business_id", biz.id).order("created_at", { ascending: false })).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contacts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Contact deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const list = contacts.filter((c) => `${c.name} ${c.phone} ${c.email ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Contacts" description="Everyone who has called or booked with you." actions={<Button variant="hero" onClick={() => setEditing({})}><Plus /> Add contact</Button>} />
      <Panel className="p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-10" placeholder="Search contacts…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Panel>
      {isLoading ? <div className="h-48 animate-pulse rounded-2xl bg-muted" /> : list.length === 0 ? (
        <Panel><EmptyState icon={Users} title={contacts.length ? "No matches" : "No contacts yet"} text="Contacts are created automatically when appointments are booked." /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => {
            const count = (c.appointments as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <Panel key={c.id} delay={i * 30} className="group p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-primary-foreground">{initials(c.name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{c.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" />{formatPhone(c.phone)}</p>
                    {c.email && <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</p>}
                  </div>
                  <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <button aria-label="Edit" onClick={() => setEditing(c)} className="rounded-lg p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Delete" onClick={() => confirm(`Delete ${c.name}?`) && del.mutate(c.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="info">{count} appointment{count === 1 ? "" : "s"}</Badge>
                  {(c.tags ?? []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
                {c.notes && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.notes}</p>}
              </Panel>
            );
          })}
        </div>
      )}
      {editing && <ContactDialog contact={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ContactDialog({ contact, onClose }: { contact: Partial<Contact>; onClose: () => void }) {
  const biz = useBusiness();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: contact.name ?? "", phone: contact.phone ?? "", email: contact.email ?? "", tags: (contact.tags ?? []).join(", "), notes: contact.notes ?? "" });
  const save = useMutation({
    mutationFn: async () => {
      const row = { name: f.name, phone: f.phone, email: f.email || null, notes: f.notes || null, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      const { error } = contact.id
        ? await supabase.from("contacts").update(row).eq("id", contact.id)
        : await supabase.from("contacts").insert({ ...row, business_id: biz.id });
      if (error) throw new Error(error.code === "23505" ? "A contact with this phone number already exists" : error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts", biz.id] }); toast.success("Contact saved"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{contact.id ? "Edit contact" : "Add contact"}</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div><FieldLabel>Name</FieldLabel><input required className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><FieldLabel>Phone</FieldLabel><input required type="tel" className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><FieldLabel>Email</FieldLabel><input type="email" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div><FieldLabel>Tags (comma separated)</FieldLabel><input className="field" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="vip, regular" /></div>
          <div><FieldLabel>Notes</FieldLabel><textarea rows={3} className="field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Save contact</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
