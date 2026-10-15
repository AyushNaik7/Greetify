import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, Mic, MicOff, Phone, PhoneOff, Send, User, Wrench } from "lucide-react";
import { chatWithReceptionist } from "@/lib/ai.functions";
import { useBusiness } from "@/lib/business";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; tools?: string[] };

function useReceptionist() {
  const biz = useBusiness();
  const chat = useServerFn(chatWithReceptionist);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(text: string): Promise<string | null> {
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    setError(null);
    try {
      const r = await chat({ data: { businessId: biz.id, messages: next.map(({ role, content }) => ({ role, content })) } });
      setMessages([...next, { role: "assistant", content: r.reply, tools: r.toolsUsed }]);
      return r.reply;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  }
  return { messages, setMessages, loading, error, send };
}

function Bubble({ m }: { m: Msg }) {
  const me = m.role === "user";
  return (
    <div className={cn("flex gap-2.5 animate-fade-up", me && "flex-row-reverse")}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", me ? "bg-muted" : "bg-brand")}>
        {me ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
      </div>
      <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", me ? "bg-primary text-primary-foreground" : "bg-background shadow-sm")}>
        {me ? m.content : <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1"><ReactMarkdown>{m.content}</ReactMarkdown></div>}
        {m.tools?.length ? <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><Wrench className="h-3 w-3" />{Array.from(new Set(m.tools)).join(", ").replaceAll("_", " ")}</p> : null}
      </div>
    </div>
  );
}

export function ChatTest() {
  const { messages, loading, error, send } = useReceptionist();
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading]);
  return (
    <div className="flex h-[520px] flex-col rounded-2xl border border-border bg-muted/40">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Bot className="mb-2 h-10 w-10 text-primary" />
            Try “What are your hours?” or “Book me a haircut tomorrow at 2pm”.
          </div>
        )}
        {messages.map((m, i) => <Bubble key={i} m={m} />)}
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
        {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); if (input.trim() && !loading) { send(input.trim()); setInput(""); } }}>
        <input className="field" placeholder="Type as a customer would…" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send"><Send /></Button>
      </form>
    </div>
  );
}

// Minimal typing for the browser Web Speech API
type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export function VoiceTest() {
  const { messages, loading, error, send, setMessages } = useReceptionist();
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const rec = useRef<SR | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor || !("speechSynthesis" in window)) { setSupported(false); return; }
    const r = new Ctor();
    r.lang = "en-US"; r.interimResults = false; r.continuous = false;
    r.onresult = async (e) => {
      const text = e.results[0]?.[0]?.transcript;
      if (!text) return;
      const reply = await send(text);
      if (reply) speak(reply);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    return () => r.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function listen() { try { rec.current?.start(); setListening(true); } catch { /* already listening */ } }
  function speak(text: string) {
    const u = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ""));
    u.onend = () => { if (activeRef.current) listen(); };
    speechSynthesis.speak(u);
  }
  function start() {
    setActive(true); activeRef.current = true; setMessages([]);
    speak("Hello! Thank you for calling. How can I help you today?");
  }
  function stop() { setActive(false); activeRef.current = false; speechSynthesis.cancel(); rec.current?.stop(); }

  if (!supported) return <div className="flex h-[520px] items-center justify-center rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">Voice testing needs a browser with speech support, such as Chrome or Edge.</div>;

  return (
    <div className="flex h-[520px] flex-col rounded-2xl border border-border bg-muted/40">
      <div className="flex flex-col items-center gap-4 border-b border-border p-6">
        <div className={cn("relative flex h-20 w-20 items-center justify-center rounded-full transition-all", active ? "bg-brand shadow-brand" : "bg-muted")}>
          {listening && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />}
          {listening ? <Mic className="relative h-9 w-9 text-primary-foreground" /> : active ? <Bot className="h-9 w-9 text-primary-foreground" /> : <MicOff className="h-9 w-9 text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">{!active ? "Start a test call and talk out loud" : listening ? "Listening…" : loading ? "Thinking…" : "Speaking…"}</p>
        {active ? <Button variant="destructive" onClick={stop}><PhoneOff /> End call</Button> : <Button variant="hero" onClick={start}><Phone /> Start voice call</Button>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => <Bubble key={i} m={m} />)}
        {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
