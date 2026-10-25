"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { autoMapHeaders, CSV_FIELDS, parseCsv, type CsvField } from "@/lib/csv";

const FIELD_LABELS: Record<CsvField, string> = {
  orderNum: "Order #",
  items: "Items",
  total: "Total",
  paid: "Paid?",
  amountReceived: "Amount received",
  venmoName: "Customer / Venmo name",
  pickupDay: "Pickup day",
  pickupTime: "Pickup time",
  pickupPlace: "Pickup place",
  lang: "Language",
  placedAt: "Timestamp",
};

type Result = { imported: number; skippedDupes: number; skippedBad: number; unmatchedItems: number };

// Upload a CSV export of an orders spreadsheet, confirm the column mapping,
// preview, and import. Rows are deduped against existing order numbers.
export default function CsvImporter() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, CsvField | "">>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setError("That file has no data rows.");
      return;
    }
    setHeaders(parsed[0]);
    setRows(parsed.slice(1));
    setMapping(autoMapHeaders(parsed[0]));
  }

  async function runImport() {
    const mapped = rows.map((r) => {
      const obj: Record<string, string> = {};
      for (const [idxStr, field] of Object.entries(mapping)) {
        if (!field) continue;
        obj[field] = r[Number(idxStr)] ?? "";
      }
      return obj;
    });
    setBusy(true);
    setError(null);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: mapped }),
    });
    const data = await res.json();
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    setResult(data);
    router.refresh();
  }

  const itemsMapped = Object.values(mapping).includes("items");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/orders" className="text-xs text-stone-400 underline">
          ← Orders
        </Link>
        <h1 className="text-xl font-bold">Import orders from CSV</h1>
        <p className="mt-1 text-xs text-stone-500">
          Export your existing sheet (File → Download → CSV in Google Sheets) and upload it
          here. Already-imported order numbers are skipped, so re-importing is safe.
        </p>
      </div>

      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-amber-200 bg-white p-8 text-center text-sm text-stone-500 hover:border-amber-400">
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        {headers.length === 0 ? "Tap to choose a .csv file" : "Choose a different file"}
      </label>

      {headers.length > 0 && !result && (
        <>
          <section className="rounded-2xl border border-amber-100 bg-white p-4">
            <h2 className="text-sm font-bold text-stone-600">
              Column mapping <span className="font-normal text-stone-400">(auto-detected — fix anything wrong)</span>
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{h || `(column ${i + 1})`}</span>
                  <select
                    value={mapping[i] ?? ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [i]: e.target.value as CsvField | "" })
                    }
                    className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="">— ignore —</option>
                    {CSV_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!itemsMapped && (
              <p className="mt-2 text-xs text-orange-600">
                Map an <b>Items</b> column to import — it&apos;s the only required field.
              </p>
            )}
          </section>

          <section className="overflow-x-auto rounded-2xl border border-amber-100 bg-white p-4">
            <h2 className="text-sm font-bold text-stone-600">
              Preview — {rows.length} rows
            </h2>
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="text-left text-stone-400">
                  {headers.map((h, i) => (
                    <th key={i} className="px-2 py-1 font-medium">
                      {mapping[i] ? FIELD_LABELS[mapping[i] as CsvField] : "—"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, ri) => (
                  <tr key={ri} className="border-t border-amber-50 align-top">
                    {r.map((c, ci) => (
                      <td key={ci} className={`max-w-40 truncate px-2 py-1 ${mapping[ci] ? "" : "text-stone-300"}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="mt-1 text-[11px] text-stone-400">…and {rows.length - 5} more</p>
            )}
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={runImport}
            disabled={busy || !itemsMapped}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? "Importing…" : `Import ${rows.length} rows`}
          </button>
        </>
      )}

      {result && (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm">
          <h2 className="font-bold text-green-900">Import complete</h2>
          <ul className="mt-2 space-y-1 text-stone-700">
            <li>✓ {result.imported} orders imported</li>
            {result.skippedDupes > 0 && <li>↷ {result.skippedDupes} skipped (already exist)</li>}
            {result.skippedBad > 0 && <li>⚠ {result.skippedBad} skipped (no items / bad row)</li>}
            {result.unmatchedItems > 0 && (
              <li>
                ⚠ {result.unmatchedItems} item line(s) didn&apos;t match your menu — they&apos;re
                kept as text; add aliases and they&apos;ll match next time.
              </li>
            )}
          </ul>
          <Link href="/orders" className="mt-3 inline-block rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
            View orders →
          </Link>
        </section>
      )}
    </div>
  );
}
