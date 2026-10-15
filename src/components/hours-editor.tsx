export type DayHours = { day: number; is_open: boolean; open_time: string; close_time: string };
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DEFAULT_HOURS: DayHours[] = DAY_NAMES.map((_, day) => ({
  day,
  is_open: day >= 1 && day <= 5,
  open_time: day === 6 ? "10:00" : "09:00",
  close_time: day === 6 ? "15:00" : "17:00",
}));

export function HoursEditor({ hours, onChange, disabled }: { hours: DayHours[]; onChange: (h: DayHours[]) => void; disabled?: boolean }) {
  const set = (i: number, patch: Partial<DayHours>) => onChange(hours.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  return (
    <div className="divide-y divide-border/70">
      {hours.map((h, i) => (
        <div key={h.day} className="flex flex-wrap items-center gap-4 py-3">
          <label className="flex w-36 items-center gap-2.5">
            <input type="checkbox" className="h-4 w-4 accent-primary" disabled={disabled} checked={h.is_open} onChange={() => set(i, { is_open: !h.is_open })} />
            <span className="text-sm font-medium text-foreground">{DAY_NAMES[h.day]}</span>
          </label>
          {h.is_open ? (
            <div className="flex items-center gap-2">
              <input type="time" className="field w-32" disabled={disabled} value={h.open_time} onChange={(e) => set(i, { open_time: e.target.value })} />
              <span className="text-sm text-muted-foreground">to</span>
              <input type="time" className="field w-32" disabled={disabled} value={h.close_time} onChange={(e) => set(i, { close_time: e.target.value })} />
            </div>
          ) : <span className="text-sm text-muted-foreground">Closed</span>}
        </div>
      ))}
    </div>
  );
}
