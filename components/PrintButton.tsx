"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 print:hidden"
    >
      🖨 Print
    </button>
  );
}
