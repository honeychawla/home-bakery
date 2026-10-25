import { getCatalog, getPickupSlots } from "@/lib/data";
import NewOrderForm from "@/components/NewOrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [catalog, slots] = await Promise.all([getCatalog(), getPickupSlots()]);
  return (
    <NewOrderForm
      products={catalog.products.filter((p) => p.active)}
      slots={slots}
    />
  );
}
