import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAliasMap, parseItemsString, resolveProduct, weekLabelFor } from "@/lib/orders";

// Order intake webhook. Drop-in replacement for a Google Apps Script web app:
// the website POSTs the order as text/plain JSON with mode:'no-cors', and GETs
// ?action=remaining&week=<label> for live capacity.
//
// POST body (tart-theory.com contract):
// { orderNum, items, total, pickupDay, pickupTime, pickupPlace, lang, weekLabel }

function unauthorized(req: NextRequest): boolean {
  const required = process.env.INTAKE_TOKEN;
  if (!required) return false;
  return req.nextUrl.searchParams.get("token") !== required;
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "remaining") return NextResponse.json({ ok: false }, { status: 400 });

  const week = req.nextUrl.searchParams.get("week") ?? weekLabelFor(new Date());
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("order_items(qty), payment_status, status")
    .eq("week_label", week)
    .neq("status", "cancelled");
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  const orderedQty = (data ?? []).reduce(
    (sum, o) => sum + (o.order_items ?? []).reduce((s: number, i: { qty: number }) => s + i.qty, 0),
    0
  );
  return NextResponse.json({ ok: true, orderedQty, week });
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });

  // The site sends Content-Type: text/plain (avoids a CORS preflight) — parse manually.
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const orderNum = String(payload.orderNum ?? "").trim();
  const itemsStr = String(payload.items ?? "");
  if (!orderNum || !itemsStr) {
    return NextResponse.json({ ok: false, error: "orderNum and items required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Dedupe: same order arriving twice is merged, not doubled.
  const { data: existing } = await supabase
    .from("orders").select("id").eq("order_num", orderNum).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, deduped: true });

  const [{ data: products }, { data: aliases }] = await Promise.all([
    supabase.from("products").select("id, name_en"),
    supabase.from("product_aliases").select("product_id, alias"),
  ]);
  const aliasMap = buildAliasMap(products ?? [], aliases ?? []);

  const parsed = parseItemsString(itemsStr);
  const total =
    parseFloat(String(payload.total ?? "").replace(/[^0-9.]/g, "")) ||
    parsed.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_num: orderNum,
      source: "webhook",
      status: "confirmed",
      payment_status: "unpaid", // baker confirms Venmo manually
      total,
      lang: String(payload.lang ?? "en"),
      week_label: String(payload.weekLabel ?? weekLabelFor(new Date())),
      pickup_day: payload.pickupDay ? String(payload.pickupDay) : null,
      pickup_time: payload.pickupTime ? String(payload.pickupTime) : null,
      pickup_place: payload.pickupPlace ? String(payload.pickupPlace) : null,
      raw_items: itemsStr,
    })
    .select("id")
    .single();
  if (error || !order) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }

  const items = parsed.map((item) => ({
    order_id: order.id,
    product_id: resolveProduct(item.name, aliasMap),
    description: item.raw,
    qty: item.qty,
    unit_price: item.unitPrice,
  }));
  const { error: itemsError } = await supabase.from("order_items").insert(items);
  if (itemsError) {
    return NextResponse.json({ ok: false, error: itemsError.message }, { status: 500 });
  }

  // Make sure the week exists so it shows up in week views.
  await supabase.from("weeks").upsert(
    { week_label: String(payload.weekLabel ?? weekLabelFor(new Date())) },
    { onConflict: "week_label", ignoreDuplicates: true }
  );

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    unmatchedItems: items.filter((i) => !i.product_id).length,
  });
}
