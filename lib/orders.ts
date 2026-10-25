// Parsing and labeling logic for incoming orders.

export type ParsedItem = { qty: number; name: string; unitPrice: number; raw: string };

// Parses the website's items string:
//   "1x Matcha Red Bean Tart ($6);\n4x Original Portuguese Style ($4)"
export function parseItemsString(items: string): ParsedItem[] {
  return items
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^(\d+)\s*x\s*(.+?)\s*\(\$([\d.]+)\)\s*$/i);
      if (m) {
        return { qty: parseInt(m[1], 10), name: m[2].trim(), unitPrice: parseFloat(m[3]), raw };
      }
      // Line without the exact shape: keep it, unmatched, qty 1.
      return { qty: 1, name: raw, unitPrice: 0, raw };
    });
}

// Replicates tart-theory.com's weekLabelFor(): anchor to the Saturday ending
// the pickup week, label "Oct 23-24" (Friday-Saturday).
export function weekLabelFor(date: Date): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const sat = new Date(date);
  sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7));
  const fri = new Date(sat);
  fri.setDate(sat.getDate() - 1);
  return `${months[sat.getMonth()]} ${fri.getDate()}-${sat.getDate()}`;
}

// Case-insensitive product resolution against canonical names + aliases.
// aliasMap: lowercased name/alias -> product_id
export function buildAliasMap(
  products: { id: string; name_en: string }[],
  aliases: { product_id: string; alias: string }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of products) map.set(p.name_en.toLowerCase(), p.id);
  for (const a of aliases) map.set(a.alias.toLowerCase(), a.product_id);
  return map;
}

export function resolveProduct(name: string, aliasMap: Map<string, string>): string | null {
  const key = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (aliasMap.has(key)) return aliasMap.get(key)!;
  // tolerate trailing "egg tart"/"tart" differences
  const stripped = key.replace(/\s*(egg\s*)?tart\s*$/i, "").trim();
  for (const [k, v] of aliasMap) {
    if (k.replace(/\s*(egg\s*)?tart\s*$/i, "").trim() === stripped) return v;
  }
  return null;
}
