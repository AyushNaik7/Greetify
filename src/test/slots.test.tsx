import { describe, expect, it } from "vitest";
import { computeSlots } from "@/lib/appointments";

describe("availability slots", () => {
  it("returns hourly slots within opening hours", () => {
    expect(computeSlots("2026-05-04", "09:00", "12:00", [])).toEqual(["9:00 AM", "10:00 AM", "11:00 AM"]);
  });
  it("excludes slots overlapping a booked appointment", () => {
    const booked = [{ start: new Date("2026-05-04T10:30:00"), minutes: 30 }];
    expect(computeSlots("2026-05-04", "09:00", "12:00", booked)).toEqual(["9:00 AM", "11:00 AM"]);
  });
});
