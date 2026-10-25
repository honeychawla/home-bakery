export function money(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "—";
  return `$${Number(n).toFixed(2)}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function timeRange(start: string, end: string): string {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}
