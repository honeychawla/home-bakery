import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiDisabledResponse, aiEnabled, anthropic, AI_MODEL } from "@/lib/ai";

// Drafts a customer message for an order (confirmation, reminder, payment
// follow-up, thanks) in the order's language. The baker copies it into
// WeChat/SMS — we never send on their behalf.
// POST { orderId: string, intent: string, extra?: string }

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!aiEnabled()) return aiDisabledResponse();

  const { orderId, intent, extra } = await req.json();
  if (!orderId || !intent) {
    return NextResponse.json({ ok: false, error: "orderId and intent required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [{ data: order }, { data: settings }] = await Promise.all([
    admin.from("orders").select("*, order_items(description, qty, unit_price)").eq("id", orderId).single(),
    admin.from("settings").select("*").eq("id", 1).single(),
  ]);
  if (!order) return NextResponse.json({ ok: false, error: "order not found" }, { status: 404 });

  const lang = order.lang === "zh" ? "Chinese (Simplified)" : "English";
  const items = (order.order_items ?? []).map((i: { description: string }) => i.description).join("; ");

  const msg = await anthropic().messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    system:
      `You write short, warm customer messages for ${settings?.bakery_name ?? "a home bakery"}. ` +
      `Write in ${lang}. Sound like a friendly small-business owner texting, not a corporation. ` +
      "1-3 sentences plus the key order facts. No subject line, no signature, no markdown. " +
      "Reply with the message text only.",
    messages: [
      {
        role: "user",
        content:
          `Intent: ${intent}\n` +
          `Order ${order.order_num}: ${items}\n` +
          `Total: $${order.total}${order.payment_status === "paid" ? " (paid)" : " (NOT yet paid)"}\n` +
          `Pickup: ${order.pickup_day ?? "TBD"} ${order.pickup_time ?? ""} at ${order.pickup_place ?? "TBD"}\n` +
          `Customer name: ${order.venmo_name ?? "unknown"}\n` +
          (settings?.venmo_handle ? `Venmo: ${settings.venmo_handle}\n` : "") +
          (extra ? `Extra instructions from the baker: ${extra}\n` : ""),
      },
    ],
  });

  const draft = msg.content.find((b) => b.type === "text")?.text?.trim() ?? "";
  if (!draft) return NextResponse.json({ ok: false, error: "empty draft" }, { status: 502 });

  await admin.from("message_log").insert({
    order_id: orderId,
    customer_id: order.customer_id,
    channel: "draft",
    body: draft,
  });

  return NextResponse.json({ ok: true, draft });
}
