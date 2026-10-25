import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAliasMap, parseItemsString, resolveProduct, weekLabelFor } from "@/lib/orders";
import { parsePickupDate } from "@/lib/dates";

// CSV import: accepts mapped rows from the client-side importer and inserts
// orders with the same parsing/dedupe rules as the live webhook.
// POST { rows: [{ orderNum, items, total, paid, amountReceived, venmoName,
//                 pickupDay, pickupTime, pickupPlace, lang, placedAt }] }

type Row = {
  orderNum?: string;
  items?: string;
  total?: string;
  paid?: string;
  amountReceived?: string;
  venmoName?: string;
  pickupDay?: string;
  pickupTime?: string;
  pickupPlace?: string;
  lang?: string;
  placedAt?: string;
};

function parseMoney(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

function parseBool(s: string | undefined): boolean {
  if (!s) return false;
  return /^(true|yes|y|1|paid|✓|x)$/i.test(s.trim());
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { rows } = (await req.json()) as { rows: Row[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ ok: false, error: "no rows" }, { status: 400 });
  }
  if (rows.length > 2000) {
    return NextResponse.json({ ok: false, error: "too many rows (max 2000)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [{ data: products }, { data: aliases }, { data: existing }] = await Promise.all([
    admin.from("products").select("id, name_en"),
    admin.from("product_aliases").select("product_id, alias"),
    admin.from("orders").select("order_num"),
  ]);
  const aliasMap = buildAliasMap(products ?? [], aliases ?? []);
  const existingNums = new Set((existing ?? []).map((o) => o.order_num));

  let imported = 0;
  let skippedDupes = 0;
  let skippedBad = 0;
  let unmatchedItems = 0;
  const weeks = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const orderNum = row.orderNum?.trim() || `CSV-${Date.now().toString(36).toUpperCase().slice(-4)}-${index}`;
    if (existingNums.has(orderNum)) {
      skippedDupes++;
      continue;
    }
    const itemsStr = row.items?.trim();
    if (!itemsStr) {
      skippedBad++;
      continue;
    }
    const parsed = parseItemsString(itemsStr);
    const placedAt = row.placedAt && !isNaN(Date.parse(row.placedAt))
      ? new Date(row.placedAt).toISOString()
      : new Date().toISOString();
    const pickupIso = parsePickupDate(row.pickupDay, placedAt);
    const weekLabel = weekLabelFor(pickupIso ? new Date(pickupIso + "T12:00:00") : new Date(placedAt));
    weeks.add(weekLabel);
    const paid = parseBool(row.paid);
    const total =
      parseMoney(row.total) ?? parsed.reduce((s, i) => s + i.qty * i.unitPrice, 0);

    const { data: order, error } = await admin
      .from("orders")
      .insert({
        order_num: orderNum,
        source: "import",
        status: "confirmed",
        payment_status: paid ? "paid" : "unpaid",
        total,
        amount_received: paid ? parseMoney(row.amountReceived) ?? total : null,
        venmo_name: row.venmoName?.trim() || null,
        lang: row.lang?.trim() || "en",
        week_label: weekLabel,
        pickup_day: row.pickupDay?.trim() || null,
        pickup_time: row.pickupTime?.trim() || null,
        pickup_place: row.pickupPlace?.trim() || null,
        raw_items: itemsStr,
        placed_at: placedAt,
      })
      .select("id")
      .single();
    if (error || !order) {
      skippedBad++;
      continue;
    }
    existingNums.add(orderNum);

    const items = parsed.map((item) => ({
      order_id: order.id,
      product_id: resolveProduct(item.name, aliasMap),
      description: item.raw,
      qty: item.qty,
      unit_price: item.unitPrice,
    }));
    unmatchedItems += items.filter((i) => !i.product_id).length;
    await admin.from("order_items").insert(items);
    imported++;
  }

  for (const w of weeks) {
    await admin.from("weeks").upsert({ week_label: w }, { onConflict: "week_label", ignoreDuplicates: true });
  }

  return NextResponse.json({ ok: true, imported, skippedDupes, skippedBad, unmatchedItems });
}
