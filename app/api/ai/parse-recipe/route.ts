import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiDisabledResponse, aiEnabled, anthropic, AI_MODEL, extractJson } from "@/lib/ai";

// Recipe importer: paste free-text ingredients (like a cost-tracker cell:
// "Whole milk 80g\nHeavy cream 160g\nEgg yolk x1...") and get structured
// per-batch recipe lines wired into the ingredient library.
// POST { productId: string, text: string, apply?: boolean }

type ParsedLine = {
  ingredient: string;       // canonical ingredient name
  qty: number;              // per batch, in base units
  baseUnit: "g" | "ml" | "unit";
  note: string | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!aiEnabled()) return aiDisabledResponse();

  const { productId, text, apply } = await req.json();
  if (!productId || !text?.trim()) {
    return NextResponse.json({ ok: false, error: "productId and text required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ingredients } = await admin.from("ingredients").select("*");
  const library = (ingredients ?? [])
    .map((i) => `- ${i.name} (base unit: ${i.base_unit})`)
    .join("\n");

  const msg = await anthropic().messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    system:
      "You convert a baker's free-text ingredient list (per batch) into structured lines. " +
      "Match to the existing ingredient library when the meaning is the same (e.g. 'Milk 200g' → 'Whole milk'); " +
      "otherwise keep a sensible canonical name so a new library entry can be created. " +
      "Convert counts like 'Egg yolk x2' to qty 2 with baseUnit 'unit'. Grams → 'g', milliliters → 'ml'. " +
      'Reply with ONLY a JSON array: [{"ingredient": string, "qty": number, "baseUnit": "g"|"ml"|"unit", "note": string|null}].',
    messages: [
      { role: "user", content: `Ingredient library:\n${library}\n\nRecipe text (one batch):\n${text}` },
    ],
  });

  const reply = msg.content.find((b) => b.type === "text")?.text ?? "";
  let lines: ParsedLine[];
  try {
    lines = extractJson<ParsedLine[]>(reply);
  } catch {
    return NextResponse.json({ ok: false, error: "could not parse model reply" }, { status: 502 });
  }

  if (!apply) return NextResponse.json({ ok: true, lines });

  // Apply: upsert unknown ingredients (zero-cost placeholders the baker prices
  // later), then replace the product's recipe.
  const byName = new Map((ingredients ?? []).map((i) => [i.name.toLowerCase(), i]));
  const recipeRows: { product_id: string; ingredient_id: string; qty_base: number; note: string | null }[] = [];
  for (const line of lines) {
    let ing = byName.get(line.ingredient.toLowerCase());
    if (!ing) {
      const { data: created, error } = await admin
        .from("ingredients")
        .insert({
          name: line.ingredient,
          purchase_qty: 1,
          purchase_unit: "unit",
          purchase_cost: 0, // baker fills in real price later
          base_unit: line.baseUnit,
          base_qty: 1,
        })
        .select("*")
        .single();
      if (error || !created) continue;
      ing = created;
      byName.set(ing.name.toLowerCase(), ing);
    }
    recipeRows.push({
      product_id: productId,
      ingredient_id: ing.id,
      qty_base: line.qty,
      note: line.note,
    });
  }

  await admin.from("product_ingredients").delete().eq("product_id", productId);
  const { error: insertError } = await admin.from("product_ingredients").insert(recipeRows);
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, lines, applied: recipeRows.length });
}
