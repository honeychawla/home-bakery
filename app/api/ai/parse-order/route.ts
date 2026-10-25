import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiDisabledResponse, aiEnabled, anthropic, AI_MODEL, extractJson } from "@/lib/ai";
import { buildAliasMap, resolveProduct, weekLabelFor } from "@/lib/orders";
import { sheetSync } from "@/lib/sheetSync";

// Quick-add: paste a customer DM/text (any language) and get a draft order.
// POST { text: string, createOrder?: boolean }

type ParsedOrder = {
  customerName: string | null;
  items: { name: string; qty: number }[];
  pickupDay: string | null;
  notes: string | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!aiEnabled()) return aiDisabledResponse();

  const { text, createOrder } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ ok: false, error: "text required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [{ data: products }, { data: aliases }] = await Promise.all([
    admin.from("products").select("id, name_en, name_zh, price, active").eq("active", true),
    admin.from("product_aliases").select("product_id, alias"),
  ]);

  const catalog = (products ?? [])
    .map((p) => `- ${p.name_en}${p.name_zh ? ` / ${p.name_zh}` : ""} ($${p.price})`)
    .join("\n");

  const msg = await anthropic().messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system:
      "You turn a home bakery customer's message (English or Chinese) into a structured order. " +
      "Match requested items to the product catalog by meaning, not exact wording. " +
      "Reply with ONLY a JSON object: {\"customerName\": string|null, " +
      '"items": [{"name": <exact catalog English name>, "qty": number}], ' +
      '"pickupDay": string|null, "notes": string|null}. ' +
      "Put anything you could not match into notes. Do not invent items.",
    messages: [
      { role: "user", content: `Product catalog:\n${catalog}\n\nCustomer message:\n${text}` },
    ],
  });

  const reply = msg.content.find((b) => b.type === "text")?.text ?? "";
  let parsed: ParsedOrder;
  try {
    parsed = extractJson<ParsedOrder>(reply);
  } catch {
    return NextResponse.json({ ok: false, error: "could not parse model reply" }, { status: 502 });
  }

  const aliasMap = buildAliasMap(products ?? [], aliases ?? []);
  const priceById = new Map((products ?? []).map((p) => [p.id, Number(p.price)]));
  const items = (parsed.items ?? []).map((i) => {
    const productId = resolveProduct(i.name, aliasMap);
    return {
      name: i.name,
      qty: Math.max(1, Math.round(i.qty || 1)),
      productId,
      unitPrice: productId ? priceById.get(productId) ?? 0 : 0,
    };
  });
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  if (!createOrder) {
    return NextResponse.json({ ok: true, parsed: { ...parsed, items, total } });
  }

  const orderNum = `QA-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      order_num: orderNum,
      source: "ai_quick_add",
      status: "confirmed",
      payment_status: "unpaid",
      total,
      week_label: weekLabelFor(new Date()),
      pickup_day: parsed.pickupDay,
      venmo_name: parsed.customerName,
      raw_items: text,
      notes: parsed.notes,
    })
    .select("id")
    .single();
  if (error || !order) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
  await admin.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      description: `${i.qty}x ${i.name}`,
      qty: i.qty,
      unit_price: i.unitPrice,
    }))
  );
  // Mirror into the connected Google Sheet (best-effort, non-blocking failure).
  await sheetSync({
    action: "appendOrder",
    orderNum,
    items: items.map((i) => `${i.qty}x ${i.name} ($${i.unitPrice})`).join(";\n"),
    total,
    paid: false,
    venmoName: parsed.customerName,
    pickupDay: parsed.pickupDay,
    weekLabel: weekLabelFor(new Date()),
  });
  return NextResponse.json({ ok: true, orderId: order.id, orderNum, parsed: { ...parsed, items, total } });
}
