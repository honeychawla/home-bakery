import { createAdminClient } from "./supabase/admin";

// Best-effort write-back to the baker's Google Sheet via their Apps Script
// web app (scripts/sheet-writeback.gs). Never throws: the app's database is
// the source of truth; the sheet mirror failing must not break the action.
//
// Only app-originated changes sync. Webhook and CSV orders come FROM the
// sheet's world, so syncing them back would duplicate rows.

export type AppendOrderSync = {
  action: "appendOrder";
  orderNum: string;
  items: string;
  total: number;
  paid: boolean;
  amountReceived?: number | null;
  venmoName?: string | null;
  pickupDay?: string | null;
  pickupTime?: string | null;
  pickupPlace?: string | null;
  lang?: string | null;
  weekLabel?: string | null;
  timestamp?: string;
};

export type UpdatePaymentSync = {
  action: "updatePayment";
  orderNum: string;
  paid: boolean;
  amountReceived?: number | null;
  venmoName?: string | null;
  weekLabel?: string | null;
};

export type UpdateOrderSync = {
  action: "updateOrder";
  orderNum: string;
  weekLabel?: string | null;
  // Only the keys present are written to the sheet row.
  fields: Partial<{
    items: string;
    total: number;
    venmoName: string;
    pickupDay: string;
    pickupTime: string;
    pickupPlace: string;
    lang: string;
  }>;
};

export type SheetSyncPayload = AppendOrderSync | UpdatePaymentSync | UpdateOrderSync;

export async function sheetSync(
  payload: SheetSyncPayload
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data: settings } = await admin
      .from("settings")
      .select("sheet_writeback_url, sheet_writeback_secret")
      .eq("id", 1)
      .single();
    if (!settings?.sheet_writeback_url) return { ok: false, skipped: true };

    const res = await fetch(settings.sheet_writeback_url, {
      method: "POST",
      // text/plain avoids a CORS preflight; Apps Script replies via a 302
      // to googleusercontent.com, which fetch follows by default.
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ ...payload, secret: settings.sheet_writeback_secret ?? "" }),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: res.ok };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "sync failed" };
  }
}
