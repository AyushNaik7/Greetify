import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Clock, DollarSign, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { businessQuery, useBusiness } from "@/lib/business";
import { FieldLabel, PageHeader, Panel, PanelHeader } from "@/components/app-ui";
import { DEFAULT_HOURS, HoursEditor, type DayHours } from "@/components/hours-editor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  head: () => ({
    meta: [
      { title: "Business Settings — AI Receptionist" },
      { name: "description", content: "Business details, opening hours and services." },
      { property: "og:title", content: "Business Settings — AI Receptionist" },
      { property: "og:description", content: "Business details, opening hours and services." },
    ],
  }),
  component: Settings,
});

type Svc = { id?: string; name: string; duration: number; price_range: string; description: string };

function Settings() {
  const biz = useBusiness();
  const qc = useQueryClient();
  const isAdmin = biz.role !== "member";
  const [info, setInfo] = useState({ name: biz.name, business_type: biz.business_type ?? "", timezone: biz.timezone, phone: biz.phone ?? "", email: biz.email ?? "", address: biz.address ?? "" });
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [services, setServices] = useState<Svc[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: ["settings-page", biz.id],
    queryFn: async () => {
      const [h, s] = await Promise.all([
        supabase.from("business_hours").select("*").eq("business_id", biz.id),
        supabase.from("services").select("*").eq("business_id", biz.id).order("created_at"),
      ]);
      return { hours: h.data ?? [], services: s.data ?? [] };
    },
  });
  useEffect(() => {
    if (!data) return;
    setHours(DEFAULT_HOURS.map((d) => {
      const r = data.hours.find((x) => x.day_of_week === d.day);
      return r ? { day: d.day, is_open: !!r.is_open, open_time: r.open_time?.slice(0, 5) ?? d.open_time, close_time: r.close_time?.slice(0, 5) ?? d.close_time } : { ...d, is_open: false };
    }));
    setServices(data.services.map((s) => ({ id: s.id, name: s.name, duration: s.duration, price_range: s.price_range ?? "", description: s.description ?? "" })));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const r1 = await supabase.from("businesses").update({ ...info, business_type: info.business_type || null, phone: info.phone || null, email: info.email || null, address: info.address || null }).eq("id", biz.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("business_hours").upsert(hours.map((h) => ({ business_id: biz.id, day_of_week: h.day, is_open: h.is_open, open_time: h.is_open ? h.open_time : null, close_time: h.is_open ? h.close_time : null })), { onConflict: "business_id,day_of_week" });
      if (r2.error) throw r2.error;
      if (removed.length) { const r = await supabase.from("services").delete().in("id", removed); if (r.error) throw r.error; }
      for (const s of services.filter((x) => x.name.trim())) {
        const row = { name: s.name, duration: s.duration, price_range: s.price_range || null, description: s.description || null };
        const r = s.id ? await supabase.from("services").update(row).eq("id", s.id) : await supabase.from("services").insert({ ...row, business_id: biz.id });
        if (r.error) throw r.error;
      }
    },
    onSuccess: () => {
      setRemoved([]);
      qc.invalidateQueries({ queryKey: ["settings-page", biz.id] });
      qc.invalidateQueries({ queryKey: businessQuery.queryKey });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Business settings" description="The details your AI receptionist shares with callers."
        actions={isAdmin && <Button variant="hero" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save changes</Button>} />
      <Panel>
        <PanelHeader title="Business information" icon={Building2} />
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div><FieldLabel>Business name</FieldLabel><input className="field" disabled={!isAdmin} value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></div>
          <div><FieldLabel>Business type</FieldLabel><input className="field" disabled={!isAdmin} value={info.business_type} onChange={(e) => setInfo({ ...info, business_type: e.target.value })} /></div>
          <div><FieldLabel>Phone (the number callers dial)</FieldLabel><input type="tel" className="field" disabled={!isAdmin} value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></div>
          <div><FieldLabel>Email</FieldLabel><input type="email" className="field" disabled={!isAdmin} value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></div>
          <div><FieldLabel>Timezone</FieldLabel><input className="field" disabled={!isAdmin} value={info.timezone} onChange={(e) => setInfo({ ...info, timezone: e.target.value })} /></div>
          <div><FieldLabel>Address</FieldLabel><input className="field" disabled={!isAdmin} value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></div>
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel delay={60}>
          <PanelHeader title="Opening hours" icon={Clock} />
          <div className="px-6 py-2"><HoursEditor hours={hours} onChange={setHours} disabled={!isAdmin} /></div>
        </Panel>
        <Panel delay={120}>
          <PanelHeader title="Services & pricing" icon={DollarSign} right={isAdmin && <Button size="sm" variant="outline" onClick={() => setServices([...services, { name: "", duration: 60, price_range: "", description: "" }])}><Plus /> Add</Button>} />
          <div className="space-y-3 p-6">
            {services.length === 0 && <p className="text-sm text-muted-foreground">No services yet. Add what you offer so the AI can book it.</p>}
            {services.map((s, i) => (
              <div key={s.id ?? i} className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-2.5">
                <input className="field flex-1" placeholder="Service" disabled={!isAdmin} value={s.name} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input type="number" className="field w-20" title="Minutes" disabled={!isAdmin} value={s.duration} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, duration: Number(e.target.value) } : x))} />
                <input className="field w-28" placeholder="$45-85" disabled={!isAdmin} value={s.price_range} onChange={(e) => setServices(services.map((x, j) => j === i ? { ...x, price_range: e.target.value } : x))} />
                {isAdmin && <button aria-label="Remove" className="rounded-lg p-2 text-destructive hover:bg-destructive/10" onClick={() => { if (s.id) setRemoved([...removed, s.id]); setServices(services.filter((_, j) => j !== i)); }}><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            {services.length > 0 && <p className="text-xs text-muted-foreground">Duration in minutes · price shown to callers</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}
