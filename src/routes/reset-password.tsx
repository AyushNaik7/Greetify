import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — AI Receptionist" },
      { name: "description", content: "Set a new password for your AI Receptionist account." },
      { property: "og:title", content: "Choose a new password — AI Receptionist" },
      { property: "og:description", content: "Set a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-2xl p-8 shadow-soft animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Your email is verified. Pick a password to finish signing in.</p>
        <div className="relative"><Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input required type="password" minLength={6} className="field pl-10" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />} Save password</Button>
      </form>
    </div>
  );
}
