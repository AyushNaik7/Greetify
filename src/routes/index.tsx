import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Bot, Calendar, MessageSquare, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Receptionist — Never miss a call again" },
      { name: "description", content: "An AI receptionist that answers calls, books appointments and takes messages for your business 24/7." },
      { property: "og:title", content: "AI Receptionist — Never miss a call again" },
      { property: "og:description", content: "Answers calls, books appointments and takes messages, 24/7." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Phone, title: "Answers every call", text: "Natural conversations on your business line, day or night." },
  { icon: Calendar, title: "Books appointments", text: "Checks your hours and calendar, then books, moves or cancels." },
  { icon: BookOpen, title: "Knows your business", text: "Answers from your own knowledge base — never makes things up." },
  { icon: MessageSquare, title: "Takes messages", text: "Logs callback requests with priority so nothing slips." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-page">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-brand"><Bot className="h-5 w-5 text-primary-foreground" /></div>
          <span className="text-lg font-bold text-brand">AI Receptionist</span>
        </div>
        <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground"><Sparkles className="h-4 w-4" /> Your front desk, on autopilot</span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl">Never miss a <span className="text-brand">customer call</span> again</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">An AI receptionist that answers your phone, books appointments and takes messages — while you focus on the work.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" variant="hero"><Link to="/auth">Get started free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/dashboard">Open dashboard</Link></Button>
          </div>
        </div>
        <div className="mt-20 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass rounded-2xl p-6 shadow-soft animate-fade-up transition-transform hover:-translate-y-1" style={{ animationDelay: `${150 + i * 80}ms` }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent"><f.icon className="h-5 w-5 text-accent-foreground" /></div>
              <h3 className="mt-4 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
