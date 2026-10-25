import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPickupSlots } from "@/lib/data";
import { assembleTimeline, buildIcs, saturdayFor, type PlanStep } from "@/lib/plan";

// Downloads the weekly production plan as an iCalendar file: recurring weekly
// events with a 30-minute reminder each. Import once into Google/Apple
// Calendar and every step pings the baker's phone.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const [{ data: steps }, slots] = await Promise.all([
    supabase.from("plan_steps").select("*").order("day_of_week").order("at_time"),
    getPickupSlots(),
  ]);
  const items = assembleTimeline((steps ?? []) as PlanStep[], slots, saturdayFor(null));
  const ics = buildIcs(items);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bakery-plan.ics"',
    },
  });
}
