import { createClient } from "@/lib/supabase/server";
import type {
  Ingredient, MessageTemplate, Order, PickupSlot, Product, ProductIngredient,
  RecipeGroup, Settings,
} from "./types";
import { weekLabelFor } from "./orders";

// Server-side fetchers (RLS: runs as the signed-in baker).

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  return (
    (data as Settings) ?? {
      id: 1,
      bakery_name: "My Bakery",
      currency: "USD",
      venmo_handle: null,
      wechat_id: null,
      sheet_embed_url: null,
      sheet_writeback_url: null,
      sheet_writeback_secret: null,
      sources: null,
    }
  );
}

export async function getCatalog(): Promise<{
  products: Product[];
  groups: RecipeGroup[];
  ingredients: Ingredient[];
  recipeLines: ProductIngredient[];
}> {
  const supabase = await createClient();
  const [products, groups, ingredients, recipeLines] = await Promise.all([
    supabase.from("products").select("*").order("name_en"),
    supabase.from("recipe_groups").select("*").order("name"),
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("product_ingredients").select("*"),
  ]);
  return {
    products: (products.data ?? []) as Product[],
    groups: (groups.data ?? []) as RecipeGroup[],
    ingredients: (ingredients.data ?? []) as Ingredient[],
    recipeLines: (recipeLines.data ?? []) as ProductIngredient[],
  };
}

export async function getWeekLabels(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weeks")
    .select("week_label, start_date")
    .order("start_date", { ascending: false, nullsFirst: false });
  const labels = (data ?? []).map((w) => w.week_label);
  const current = weekLabelFor(new Date());
  if (!labels.includes(current)) labels.unshift(current);
  return labels;
}

export async function getOrders(weekLabel?: string): Promise<Order[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("placed_at", { ascending: false });
  if (weekLabel) query = query.eq("week_label", weekLabel);
  const { data } = await query;
  return (data ?? []) as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();
  return (data as Order) ?? null;
}

export async function getPickupSlots(): Promise<PickupSlot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pickup_slots")
    .select("*, pickup_locations(*)")
    .eq("active", true)
    .order("day_of_week")
    .order("start_time");
  return (data ?? []) as PickupSlot[];
}

export async function getTemplates(): Promise<MessageTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("message_templates").select("*").order("name");
  return (data ?? []) as MessageTemplate[];
}

export function currentWeekLabel(): string {
  return weekLabelFor(new Date());
}
