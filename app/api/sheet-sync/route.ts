import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sheetSync, type SheetSyncPayload } from "@/lib/sheetSync";

// Client components fire this after app-side changes (manual order created,
// payment toggled) so the Google Sheet mirror stays current. Best-effort:
// a failure here never blocks the app action, which already committed.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const payload = (await req.json()) as SheetSyncPayload;
  const actions = ["appendOrder", "updatePayment", "updateOrder"];
  if (!actions.includes(payload.action)) {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }
  const result = await sheetSync(payload);
  return NextResponse.json(result);
}
