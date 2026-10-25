export default function PayBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    unpaid: "bg-orange-100 text-orange-800",
    deposit: "bg-blue-100 text-blue-800",
    refunded: "bg-stone-100 text-stone-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? "bg-stone-100 text-stone-500"}`}>
      {status}
    </span>
  );
}
