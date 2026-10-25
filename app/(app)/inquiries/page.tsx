import InquiryBoard from "@/components/InquiryBoard";
import { getInquiries, getOrders } from "@/lib/data";

export const dynamic = "force-dynamic";

// Log who messaged (and on which app), link them to an order once they order,
// and see who still needs a nudge. Feeds the Conversion & sources panel on Insights.
export default async function InquiriesPage() {
  const [inquiries, orders] = await Promise.all([getInquiries(), getOrders()]);
  const linked = new Set((inquiries ?? []).map((i) => i.order_id).filter(Boolean));
  return (
    <InquiryBoard
      ready={inquiries !== null}
      inquiries={inquiries ?? []}
      orders={orders
        .filter((o) => o.status !== "cancelled")
        .map((o) => ({
          id: o.id,
          orderNum: o.order_num,
          who: o.venmo_name,
          weekLabel: o.week_label,
          total: Number(o.total) || 0,
          paid: o.payment_status === "paid",
          channel: o.channel ?? null,
          linked: linked.has(o.id),
        }))}
    />
  );
}
