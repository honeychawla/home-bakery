// MOCK DATA — the app doesn't track where an order or inquiry came from yet.
// This fabricates a plausible per-platform split so the "Conversion & sources"
// panel can be designed and validated. It is deterministic (same input, same
// output) and anchored to the real number of paid orders in each week, so the
// panel's paid totals always match the rest of the dashboard.
//
// Replace `mockSources()` with real tracking once an inquiry/source field exists.

import type { WeekStats } from "./insights";

export const PLATFORMS = ["Xiaohongshu", "WeChat", "Instagram", "FB Marketplace", "Other"] as const;
export type Platform = (typeof PLATFORMS)[number];

// Share of paid orders per platform, and the share of inquiries that end up paying.
const SHARE: Record<Platform, number> = { Xiaohongshu: 0.38, WeChat: 0.3, Instagram: 0.18, "FB Marketplace": 0.09, Other: 0.05 };
const CONVERSION: Record<Platform, number> = { Xiaohongshu: 0.62, WeChat: 0.78, Instagram: 0.45, "FB Marketplace": 0.55, Other: 0.85 };

export type SourceRow = { platform: Platform; inquiries: number; paid: number };

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function mockSourcesForWeek(week: WeekStats): SourceRow[] {
  // wobble each platform's share by up to ±20% per week so the weeks don't look identical
  const raw = PLATFORMS.map((p) => SHARE[p] * (1 + 0.2 * Math.sin(hash(week.label + p))));
  const total = raw.reduce((a, b) => a + b, 0);
  const paid = raw.map((r) => Math.floor((r / total) * week.orderCount));
  let rest = week.orderCount - paid.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i = (i + 1) % paid.length, rest--) paid[i]++;
  return PLATFORMS.map((platform, i) => ({
    platform,
    paid: paid[i],
    inquiries: paid[i] === 0 ? 0 : Math.max(paid[i], Math.round(paid[i] / CONVERSION[platform])),
  }));
}

// Sum of the mock rows across weeks.
export function mockSources(weeks: WeekStats[]): SourceRow[] {
  const sum = new Map<Platform, SourceRow>(PLATFORMS.map((p) => [p, { platform: p, inquiries: 0, paid: 0 }]));
  for (const w of weeks)
    for (const r of mockSourcesForWeek(w)) {
      sum.get(r.platform)!.inquiries += r.inquiries;
      sum.get(r.platform)!.paid += r.paid;
    }
  return [...sum.values()];
}
