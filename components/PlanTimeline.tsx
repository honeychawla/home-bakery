"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toIsoDay } from "@/lib/dates";
import type { TimelineItem } from "@/lib/plan";

// Chronological week timeline with per-week check-offs and a "now" marker.
export default function PlanTimeline({
  weekLabel,
  items,
  initialChecked,
}: {
  weekLabel: string;
  items: TimelineItem[];
  initialChecked: string[];
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));
  const today = toIsoDay(new Date());
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  async function toggle(key: string) {
    const supabase = createClient();
    const next = new Set(checked);
    if (next.has(key)) {
      next.delete(key);
      setChecked(next);
      await supabase.from("plan_checks").delete().eq("week_label", weekLabel).eq("step_key", key);
    } else {
      next.add(key);
      setChecked(next);
      await supabase
        .from("plan_checks")
        .upsert({ week_label: weekLabel, step_key: key }, { onConflict: "week_label,step_key" });
    }
    router.refresh();
  }

  // Group by date, preserving order.
  const days: { date: string; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else days.push({ date: item.date, items: [item] });
  }

  const fmtDay = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  const fmtTime = (t: string | null) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      {days.map(({ date, items: dayItems }) => {
        const isToday = date === today;
        const isPast = date < today;
        return (
          <section
            key={date}
            className={`rounded-2xl border bg-white p-4 print:break-inside-avoid print:border-stone-300 ${
              isToday ? "border-amber-400 ring-1 ring-amber-300" : "border-amber-100"
            } ${isPast ? "opacity-70" : ""}`}
          >
            <h2 className="flex items-center gap-2 text-sm font-bold text-stone-700">
              {fmtDay(date)}
              {isToday && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Today
                </span>
              )}
            </h2>
            <ol className="mt-2 border-l-2 border-amber-100 pl-4">
              {dayItems.map((item) => {
                const isChecked = checked.has(item.key);
                const isNowPassed =
                  isToday && item.time != null && item.time <= nowTime && !isChecked;
                return (
                  <li key={item.key} className="relative py-1.5">
                    <span
                      className={`absolute -left-[23px] top-2.5 h-3 w-3 rounded-full border-2 ${
                        isChecked
                          ? "border-green-500 bg-green-500"
                          : isNowPassed
                          ? "border-orange-400 bg-orange-400"
                          : item.source === "auto"
                          ? "border-amber-400 bg-white"
                          : "border-stone-300 bg-white"
                      }`}
                    />
                    <button
                      onClick={() => toggle(item.key)}
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-1 text-left hover:bg-amber-50/60"
                    >
                      <span className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-stone-400">
                        {fmtTime(item.time)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm ${
                            isChecked ? "text-stone-400 line-through" : "font-medium"
                          } ${isNowPassed ? "text-orange-700" : ""}`}
                        >
                          {item.title}
                          {item.source === "auto" && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase text-amber-700">
                              auto
                            </span>
                          )}
                        </span>
                        {item.notes && (
                          <span className="block text-xs text-stone-400">{item.notes}</span>
                        )}
                      </span>
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                          isChecked
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-stone-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <p className="text-[11px] text-stone-400 print:hidden">
        Orange dot = due and not checked. &quot;Auto&quot; steps come from your pickup slots —
        change the slots and they move with them.
      </p>
    </div>
  );
}
