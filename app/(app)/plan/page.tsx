import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import PlanTimeline from "@/components/PlanTimeline";
import PlanStepForm from "@/components/PlanStepForm";
import { createClient } from "@/lib/supabase/server";
import { getPickupSlots, getWeekLabels } from "@/lib/data";
import { assembleTimeline, saturdayFor, type PlanStep } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weeks = await getWeekLabels();
  const activeWeek = week ?? weeks[0];

  const supabase = await createClient();
  const [{ data: steps }, slots, { data: weekRow }, { data: checks }] = await Promise.all([
    supabase.from("plan_steps").select("*").order("day_of_week").order("at_time"),
    getPickupSlots(),
    supabase.from("weeks").select("start_date").eq("week_label", activeWeek).maybeSingle(),
    supabase.from("plan_checks").select("step_key").eq("week_label", activeWeek),
  ]);

  const saturday = saturdayFor(weekRow?.start_date ?? null);
  const items = assembleTimeline((steps ?? []) as PlanStep[], slots, saturday);
  const checkedKeys = (checks ?? []).map((c) => c.step_key);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold">Production plan — {activeWeek}</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {weeks.slice(0, 4).map((w) => (
              <Link
                key={w}
                href={`/plan?week=${encodeURIComponent(w)}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  w === activeWeek
                    ? "border-amber-400 bg-amber-100 font-semibold text-amber-900"
                    : "border-stone-200 bg-white text-stone-500"
                }`}
              >
                {w}
              </Link>
            ))}
          </div>
          <a
            href="/api/plan.ics"
            download="bakery-plan.ics"
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
            title="Weekly recurring events with 30-minute reminders, for Google/Apple Calendar"
          >
            📅 Add to calendar
          </a>
          <PrintButton />
        </div>
      </div>

      <h1 className="hidden text-xl font-bold print:block">Production plan — {activeWeek}</h1>
      <p className="text-xs text-stone-500">
        The whole week in order: your steps plus hard deadlines derived from the pickup
        slots (order cutoffs, bake-finish an hour before pickup, package, load). Check
        things off as the week moves; &quot;Add to calendar&quot; gives every step a phone
        reminder 30 minutes ahead.
      </p>

      <PlanTimeline weekLabel={activeWeek} items={items} initialChecked={checkedKeys} />

      <PlanStepForm />
    </div>
  );
}
