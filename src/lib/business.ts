import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const businessQuery = queryOptions({
  queryKey: ["active-business"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from("business_members")
      .select("role, businesses(*)")
      .eq("user_id", auth.user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.businesses) return null;
    return { ...data.businesses, role: data.role, user: auth.user };
  },
});


export function useBusiness() {
  const { data } = useSuspenseQuery(businessQuery);
  if (!data) throw new Error("No active business");
  return data;
}

export function formatPhone(phone?: string | null) {
  if (!phone) return "";
  const c = phone.replace(/\D/g, "");
  if (c.length === 10) return `(${c.slice(0, 3)}) ${c.slice(3, 6)}-${c.slice(6)}`;
  if (c.length === 11 && c.startsWith("1")) return `+1 (${c.slice(1, 4)}) ${c.slice(4, 7)}-${c.slice(7)}`;
  return phone;
}

export function formatDuration(seconds?: number | null) {
  const s = seconds ?? 0;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export function initials(name?: string | null) {
  return (name || "?").split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
