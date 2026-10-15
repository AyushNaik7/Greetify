import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, Building2, Check, Clock, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { businessQuery } from "@/lib/business";
import { FieldLabel } from "@/components/app-ui";
import { DEFAULT_HOURS, HoursEditor } from "@/components/hours-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — AI Receptionist" },
      { name: "description", content: "Configure your business so the AI receptionist can start answering calls." },
      { property: "og:title", content: "Set up your business — AI Receptionist" },
      { property: "og:description", content: "Get your AI receptionist ready in three steps." },
    ],
  }),
  component: Onboarding,
});

const TYPES = ["Salon & Spa", "Medical Practice", "Dental Office", "Law Firm", "Retail Store", "Restaurant", "Fitness Center", "Consulting", "Other"];
const TIMEZONES = [
  ["America/New_York", "Eastern Time (ET)"], ["America/Chicago", "Central Time (CT)"], ["America/Denver", "Mountain Time (MT)"],
  ["America/Los_Angeles", "Pacific Time (PT)"], ["America/Phoenix", "Arizona (MST)"], ["America/Anchorage", "Alaska (AKT)"],
  ["Pacific/Honolulu", "Hawaii (HST)"], ["Europe/London", "London (GMT)"], ["Asia/Kolkata", "India (IST)"], ["UTC", "UTC"],
];
const STEPS = [{ t: "Business", i: Building2 }, { t: "Contact", i: Phone }, { t: "Hours", i: Clock }];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ name: "", type: "", timezone: "America/New_York", phone: "", email: "", address: "" });
  const [hours, setHours] = useState(DEFAULT_HOURS);

  async function submit() {
    setLoading(true);
    const { error } = await supabase.rpc("create_business", {
      _name: f.name, _business_type: f.type, _timezone: f.timezone, _phone: f.phone, _email: f.email, _address: f.address, _hours: hours,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: businessQuery.queryKey });
    toast.success("Your business is ready!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-page px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center animate-fade-up">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand shadow-brand"><Bot className="h-8 w-8 text-primary-foreground" /></div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">Set up your business</h1>
          <p className="mt-1.5 text-muted-foreground">Three quick steps and your AI receptionist is ready.</p>
        </div>
        <div className="mb-8 flex items-center justify-center gap-3">
          {STEPS.map((s, i) => (
            <div key={s.t} className="flex items-center gap-3">
              <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all", i <= step ? "bg-primary text-primary-foreground shadow-brand" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="h-4 w-4" /> : <s.i className="h-4 w-4" />}{s.t}
              </div>
              {i < 2 && <div className={cn("h-0.5 w-8 rounded transition-colors", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>
        <div key={step} className="glass rounded-2xl p-6 shadow-soft animate-fade-up sm:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <div><FieldLabel>Business name *</FieldLabel><input autoFocus className="field" placeholder="Style Studio" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><FieldLabel>Business type</FieldLabel><select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">Select a type</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><FieldLabel>Timezone *</FieldLabel><select className="field" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>{TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <div><FieldLabel>Business phone</FieldLabel><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="tel" className="field pl-9" placeholder="+1 555 123 4567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div><p className="mt-1 text-xs text-muted-foreground">Use the phone number customers will call — it routes calls to this business.</p></div>
              <div><FieldLabel>Business email</FieldLabel><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="email" className="field pl-9" placeholder="hello@yourbusiness.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div></div>
              <div><FieldLabel>Address</FieldLabel><textarea rows={3} className="field" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            </div>
          )}
          {step === 2 && <HoursEditor hours={hours} onChange={setHours} />}
          <div className="mt-8 flex justify-between">
            <Button variant="outline" disabled={step === 0 || loading} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 2
              ? <Button variant="hero" disabled={step === 0 && !f.name.trim()} onClick={() => setStep(step + 1)}>Continue</Button>
              : <Button variant="hero" disabled={!f.name.trim() || loading} onClick={submit}>{loading && <Loader2 className="animate-spin" />} Complete setup</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
