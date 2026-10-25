// Pickup-day strings arrive as text from the website ("Fri 10/23") or from
// manual entry. This derives a real calendar date for the calendar view.

// Returns YYYY-MM-DD or null if the string has no parsable month/day.
export function parsePickupDate(
  pickupDay: string | null | undefined,
  referenceIso: string
): string | null {
  if (!pickupDay) return null;
  const m = pickupDay.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Pick the year that lands closest to the order's placed_at (handles
  // December orders for January pickups and vice versa).
  const ref = new Date(referenceIso);
  let best: Date | null = null;
  for (const year of [ref.getFullYear() - 1, ref.getFullYear(), ref.getFullYear() + 1]) {
    const candidate = new Date(year, month - 1, day);
    if (!best || Math.abs(+candidate - +ref) < Math.abs(+best - +ref)) best = candidate;
  }
  return best ? toIsoDay(best) : null;
}

export function toIsoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Next occurrence of a weekday (0=Sun), today counts if it matches.
export function nextOccurrence(dayOfWeek: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + ((dayOfWeek - d.getDay() + 7) % 7));
  return d;
}

// "Fri 10/31" — the same shape the website sends.
export function formatPickupDay(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}
