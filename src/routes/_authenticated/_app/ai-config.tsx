import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bot, Loader2, MessageCircle, Mic, Save, SlidersHorizontal, TestTube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business";
import { FieldLabel, PageHeader, Panel, PanelHeader, Toggle } from "@/components/app-ui";
import { ChatTest, VoiceTest } from "@/components/receptionist-test";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_app/ai-config")({
  head: () => ({
    meta: [
      { title: "AI Configuration — AI Receptionist" },
      { name: "description", content: "Tune your AI receptionist's greeting, tone, booking rules and test it live." },
      { property: "og:title", content: "AI Configuration — AI Receptionist" },
      { property: "og:description", content: "Tune and test your AI receptionist." },
    ],
  }),
  component: AIConfig,
});

const TONES = [
  ["professional", "Professional and friendly"],
  ["casual", "Casual and warm"],
  ["formal", "Formal and business-like"],
  ["enthusiastic", "Enthusiastic and energetic"],
];
const VOICES = [["female-natural", "Female – natural"], ["male-natural", "Male – natural"], ["female-professional", "Female – professional"], ["male-professional", "Male – professional"]];

function AIConfig() {
  const biz = useBusiness();
  const qc = useQueryClient();
  const isAdmin = biz.role !== "member";
  const { data: settings } = useQuery({
    queryKey: ["settings", biz.id],
    queryFn: async () => (await supabase.from("business_settings").select("*").eq("business_id", biz.id).maybeSingle()).data,
  });
  const [f, setF] = useState({ ai_greeting: "", ai_tone: "professional", voice_type: "female-natural", booking_enabled: true, cancellation_enabled: true, min_advance_hours: 2, max_advance_days: 30, buffer_minutes: 0 });
  useEffect(() => {
    if (settings) setF({
      ai_greeting: settings.ai_greeting ?? "", ai_tone: settings.ai_tone ?? "professional", voice_type: settings.voice_type ?? "female-natural",
      booking_enabled: settings.booking_enabled ?? true, cancellation_enabled: settings.cancellation_enabled ?? true,
      min_advance_hours: settings.min_advance_hours ?? 2, max_advance_days: settings.max_advance_days ?? 30, buffer_minutes: settings.buffer_minutes ?? 0,
    });
  }, [settings]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = settings
        ? await supabase.from("business_settings").update(f).eq("business_id", biz.id)
        : await supabase.from("business_settings").insert({ ...f, business_id: biz.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", biz.id] }); toast.success("Configuration saved"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="AI configuration"
        description="Shape how your receptionist sounds and what it's allowed to do."
        actions={<><Badge variant="success" className="gap-1.5 py-1"><span className="h-2 w-2 animate-pulse rounded-full bg-success" />AI active</Badge>
          {isAdmin && <Button variant="hero" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save</Button>}</>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Personality & voice" icon={Bot} />
          <div className="space-y-4 p-6">
            <div><FieldLabel>Greeting message</FieldLabel><textarea rows={3} className="field" disabled={!isAdmin} value={f.ai_greeting} onChange={(e) => setF({ ...f, ai_greeting: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><FieldLabel>Tone</FieldLabel><select className="field" disabled={!isAdmin} value={f.ai_tone} onChange={(e) => setF({ ...f, ai_tone: e.target.value })}>{TONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div><FieldLabel>Phone voice</FieldLabel><select className="field" disabled={!isAdmin} value={f.voice_type} onChange={(e) => setF({ ...f, voice_type: e.target.value })}>{VOICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
          </div>
        </Panel>
        <Panel delay={60}>
          <PanelHeader title="Capabilities & booking rules" icon={SlidersHorizontal} />
          <div className="space-y-2 p-6">
            <Toggle checked={f.booking_enabled} onChange={(v) => isAdmin && setF({ ...f, booking_enabled: v })} label="Book & reschedule appointments" hint="Let the AI schedule new visits" />
            <Toggle checked={f.cancellation_enabled} onChange={(v) => isAdmin && setF({ ...f, cancellation_enabled: v })} label="Cancel appointments" hint="Let the AI cancel on a caller's request" />
            <div className="grid gap-4 pt-3 sm:grid-cols-3">
              <div><FieldLabel>Min notice (hrs)</FieldLabel><input type="number" min={0} className="field" disabled={!isAdmin} value={f.min_advance_hours} onChange={(e) => setF({ ...f, min_advance_hours: Number(e.target.value) })} /></div>
              <div><FieldLabel>Max ahead (days)</FieldLabel><input type="number" min={1} className="field" disabled={!isAdmin} value={f.max_advance_days} onChange={(e) => setF({ ...f, max_advance_days: Number(e.target.value) })} /></div>
              <div><FieldLabel>Buffer (min)</FieldLabel><input type="number" min={0} className="field" disabled={!isAdmin} value={f.buffer_minutes} onChange={(e) => setF({ ...f, buffer_minutes: Number(e.target.value) })} /></div>
            </div>
          </div>
        </Panel>
      </div>
      <Panel delay={120}>
        <PanelHeader title="Test your receptionist" icon={TestTube} />
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div><p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground"><MessageCircle className="h-4 w-4 text-primary" />Text chat</p><ChatTest /></div>
          <div><p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground"><Mic className="h-4 w-4 text-primary" />Voice call</p><VoiceTest /></div>
        </div>
      </Panel>
    </>
  );
}
