import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Bot, Loader2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — AI Receptionist" },
      { name: "description", content: "Sign in or create an account to manage your AI receptionist." },
      { property: "og:title", content: "Sign in — AI Receptionist" },
      { property: "og:description", content: "Sign in to manage your AI receptionist." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/dashboard", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } } });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setNotice("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setNotice("If that email has an account, a link to set your password is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
    else if (!r.redirected) navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/" className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand shadow-brand"><Bot className="h-8 w-8 text-primary-foreground" /></div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Set a new password"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "reset" ? "We'll email you a secure link." : "Your AI receptionist awaits."}</p>
        </Link>
        <div className="glass rounded-2xl p-6 shadow-soft sm:p-8">
          {mode !== "reset" && (
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setNotice(null); }} className={cn("rounded-lg py-2 text-sm font-medium transition-all", mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>{m === "signin" ? "Sign in" : "Sign up"}</button>
              ))}
            </div>
          )}
          {notice ? (
            <div className="rounded-xl bg-success/10 p-4 text-sm text-foreground">{notice}</div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && <Field icon={User}><input required className="field pl-10" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
              <Field icon={Mail}><input required type="email" className="field pl-10" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              {mode !== "reset" && <Field icon={Lock}><input required type="password" minLength={6} className="field pl-10" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
              <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send link"}</Button>
            </form>
          )}
          {mode !== "reset" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
              <Button variant="outline" className="w-full" size="lg" onClick={google}>Continue with Google</Button>
            </>
          )}
          <div className="mt-5 text-center text-sm">
            {mode === "reset"
              ? <button className="font-medium text-primary hover:underline" onClick={() => { setMode("signin"); setNotice(null); }}>Back to sign in</button>
              : <button className="font-medium text-primary hover:underline" onClick={() => { setMode("reset"); setNotice(null); }}>Forgot password, or first visit since we moved?</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return <div className="relative"><Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />{children}</div>;
}
