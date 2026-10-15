import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Bot, Calendar, LayoutDashboard, LogOut, Menu, MessageSquare, Phone, Settings, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { businessQuery, initials, useBusiness } from "@/lib/business";
import { LoadingBlock } from "@/components/app-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: async ({ context }) => {
    const biz = await context.queryClient.ensureQueryData(businessQuery);
    if (!biz) throw redirect({ to: "/onboarding" });
  },
  pendingComponent: () => <div className="min-h-screen bg-page p-10"><LoadingBlock /></div>,
  component: AppShell,
});

const NAV = [
  { name: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { name: "Calls", to: "/calls", icon: Phone },
  { name: "Appointments", to: "/appointments", icon: Calendar },
  { name: "Contacts", to: "/contacts", icon: Users },
  { name: "Messages", to: "/messages", icon: MessageSquare },
  { name: "Knowledge Base", to: "/knowledge", icon: BookOpen },
  { name: "AI Configuration", to: "/ai-config", icon: Bot },
  { name: "Settings", to: "/settings", icon: Settings },
] as const;

function AppShell() {
  const business = useBusiness();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = business.user;
  const name = (user.user_metadata?.["full_name"] as string | undefined) || user.email || "User";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand shadow-brand">
          <Bot className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-lg font-bold text-brand leading-tight">AI Receptionist</p>
          <p className="text-xs text-muted-foreground">Smart call management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className="group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" }}
          >
            <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-sidebar-border bg-background/60 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-sm font-bold text-primary-foreground">
            {initials(business.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{business.name}</p>
            <p className="truncate text-xs text-muted-foreground">{name}</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <aside className="glass hidden w-72 shrink-0 border-y-0 border-l-0 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-background shadow-2xl animate-fade-up">{sidebar}</aside>
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="glass flex h-16 items-center justify-between border-x-0 border-t-0 px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-accent">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <p className="font-bold text-brand">AI Receptionist</p>
          <div className="w-9" />
        </header>
        <main className={cn("flex-1 overflow-y-auto px-4 py-8 sm:px-8")}>
          <div className="mx-auto max-w-7xl space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
