import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, Mail, Phone, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone, useBusiness } from "@/lib/business";
import { createAppointmentRecord } from "@/lib/appointments";
import { EmptyState, FieldLabel, PageHeader, Panel } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/_app/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — AI Receptionist" },
      { name: "description", content: "Manage bookings made by you and your AI receptionist." },
      { property: "og:title", content: "Appointments — AI Receptionist" },
      { property: "og:description", content: "Manage bookings made by you and your AI receptionist." },
    ],
  }),
  component: Appointments,
});

function Appointments() {
  const biz = useBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const key = ["appointments", biz.id];
  const { data: appts = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("appointments").select("*").eq("business_id", biz.id).order("date_time")).data ?? [],
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services", biz.id],
    queryFn: async () => (await supabase.from("services").select("*").eq("business_id", biz.id).eq("enabled", true)).data ?? [],
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Appointment updated"); },
    onError: (e) => toast.error(e.message),
  });

  const now = new Date();
  const list = appts.filter((a) => (tab === "upcoming" ? new Date(a.date_time) >= now && a.status !== "cancelled" : new Date(a.date_time) < now || a.status === "cancelled"));
  if (tab === "past") list.reverse();

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Bookings made by you and your AI receptionist."
        actions={<Button variant="hero" onClick={() => setOpen(true)}><Plus /> New appointment</Button>}
      />
      <div className="inline-flex rounded-xl bg-muted p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>
      {isLoading ? <div className="h-48 animate-pulse rounded-2xl bg-muted" /> : list.length === 0 ? (
        <Panel><EmptyState icon={Calendar} title={`No ${tab} appointments`} text="Create one here, or let the AI book them during calls." action={<Button variant="outline" onClick={() => setOpen(true)}><Plus /> New appointment</Button>} /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a, i) => (
            <Panel key={a.id} delay={i * 40} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex w-14 flex-col items-center rounded-xl bg-brand py-2 text-primary-foreground shadow-brand">
                    <span className="text-xs uppercase">{format(new Date(a.date_time), "MMM")}</span>
                    <span className="text-xl font-bold leading-none">{format(new Date(a.date_time), "d")}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{a.customer_name}</p>
                    <p className="text-sm text-primary">{a.service}</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{format(new Date(a.date_time), "h:mm a")} · {a.duration} min</p>
                      <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{formatPhone(a.customer_phone)}</p>
                      {a.customer_email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{a.customer_email}</p>}
                    </div>
                  </div>
                </div>
                <Badge variant={a.status === "confirmed" ? "success" : a.status === "cancelled" ? "error" : a.status === "completed" ? "info" : "warning"}>{a.status}</Badge>
              </div>
              {a.notes && <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-sm text-foreground/80">{a.notes}</p>}
              {a.status === "confirmed" && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "completed" })}><Check /> Complete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: a.id, status: "cancelled" })}><X /> Cancel</Button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
      <AppointmentDialog open={open} onOpenChange={setOpen} services={services} />
    </>
  );
}

function AppointmentDialog({ open, onOpenChange, services }: { open: boolean; onOpenChange: (v: boolean) => void; services: { name: string; duration: number }[] }) {
  const biz = useBusiness();
  const qc = useQueryClient();
  const [f, setF] = useState({ customer_name: "", customer_phone: "", customer_email: "", service: "", date: "", time: "", duration: 60, notes: "" });
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const save = useMutation({
    mutationFn: () => createAppointmentRecord(supabase, biz.id, { ...f, date_time: new Date(`${f.date}T${f.time}`).toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments", biz.id] });
      toast.success("Appointment booked");
      onOpenChange(false);
      setF({ customer_name: "", customer_phone: "", customer_email: "", service: "", date: "", time: "", duration: 60, notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New appointment</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><FieldLabel>Customer name</FieldLabel><input required className="field" value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} /></div>
            <div><FieldLabel>Phone</FieldLabel><input required type="tel" className="field" value={f.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} /></div>
          </div>
          <div><FieldLabel>Email (optional)</FieldLabel><input type="email" className="field" value={f.customer_email} onChange={(e) => set("customer_email", e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Service</FieldLabel>
              <input required list="svc" className="field" value={f.service} onChange={(e) => { set("service", e.target.value); const s = services.find((x) => x.name === e.target.value); if (s) set("duration", s.duration); }} />
              <datalist id="svc">{services.map((s) => <option key={s.name} value={s.name} />)}</datalist>
            </div>
            <div><FieldLabel>Duration (min)</FieldLabel><input required type="number" min={5} className="field" value={f.duration} onChange={(e) => set("duration", Number(e.target.value))} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><FieldLabel>Date</FieldLabel><input required type="date" className="field" value={f.date} onChange={(e) => set("date", e.target.value)} /></div>
            <div><FieldLabel>Time</FieldLabel><input required type="time" className="field" value={f.time} onChange={(e) => set("time", e.target.value)} /></div>
          </div>
          <div><FieldLabel>Notes</FieldLabel><textarea rows={2} className="field" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Book appointment</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
