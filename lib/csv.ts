// Minimal RFC 4180 CSV parser — handles quoted fields containing commas,
// escaped quotes ("") and newlines (Tart Theory's Items column is multiline).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

// Fuzzy header matching: maps common spreadsheet column names to our fields.
export const CSV_FIELDS = [
  "orderNum",
  "items",
  "total",
  "paid",
  "amountReceived",
  "venmoName",
  "pickupDay",
  "pickupTime",
  "pickupPlace",
  "lang",
  "placedAt",
] as const;
export type CsvField = (typeof CSV_FIELDS)[number];

const HEADER_PATTERNS: [CsvField, RegExp][] = [
  ["orderNum", /order\s*(#|no|num|number|id)/i],
  ["items", /items?|products?|order\s*details?/i],
  ["total", /^total|amount(?!\s*received)|price/i],
  ["amountReceived", /received|after\s*fee|net/i],
  ["paid", /paid|payment/i],
  ["venmoName", /venmo|customer|name|buyer/i],
  ["pickupDay", /pickup\s*(day|date)|day|date(?!.*time)/i],
  ["pickupTime", /time/i],
  ["pickupPlace", /place|location|where/i],
  ["lang", /lang/i],
  ["placedAt", /timestamp|placed|created/i],
];

export function autoMapHeaders(headers: string[]): Record<number, CsvField | ""> {
  const map: Record<number, CsvField | ""> = {};
  const used = new Set<CsvField>();
  // placedAt/timestamp first so "Timestamp" doesn't get eaten by date patterns
  const ordered: [CsvField, RegExp][] = [
    ["placedAt", /timestamp|placed|created/i],
    ...HEADER_PATTERNS.filter(([f]) => f !== "placedAt"),
  ];
  headers.forEach((h, i) => {
    map[i] = "";
    for (const [field, re] of ordered) {
      if (!used.has(field) && re.test(h.trim())) {
        map[i] = field;
        used.add(field);
        break;
      }
    }
  });
  return map;
}
