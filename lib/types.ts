export type Product = {
  id: string;
  name_en: string;
  name_zh: string | null;
  price: number;
  batch_yield: number;
  packaging_cost: number;
  est_filling_cost: number | null;
  labor_minutes: number | null;
  recipe_group_id: string | null;
  is_bundle: boolean;
  active: boolean;
};

export type RecipeGroup = { id: string; name: string; batch_size: number };

export type Ingredient = {
  id: string;
  name: string;
  purchase_qty: number;
  purchase_unit: string;
  purchase_cost: number;
  base_unit: string;
  base_qty: number;
  price_effective_date: string;
  stock_qty: number | null;        // on-hand, in base units (null = untracked)
  stock_updated_at: string | null;
  usage_per_tart: number | null;   // for non-recipe consumables (packaging)
};

export type ProductIngredient = {
  id: string;
  product_id: string;
  ingredient_id: string;
  qty_base: number;
  note: string | null;
  ingredient?: Ingredient;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
};

export type Order = {
  id: string;
  order_num: string;
  source: string;
  customer_id: string | null;
  status: "confirmed" | "ready" | "completed" | "cancelled" | "no_show";
  payment_status: "unpaid" | "deposit" | "paid" | "refunded";
  total: number;
  amount_received: number | null;
  venmo_name: string | null;
  lang: string | null;
  week_label: string | null;
  pickup_day: string | null;
  pickup_time: string | null;
  pickup_place: string | null;
  picked_up_at: string | null;
  raw_items: string | null;
  notes: string | null;
  placed_at: string;
  order_items?: OrderItem[];
};

export type PickupSlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location_id: string | null;
  capacity: number | null;
  cutoff_hour: number;
  active: boolean;
  pickup_locations?: PickupLocation | null;
};

export type PickupLocation = {
  id: string;
  label_en: string;
  label_zh: string | null;
  address: string | null;
  map_link: string | null;
};

export type MessageTemplate = {
  id: string;
  name: string;
  body_en: string;
  body_zh: string | null;
};

export type Settings = {
  id: number;
  bakery_name: string;
  currency: string;
  venmo_handle: string | null;
  wechat_id: string | null;
  sheet_embed_url: string | null;
  sheet_writeback_url: string | null;
  sheet_writeback_secret: string | null;
  sources: Record<string, string | { label: string; value: string }[]> | null;
};
