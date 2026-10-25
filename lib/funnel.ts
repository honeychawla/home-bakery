// Real inquiry -> order -> paid funnel per channel, built from the inquiry log
// and the orders' `channel` tag. Same output shape as the mock in mockSources.ts.
//
// Counting rules (per pickup week):
//  - paid       = paid orders, by the order's channel (untagged -> "Untracked")
//  - inquiries  = logged inquiries in that week
//                 + orders that no inquiry is linked to (an order is at least one inquiry)
// so conversion = paid / inquiries can't exceed 100%.
//
// Limitation: an inquiry that is still open (not linked to an order) is placed in the
// week of its created date, and weeks with no orders at all aren't charted.

import { CHANNELS, UNTRACKED } from "./channels";
import type { WeekStats } from "./insights";

export type InsightInquiry = { channel: string; weekLabel: string };
export type FunnelRow = { platform: string; inquiries: number; paid: number };

export function realSourcesForWeek(week: WeekStats, inquiries: InsightInquiry[]): FunnelRow[] {
  const rows = new Map<string, FunnelRow>([...CHANNELS, UNTRACKED].map((c) => [c, { platform: c, inquiries: 0, paid: 0 }]));
  const row = (channel: string | null) => {
    const key = channel ?? UNTRACKED;
    if (!rows.has(key)) rows.set(key, { platform: key, inquiries: 0, paid: 0 });
    return rows.get(key)!;
  };
  for (const o of week.orders) row(o.channel).paid++;
  for (const o of [...week.orders, ...week.unpaidOrders]) if (!o.hasInquiry) row(o.channel).inquiries++;
  for (const i of inquiries) if (i.weekLabel === week.label) row(i.channel).inquiries++;
  return [...rows.values()];
}
