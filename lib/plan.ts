import type { PickupSlot } from "./types";
import { DAY_NAMES, timeRange } from "./format";
import { toIsoDay } from "./dates";

export type PlanStep = {
  id: string;
  title: string;
  day_of_week: number;
  at_time: string | null; // "HH:MM:SS"
  notes: string | null;
  sort_order: number;
  active: boolean;
};

export type TimelineItem = {
  key: string;           // check-off key (custom: step id; auto: stable synthetic)
  dayOfWeek: number;
  date: string;          // ISO day within the selected week
  time: string | null;   // "HH:MM"
  title: string;
  notes: string | null;
  source: "custom" | "auto";
};

function hhmm(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

function minusMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// The bakery week runs Sunday → Saturday, anchored on the week's Saturday
// (same anchor as the website's week labels).
export function weekDates(saturday: Date): string[] {
  const dates: string[] = [];
  for (let dow = 0; dow <= 6; dow++) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() - (6 - dow));
    dates.push(toIsoDay(d));
  }
  return dates;
}

// Merge custom steps with hard deadlines derived from pickup slots:
// order cutoffs, finish-baking (1h before first slot), package, load, pickups.
export function assembleTimeline(
  steps: PlanStep[],
  slots: PickupSlot[],
  saturday: Date
): TimelineItem[] {
  const dates = weekDates(saturday);
  const items: TimelineItem[] = [];

  for (const s of steps.filter((s) => s.active)) {
    items.push({
      key: s.id,
      dayOfWeek: s.day_of_week,
      date: dates[s.day_of_week],
      time: hhmm(s.at_time),
      title: s.title,
      notes: s.notes,
      source: "custom",
    });
  }

  const active = slots.filter((s) => s.active);

  // Order cutoffs (deduped by day+hour)
  const cutoffs = new Map<string, number[]>(); // "cutoffDay-hour" -> pickup days
  for (const slot of active) {
    const cutoffDay = (slot.day_of_week + 6) % 7;
    const key = `${cutoffDay}-${slot.cutoff_hour}`;
    if (!cutoffs.has(key)) cutoffs.set(key, []);
    if (!cutoffs.get(key)!.includes(slot.day_of_week))
      cutoffs.get(key)!.push(slot.day_of_week);
  }
  for (const [key, pickupDays] of cutoffs) {
    const [cutoffDay, hour] = key.split("-").map(Number);
    items.push({
      key: `auto-cutoff-${key}`,
      dayOfWeek: cutoffDay,
      date: dates[cutoffDay],
      time: `${String(hour).padStart(2, "0")}:00`,
      title: `Orders close — ${pickupDays.map((d) => DAY_NAMES[d]).join(" & ")} pickup`,
      notes: null,
      source: "auto",
    });
  }

  // Per pickup day: bake finish → package → load, from the first slot's start
  const firstSlotByDay = new Map<number, PickupSlot>();
  for (const slot of active) {
    const existing = firstSlotByDay.get(slot.day_of_week);
    if (!existing || slot.start_time < existing.start_time)
      firstSlotByDay.set(slot.day_of_week, slot);
  }
  for (const [day, slot] of firstSlotByDay) {
    const start = hhmm(slot.start_time)!;
    items.push(
      {
        key: `auto-bake-${day}`,
        dayOfWeek: day,
        date: dates[day],
        time: minusMinutes(start, 60),
        title: "Finish baking",
        notes: "Everything out of the oven 1 hour before first pickup",
        source: "auto",
      },
      {
        key: `auto-pack-${day}`,
        dayOfWeek: day,
        date: dates[day],
        time: minusMinutes(start, 40),
        title: "Package orders",
        notes: "Use the bake sheet's assemble & pack list",
        source: "auto",
      },
      {
        key: `auto-load-${day}`,
        dayOfWeek: day,
        date: dates[day],
        time: minusMinutes(start, 20),
        title: "Load car & head out",
        notes: null,
        source: "auto",
      }
    );
  }

  // Pickup windows
  for (const slot of active) {
    items.push({
      key: `auto-slot-${slot.id}`,
      dayOfWeek: slot.day_of_week,
      date: dates[slot.day_of_week],
      time: hhmm(slot.start_time),
      title: `Pickup — ${slot.pickup_locations?.label_en ?? "location"}`,
      notes: timeRange(slot.start_time, slot.end_time),
      source: "auto",
    });
  }

  items.sort((a, b) =>
    a.date === b.date
      ? (a.time ?? "99") < (b.time ?? "99") ? -1 : 1
      : a.date < b.date ? -1 : 1
  );
  return items;
}

// Next upcoming item relative to now (for the dashboard nudge).
export function nextItem(items: TimelineItem[], now: Date): TimelineItem | null {
  const nowDay = toIsoDay(now);
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  for (const item of items) {
    if (item.date > nowDay) return item;
    if (item.date === nowDay && (item.time ?? "23:59") >= nowTime) return item;
  }
  return null;
}

// iCalendar export: weekly recurring events with a 30-minute alarm each.
export function buildIcs(items: TimelineItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Home Baker Order Hub//Plan//EN",
    "X-WR-CALNAME:Bakery production plan",
  ];
  const byday = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  for (const item of items) {
    const time = (item.time ?? "09:00").replace(":", "") + "00";
    const dtstart = item.date.replaceAll("-", "") + "T" + time;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.key}@home-bakery-order-hub`,
      `DTSTART:${dtstart}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byday[item.dayOfWeek]}`,
      `SUMMARY:${item.title.replace(/[,;\\]/g, " ")}`,
      item.notes ? `DESCRIPTION:${item.notes.replace(/[,;\\]/g, " ")}` : "",
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${item.title.replace(/[,;\\]/g, " ")}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

// Saturday anchor for a week label, given the weeks table row (or today).
export function saturdayFor(startDate: string | null): Date {
  if (startDate) {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    return d;
  }
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d;
}
