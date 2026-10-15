// Client-safe booking helpers shared by the dashboard and the AI receptionist.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { addMinutes, format, isAfter, isBefore } from "date-fns";

type DB = SupabaseClient<Database>;

export const digits = (s: string) => (s || "").replace(/\D/g, "");
export const samePhone = (a: string, b: string) => {
  const x = digits(a), y = digits(b);
  return x.length >= 7 && y.length >= 7 && (x.endsWith(y.slice(-10)) || y.endsWith(x.slice(-10)));
};

/** Pure helper: free one-hour slots for a day given opening hours and booked ranges. */
export function computeSlots(
  date: string,
  open: string,
  close: string,
  booked: { start: Date; minutes: number }[],
  slotMinutes = 60,
): string[] {
  const slots: string[] = [];
  let cur = new Date(`${date}T${open.slice(0, 5)}:00`);
  const end = new Date(`${date}T${close.slice(0, 5)}:00`);
  while (isBefore(cur, end)) {
    const slotEnd = addMinutes(cur, slotMinutes);
    if (isAfter(slotEnd, end)) break;
    const conflict = booked.some((b) => isBefore(cur, addMinutes(b.start, b.minutes)) && isAfter(slotEnd, b.start));
    if (!conflict) slots.push(format(cur, "h:mm a"));
    cur = slotEnd;
  }
  return slots;
}

export async function upcomingFor(db: DB, businessId: string, phone: string) {
  const { data } = await db
    .from("appointments")
    .select("*")
    .eq("business_id", businessId)
    .neq("status", "cancelled")
    .gte("date_time", new Date().toISOString())
    .order("date_time");
  return (data ?? []).filter((a) => samePhone(a.customer_phone, phone));
}

export async function createAppointmentRecord(
  db: DB,
  businessId: string,
  a: { customer_name: string; customer_phone: string; customer_email?: string | null; service: string; date_time: string; duration: number; notes?: string | null; call_id?: string | null },
) {
  const start = new Date(a.date_time);
  if (isNaN(start.getTime())) throw new Error("Invalid date/time");
  const end = addMinutes(start, a.duration);
  const { data: existing } = await db
    .from("appointments")
    .select("date_time, duration")
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .gte("date_time", addMinutes(start, -24 * 60).toISOString())
    .lt("date_time", end.toISOString());
  const clash = (existing ?? []).some((e) => {
    const s = new Date(e.date_time);
    return isBefore(start, addMinutes(s, e.duration)) && isAfter(end, s);
  });
  if (clash) throw new Error("Time slot conflict - an appointment already exists at that time");

  let contactId: string | null = null;
  const { data: contact } = await db
    .from("contacts").select("id").eq("business_id", businessId).eq("phone", a.customer_phone).maybeSingle();
  if (contact) contactId = contact.id;
  else {
    const { data: created } = await db
      .from("contacts")
      .insert({ business_id: businessId, name: a.customer_name, phone: a.customer_phone, email: a.customer_email || null })
      .select("id").single();
    contactId = created?.id ?? null;
  }

  const { data, error } = await db
    .from("appointments")
    .insert({
      business_id: businessId,
      contact_id: contactId,
      customer_name: a.customer_name,
      customer_phone: a.customer_phone,
      customer_email: a.customer_email || null,
      service: a.service,
      date_time: start.toISOString(),
      duration: a.duration,
      status: "confirmed",
      notes: a.notes || null,
      call_id: a.call_id ?? null,
    })
    .select().single();
  if (error) throw error;
  return data;
}

