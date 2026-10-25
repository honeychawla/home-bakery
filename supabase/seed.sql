-- Seed data: Tart Theory pilot bakery (also serves as demo data).
-- Run AFTER schema.sql. Safe to re-run: clears existing rows first.

begin;

delete from plan_checks; delete from plan_steps;
delete from message_log; delete from message_templates;
delete from order_items; delete from orders; delete from customers;
delete from weeks;
delete from product_ingredients; delete from product_aliases; delete from products;
delete from recipe_groups; delete from ingredients;
delete from pickup_slots; delete from pickup_locations;

update settings set bakery_name = 'Tart Theory', venmo_handle = '@tart_theory', wechat_id = 'tart_theory';

-- ============ Recipe groups (shared base recipes, counted together) ============
insert into recipe_groups (name, batch_size) values
  ('Classic custard base', 8),
  ('Cheese base', 8);

-- ============ Products ============
insert into products (name_en, name_zh, price, batch_yield, packaging_cost, est_filling_cost, recipe_group_id, is_bundle) values
  ('Classic Portuguese Egg Tart', '原味葡式蛋挞', 4, 8, 0.09, 0.31, (select id from recipe_groups where name='Classic custard base'), false),
  ('Corn Egg Tart', '玉米蛋挞', 6, 8, 0.09, 0.15, (select id from recipe_groups where name='Classic custard base'), false),
  ('Chestnut Egg Tart', '栗子蛋挞', 6, 1, 0.09, 0.71, (select id from recipe_groups where name='Classic custard base'), false),
  ('Soy Milk Mochi Egg Tart', '豆乳流心蛋挞', 6, 6, 0.09, 1.85, (select id from recipe_groups where name='Classic custard base'), false),
  ('Osmanthus Rice Wine Egg Tart', '桂花酒酿蛋挞', 6, 1, 0.09, 1.06, (select id from recipe_groups where name='Classic custard base'), false),
  ('Lychee Cream Cheese Egg Tart', '荔枝奶酪蛋挞', 6, 1, 0.09, 0.54, (select id from recipe_groups where name='Classic custard base'), false),
  ('Lava Cheese Tart', '芝士爆浆挞', 6, 8, 0.09, 0.42, (select id from recipe_groups where name='Cheese base'), false),
  ('Black Sesame Mochi Egg Tart', '黑芝麻爆浆塔', 6, 6, 0.09, 0.59, (select id from recipe_groups where name='Cheese base'), false),
  ('Tiramisu Egg Tart', '提拉米苏蛋挞', 6, 1, 0.09, 0.98, null, false),
  ('Purple Rice Taro Egg Tart', '紫米芋泥蛋挞', 6, 18, 0.09, 0.20, null, false),
  ('Pork Floss Salted Egg Tart', '肉松咸蛋黄蛋挞', 6, 1, 0.09, 0.43, null, false),
  ('Lava Chocolate Egg Tart', '脏脏巧克力蛋挞', 6, 1, 0.09, 0.16, null, false),
  ('Matcha Red Bean Tart', '抹茶红豆蛋挞', 6, 1, 0.09, 0.45, null, false),
  ('Roasted Durian Egg Tart', '炙烤榴莲蛋挞', 6, 1, 0.09, 0.50, null, false),
  ('Persimmon Egg Tart', '柿柿如意挞', 6, 4, 0.09, 0.38, null, false),
  ('Oreo Brownie Egg Tart', '奥利奥布朗尼蛋挞', 6, 1, 0.09, 0.23, null, false),
  ('Halloween Box of 4', '万圣节礼盒 · 4 个装', 30, 1, 0.34, null, null, true),
  ('Halloween Box of 6', '万圣节礼盒 · 6 个装', 40, 1, 0.34, null, null, true);

-- ============ Aliases (names seen in webhook item strings / cost sheet) ============
insert into product_aliases (product_id, alias)
select p.id, a.alias from (values
  ('Classic Portuguese Egg Tart', 'Original Portuguese Style'),
  ('Classic Portuguese Egg Tart', 'Original Egg Tart'),
  ('Corn Egg Tart', 'Corn'),
  ('Chestnut Egg Tart', 'Chestnut'),
  ('Soy Milk Mochi Egg Tart', 'Soy'),
  ('Osmanthus Rice Wine Egg Tart', 'Osmanthus'),
  ('Lychee Cream Cheese Egg Tart', 'Lychee Cream Cheese Eggtart'),
  ('Lychee Cream Cheese Egg Tart', 'Lychee'),
  ('Lava Cheese Tart', 'Lava Cheese'),
  ('Black Sesame Mochi Egg Tart', 'Black Sesame Mochi Tart'),
  ('Black Sesame Mochi Egg Tart', 'Black Sesame'),
  ('Tiramisu Egg Tart', 'Tiramisu'),
  ('Purple Rice Taro Egg Tart', 'Taro + Purple Rice'),
  ('Pork Floss Salted Egg Tart', 'Pork Floss'),
  ('Lava Chocolate Egg Tart', 'Lava Chocolate'),
  ('Matcha Red Bean Tart', 'Red Bean'),
  ('Roasted Durian Egg Tart', 'Durian'),
  ('Persimmon Egg Tart', 'Persimmon'),
  ('Oreo Brownie Egg Tart', 'Oreo')
) as a(name_en, alias)
join products p on p.name_en = a.name_en;

-- ============ Ingredients (starter library; prices are estimates) ============
insert into ingredients (name, purchase_qty, purchase_unit, purchase_cost, base_unit, base_qty) values
  ('Whole milk', 1, 'gallon', 4.29, 'ml', 3785),
  ('Heavy cream', 1, 'quart', 5.99, 'ml', 946),
  ('Eggs', 1, 'dozen', 3.49, 'unit', 12),
  ('Sugar', 1, '4 lb bag', 3.99, 'g', 1814),
  ('Butter', 1, 'lb', 4.99, 'g', 454),
  ('Corn starch', 1, '16 oz box', 1.99, 'g', 454),
  ('Cream cheese', 1, '8 oz block', 2.99, 'g', 227),
  ('Black sesame paste', 1, '8 oz jar', 6.99, 'g', 227),
  ('Glutinous rice flour', 1, '16 oz bag', 2.49, 'g', 454),
  ('Condensed milk', 1, '14 oz can', 2.79, 'g', 397);

-- Structured per-batch recipes (gram-precise flavors first; the rest of the
-- menu is completed in the block at the end of this file).
insert into product_ingredients (product_id, ingredient_id, qty_base, note)
select p.id, i.id, r.qty, r.note from (values
  ('Classic Portuguese Egg Tart', 'Whole milk', 80, null),
  ('Classic Portuguese Egg Tart', 'Heavy cream', 160, null),
  ('Classic Portuguese Egg Tart', 'Eggs', 2, '1 yolk + 1 whole'),
  ('Classic Portuguese Egg Tart', 'Sugar', 40, null),
  ('Corn Egg Tart', 'Sugar', 30, null),
  ('Corn Egg Tart', 'Eggs', 2, 'yolks'),
  ('Corn Egg Tart', 'Whole milk', 200, null),
  ('Corn Egg Tart', 'Corn starch', 20, null),
  ('Corn Egg Tart', 'Butter', 20, null),
  ('Lava Cheese Tart', 'Cream cheese', 140, null),
  ('Lava Cheese Tart', 'Sugar', 45, null),
  ('Lava Cheese Tart', 'Heavy cream', 130, null),
  ('Lava Cheese Tart', 'Corn starch', 5, null),
  ('Black Sesame Mochi Egg Tart', 'Eggs', 2, 'yolks'),
  ('Black Sesame Mochi Egg Tart', 'Sugar', 40, 'custard 25 + mochi 15'),
  ('Black Sesame Mochi Egg Tart', 'Heavy cream', 50, null),
  ('Black Sesame Mochi Egg Tart', 'Black sesame paste', 45, 'custard 30 + topping 15'),
  ('Black Sesame Mochi Egg Tart', 'Corn starch', 12, null),
  ('Black Sesame Mochi Egg Tart', 'Whole milk', 250, 'custard 100 + mochi 150'),
  ('Black Sesame Mochi Egg Tart', 'Butter', 16, null),
  ('Black Sesame Mochi Egg Tart', 'Condensed milk', 5, null),
  ('Black Sesame Mochi Egg Tart', 'Glutinous rice flour', 30, null)
) as r(product, ingredient, qty, note)
join products p on p.name_en = r.product
join ingredients i on i.name = r.ingredient;

-- ============ Pickup locations & weekly slots ============
insert into pickup_locations (label_en, label_zh, address) values
  ('Timeless Tea parking lot (U District)', 'U District 茶千岁停车场', 'University District, Seattle'),
  ('SLU Nitro Parking Garage (South) · P1 elevator lobby', 'SLU Nitro Parking Garage (South) · P1 电梯间', 'South Lake Union, Seattle'),
  ('Bellevue T&T Supermarket parking lot', 'Bellevue 大统华停车场', 'Bellevue, WA');

insert into pickup_slots (day_of_week, start_time, end_time, location_id, cutoff_hour) values
  (5, '15:30', '16:00', (select id from pickup_locations where label_en like 'Timeless Tea%'), 21),
  (5, '16:30', '17:00', (select id from pickup_locations where label_en like 'SLU Nitro%'), 21),
  (6, '15:00', '15:30', (select id from pickup_locations where label_en like 'Bellevue%'), 21);

-- Packaging consumables (consumed per tart sold, not per recipe) + demo stock
insert into ingredients (name, purchase_qty, purchase_unit, purchase_cost, base_unit, base_qty, usage_per_tart) values
  ('Cupcake boxes (4-ct)', 1, '100-box case', 33.99, 'unit', 100, 0.25),
  ('Tart tins (foil)', 1, 'pack of 200', 12.99, 'unit', 200, 1)
on conflict (name) do nothing;
update ingredients set stock_qty = 18, stock_updated_at = now() where name = 'Eggs';
update ingredients set stock_qty = 30, stock_updated_at = now() where name = 'Cupcake boxes (4-ct)';
update ingredients set stock_qty = 3000, stock_updated_at = now() where name = 'Whole milk';

-- ============ Weekly production plan (custom steps) ============
insert into plan_steps (title, day_of_week, at_time, notes, sort_order) values
  ('Post preorder link', 2, '10:00', 'Instagram, WeChat, Xiaohongshu + website menu update', 1),
  ('Review orders & chase payments', 4, '09:00', 'Confirm Venmo screenshots, follow up unpaid orders', 2),
  ('Grocery run — all ingredients in', 4, '15:00', 'Use the Shop checklist', 3),
  ('Prep components', 4, '20:00', 'Mochi balls, lychee cream cheese mix, taro paste, purple rice', 4);

-- ============ Message templates ============
insert into message_templates (name, body_en, body_zh) values
  ('Order confirmation',
   'Hi {name}! Your Tart Theory order {order_num} is confirmed: {items}. Total {total}. Pickup {pickup_day} {pickup_time} at {pickup_place}. See you there! 🥧',
   '{name}你好！你的 Tart Theory 订单 {order_num} 已确认：{items}。合计 {total}。取货时间：{pickup_day} {pickup_time}，地点：{pickup_place}。到时见！🥧'),
  ('Pickup reminder',
   'Hi {name}, reminder: your Tart Theory pickup is today, {pickup_time} at {pickup_place}. Order {order_num}: {items}. Reply here if anything changes!',
   '{name}你好，提醒一下：你的蛋挞今天取货，时间 {pickup_time}，地点 {pickup_place}。订单 {order_num}：{items}。如有变动请告诉我们！'),
  ('Payment follow-up',
   'Hi {name}! Just checking in on order {order_num} ({total}) — we haven''t seen the Venmo payment yet. Orders are confirmed once paid. Venmo: {venmo_handle}. Thank you!',
   '{name}你好！你的订单 {order_num}（{total}）我们还没有收到 Venmo 付款。付款后订单即可确认。Venmo：{venmo_handle}。谢谢！'),
  ('Thanks & follow-up',
   'Thank you for picking up your order, {name}! Hope you enjoyed the tarts 💛 New flavors drop weekly at tart-theory.com — see you next week?',
   '{name}，谢谢惠顾！希望你喜欢这次的蛋挞 💛 每周都有新口味上架：tart-theory.com，下周见？');

-- ============ Week + test orders (from the Oct 23-24 sheet) ============
insert into weeks (week_label, start_date, status) values ('Oct 23-24', '2026-10-23', 'open');

insert into customers (name, venmo_name) values
  ('Customer 1', 'Customer 1'), ('Customer 2', 'Customer 2'), ('Customer 3', 'Customer 3'),
  ('Customer 4', 'Customer 4'), ('Customer 5', 'Customer 5'), ('Customer 6', 'Customer 6'),
  ('Customer 7', 'Customer 7'), ('Customer 8', 'Customer 8'), ('Customer 9', 'Customer 9'), ('Customer 10', 'Customer 10');

create or replace function _seed_order(
  p_num text, p_placed timestamptz, p_total numeric, p_received numeric,
  p_venmo text, p_day text, p_time text, p_place text, p_notes text default null
) returns uuid language plpgsql as $$
declare oid uuid;
begin
  insert into orders (order_num, source, customer_id, status, payment_status, total,
    amount_received, venmo_name, lang, week_label, pickup_day, pickup_time, pickup_place,
    placed_at, notes)
  values (p_num, 'webhook', (select id from customers where venmo_name = p_venmo),
    'confirmed', 'paid', p_total, p_received, p_venmo, 'zh', 'Oct 23-24',
    p_day, p_time, p_place, p_placed, p_notes)
  returning id into oid;
  return oid;
end $$;

create or replace function _seed_item(p_order uuid, p_qty int, p_name text, p_price numeric)
returns void language plpgsql as $$
begin
  insert into order_items (order_id, product_id, description, qty, unit_price)
  values (p_order,
    coalesce((select id from products where name_en = p_name),
             (select product_id from product_aliases where alias = p_name)),
    p_qty || 'x ' || p_name || ' ($' || p_price || ')', p_qty, p_price);
end $$;

do $$
declare o uuid;
begin
  o := _seed_order('TT-5342', '2026-10-20 14:33-07', 20, 19.52, 'Customer 1', 'Fri 10/23', '3:30–4:00 PM', 'Timeless Tea parking lot (U District)');
  perform _seed_item(o, 1, 'Matcha Red Bean Tart', 6);
  perform _seed_item(o, 1, 'Oreo Brownie Egg Tart', 6);
  perform _seed_item(o, 1, 'Purple Rice Taro Egg Tart', 6);
  perform _seed_item(o, 1, 'Black Sesame Mochi Tart', 6);

  o := _seed_order('TT-3984', '2026-10-18 11:17-07', 36, 36.00, 'Customer 2', 'Fri 10/23', '3:30–4:00 PM', 'Timeless Tea parking lot (U District)');
  perform _seed_item(o, 4, 'Original Portuguese Style', 4);
  perform _seed_item(o, 4, 'Lava Cheese Tart', 6);

  o := _seed_order('TT-2550', '2026-10-19 10:49-07', 40, 40.00, 'Customer 3', 'Fri 10/23', '4:30–5:00 PM', 'Nitro Parking Garage (South Lake Union)');
  perform _seed_item(o, 1, 'Lychee Cream Cheese Eggtart', 6);
  perform _seed_item(o, 1, 'Pork Floss Salted Egg Tart', 6);
  perform _seed_item(o, 1, 'Purple Rice Taro Egg Tart', 6);
  perform _seed_item(o, 1, 'Chestnut Egg Tart', 6);
  perform _seed_item(o, 1, 'Lava Chocolate Egg Tart', 6);
  perform _seed_item(o, 1, 'Soy Milk Mochi Egg Tart', 6);
  perform _seed_item(o, 1, 'Black Sesame Mochi Tart', 6);
  perform _seed_item(o, 1, 'Lava Cheese Tart', 6);

  o := _seed_order('TT-8103', '2026-10-21 09:56-07', 46, 45.03, 'Customer 4', 'Fri 10/23', '4:30–5:00 PM', 'SLU Nitro Parking Garage (South) · P1 elevator lobby');
  perform _seed_item(o, 1, 'Halloween Box of 6', 40);
  perform _seed_item(o, 1, 'Persimmon Egg Tart', 6);

  o := _seed_order('TT-7168', '2026-10-23 13:38-07', 20, 19.52, 'Customer 5', 'Sat 10/24', '3:00–3:30 PM', 'Bellevue T&T Supermarket parking lot');
  perform _seed_item(o, 3, 'Roasted Durian Egg Tart', 6);
  perform _seed_item(o, 1, 'Pork Floss Salted Egg Tart', 6);

  o := _seed_order('TT-1926', '2026-10-20 22:29-07', 20, 19.52, 'Customer 6', 'Sat 10/24', '3:00–3:30 PM', 'Bellevue T&T Supermarket parking lot');
  perform _seed_item(o, 4, 'Lychee Cream Cheese Egg Tart', 6);

  o := _seed_order('TT-6289', '2026-10-22 17:02-07', 20, 20.00, 'Customer 7', 'Sat 10/24', '3:00–3:30 PM', 'Bellevue T&T Supermarket parking lot');
  perform _seed_item(o, 1, 'Persimmon Egg Tart', 6);
  perform _seed_item(o, 1, 'Chestnut Egg Tart', 6);
  perform _seed_item(o, 1, 'Corn Egg Tart', 6);
  perform _seed_item(o, 1, 'Purple Rice Taro Egg Tart', 6);

  o := _seed_order('TT-5583', '2026-10-22 17:22-07', 20, 20.00, 'Customer 8', 'Sat 10/24', '3:00–3:30 PM', 'Bellevue T&T Supermarket parking lot');
  perform _seed_item(o, 1, 'Persimmon Egg Tart', 6);
  perform _seed_item(o, 1, 'Corn Egg Tart', 6);
  perform _seed_item(o, 1, 'Pork Floss Salted Egg Tart', 6);
  perform _seed_item(o, 1, 'Classic Portuguese Egg Tart', 4);

  o := _seed_order('TT-4672', '2026-10-20 22:30-07', 26, 25.41, 'Customer 9', 'Sat 10/24', '3:00–3:30 PM', 'Bellevue T&T Supermarket parking lot', 'use the 6 pack box');
  perform _seed_item(o, 1, 'Persimmon Egg Tart', 6);
  perform _seed_item(o, 1, 'Chestnut Egg Tart', 6);
  perform _seed_item(o, 1, 'Corn Egg Tart', 6);
  perform _seed_item(o, 1, 'Osmanthus Rice Wine Egg Tart', 6);
  perform _seed_item(o, 1, 'Tiramisu Egg Tart', 6);

  o := _seed_order('TT-8890', '2026-10-22 15:35-07', 40, 39.14, 'Customer 10', 'Sat 10/24', '3:00–3:30 PM', 'Bellevue T&T Supermarket parking lot');
  perform _seed_item(o, 1, 'Persimmon Egg Tart', 6);
  perform _seed_item(o, 1, 'Corn Egg Tart', 6);
  perform _seed_item(o, 1, 'Osmanthus Rice Wine Egg Tart', 6);
  perform _seed_item(o, 1, 'Roasted Durian Egg Tart', 6);
  perform _seed_item(o, 1, 'Lychee Cream Cheese Egg Tart', 6);
  perform _seed_item(o, 1, 'Purple Rice Taro Egg Tart', 6);
  perform _seed_item(o, 1, 'Black Sesame Mochi Egg Tart', 6);
  perform _seed_item(o, 1, 'Pork Floss Salted Egg Tart', 6);
end $$;

drop function _seed_order(text, timestamptz, numeric, numeric, text, text, text, text, text);
drop function _seed_item(uuid, int, text, numeric);

-- ============ Full ingredient library + recipes for every flavor ============
-- (from the cost tracker; prices are estimates to refine from receipts)

insert into ingredients (name, purchase_qty, purchase_unit, purchase_cost, base_unit, base_qty) values
  ('Mascarpone', 1, '8 oz tub', 5.49, 'g', 227),
  ('Instant coffee powder', 1, '3 oz jar', 4.99, 'g', 85),
  ('Cocoa powder', 1, '8 oz tin', 3.99, 'g', 227),
  ('Taro', 1, 'lb', 2.49, 'g', 454),
  ('Purple rice', 1, '2 lb bag', 5.99, 'g', 907),
  ('Purple sweet potato powder', 1, '100 g bag', 6.99, 'g', 100),
  ('Lychee (canned, drained)', 1, '20 oz can', 3.49, 'g', 250),
  ('Dried rose petals', 1, '50 g bag', 5.99, 'g', 50),
  ('Chestnut pieces (cooked)', 1, '100 g pack', 3.99, 'g', 100),
  ('Pork floss', 1, '8 oz bag', 8.99, 'g', 227),
  ('Salted egg yolks', 1, 'pack of 6', 6.99, 'unit', 6),
  ('Chocolate chips', 1, '12 oz bag', 3.99, 'g', 340),
  ('Red bean paste', 1, '500 g tub', 4.99, 'g', 500),
  ('Matcha powder', 1, '100 g tin', 9.99, 'g', 100),
  ('Jiuniang (sweet fermented rice)', 1, '500 g jar', 4.99, 'g', 500),
  ('Osmanthus honey', 1, '250 g jar', 7.99, 'g', 250),
  ('Mochi balls', 1, 'pack of 30', 4.99, 'unit', 30),
  ('Soy milk powder', 1, 'bag (6 tarts)', 9.99, 'unit', 1),
  ('Soy flour (kinako)', 1, '200 g bag', 3.49, 'g', 200),
  ('Durian (frozen)', 1, 'lb', 9.99, 'g', 454),
  ('Persimmon', 1, 'each', 1.50, 'unit', 1),
  ('Oreo cookies', 1, 'family pack (36)', 4.49, 'unit', 36)
on conflict (name) do nothing;

-- Per-batch recipes (batch yields match the products table / cost sheet).
insert into product_ingredients (product_id, ingredient_id, qty_base, note)
select p.id, i.id, r.qty, r.note from (values
  ('Tiramisu Egg Tart', 'Mascarpone', 25, null),
  ('Tiramisu Egg Tart', 'Heavy cream', 12.5, null),
  ('Tiramisu Egg Tart', 'Instant coffee powder', 2, null),
  ('Tiramisu Egg Tart', 'Sugar', 2, null),
  ('Tiramisu Egg Tart', 'Cocoa powder', 1, 'dusting'),
  ('Purple Rice Taro Egg Tart', 'Taro', 380, 'taro paste'),
  ('Purple Rice Taro Egg Tart', 'Sugar', 28, null),
  ('Purple Rice Taro Egg Tart', 'Condensed milk', 33, 'paste 10 + rice 23'),
  ('Purple Rice Taro Egg Tart', 'Purple sweet potato powder', 3, null),
  ('Purple Rice Taro Egg Tart', 'Whole milk', 110, null),
  ('Purple Rice Taro Egg Tart', 'Butter', 26, 'paste 18 + rice 8'),
  ('Purple Rice Taro Egg Tart', 'Purple rice', 120, null),
  ('Lychee Cream Cheese Egg Tart', 'Lychee (canned, drained)', 35, 'whole 15 + diced 20'),
  ('Lychee Cream Cheese Egg Tart', 'Cream cheese', 25, null),
  ('Lychee Cream Cheese Egg Tart', 'Dried rose petals', 1, 'garnish'),
  ('Chestnut Egg Tart', 'Chestnut pieces (cooked)', 20, '~4 pcs'),
  ('Chestnut Egg Tart', 'Heavy cream', 10, 'whipped'),
  ('Pork Floss Salted Egg Tart', 'Salted egg yolks', 0.5, null),
  ('Pork Floss Salted Egg Tart', 'Pork floss', 5, null),
  ('Lava Chocolate Egg Tart', 'Chocolate chips', 10, '~8 pcs'),
  ('Lava Chocolate Egg Tart', 'Cocoa powder', 2, null),
  ('Matcha Red Bean Tart', 'Red bean paste', 30, null),
  ('Matcha Red Bean Tart', 'Matcha powder', 1, null),
  ('Osmanthus Rice Wine Egg Tart', 'Jiuniang (sweet fermented rice)', 15, null),
  ('Osmanthus Rice Wine Egg Tart', 'Mochi balls', 3, null),
  ('Osmanthus Rice Wine Egg Tart', 'Osmanthus honey', 5, null),
  ('Soy Milk Mochi Egg Tart', 'Soy milk powder', 1, '1 bag = 6 tarts'),
  ('Soy Milk Mochi Egg Tart', 'Mochi balls', 18, '3 per tart'),
  ('Soy Milk Mochi Egg Tart', 'Soy flour (kinako)', 18, 'dusting, 3 g per tart'),
  ('Roasted Durian Egg Tart', 'Durian (frozen)', 25, null),
  ('Persimmon Egg Tart', 'Persimmon', 1, '1 fruit = 4 tarts'),
  ('Oreo Brownie Egg Tart', 'Oreo cookies', 2, null),
  ('Oreo Brownie Egg Tart', 'Whole milk', 10, null)
) as r(product, ingredient, qty, note)
join products p on p.name_en = r.product
join ingredients i on i.name = r.ingredient
on conflict (product_id, ingredient_id) do nothing;


commit;
