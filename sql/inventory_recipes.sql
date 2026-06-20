-- Recipe-based ingredient depletion. Incremental migration — run AFTER
-- inventory_schema.sql (and after the seed script has populated
-- inventory_products), against the same project.
--
-- Model: raw ingredients ("(Α' Ύλη)" products, tracked in grams) are shared
-- across many sellable μερίδα products. A "recipe" is a flat list of
-- (sellable product) -> (raw ingredient, grams per one unit) — a recipe
-- never points at another sellable product, so depletion stays one level
-- deep. Serving N units of a sellable product inserts its own 'out'
-- movement AND an 'out' movement per recipe ingredient, scaled by N,
-- atomically (see apply_recipe_depletion below).

CREATE TABLE inventory_recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  ingredient_product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE RESTRICT,
  quantity_per_unit NUMERIC(10,2) NOT NULL CHECK (quantity_per_unit > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (dish_product_id, ingredient_product_id)
);

CREATE INDEX idx_inventory_recipe_items_dish ON inventory_recipe_items(dish_product_id);

ALTER TABLE inventory_recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read recipes" ON inventory_recipe_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage recipes" ON inventory_recipe_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Atomically applies a dish's own depletion plus its (already-resolved,
-- possibly overridden) ingredient quantities in one transaction. If any
-- single insert would push a product negative, apply_inventory_movement()'s
-- existing check raises and the WHOLE call rolls back — nothing partial.
-- Runs as the calling user (no SECURITY DEFINER), so RLS and
-- created_by = auth.uid() behave exactly like any other client insert.
CREATE OR REPLACE FUNCTION apply_recipe_depletion(
  p_dish_product_id UUID,
  p_dish_quantity NUMERIC,
  p_reason TEXT,
  p_ingredients JSONB -- [{ "product_id": "...", "quantity": 170 }, ...]
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  item JSONB;
BEGIN
  INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, created_by)
  VALUES (p_dish_product_id, 'out', p_dish_quantity, p_reason, auth.uid());

  FOR item IN SELECT * FROM jsonb_array_elements(p_ingredients) LOOP
    IF (item->>'quantity')::numeric > 0 THEN
      INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, created_by)
      VALUES (
        (item->>'product_id')::uuid,
        'out',
        (item->>'quantity')::numeric,
        'Αυτόματη αφαίρεση (συνταγή: ' || p_reason || ')',
        auth.uid()
      );
    END IF;
  END LOOP;
END;
$$;

-- ── Seed example: 4 raw-ingredient products + one worked recipe ─────────
-- Everything else (coffee drinks' gram amounts, other dishes' πατάτες/ρύζι
-- sides) is intentionally left for manual entry via the app's new Recipe
-- section — only real recipe quantities belong here, and this script
-- doesn't know them beyond the one example given.
DO $$
DECLARE
  potatoes_id UUID;
  rice_id UUID;
  vegetables_id UUID;
  coffee_beans_id UUID;
  brizola_id UUID;
BEGIN
  INSERT INTO inventory_products (name, category, unit, quantity_on_hand, active)
  VALUES ('Πατάτες (Α'' Ύλη)', 'Πρώτες Ύλες', 'γραμμάριο', 0, true)
  RETURNING id INTO potatoes_id;

  INSERT INTO inventory_products (name, category, unit, quantity_on_hand, active)
  VALUES ('Ρύζι (Α'' Ύλη)', 'Πρώτες Ύλες', 'γραμμάριο', 0, true)
  RETURNING id INTO rice_id;

  INSERT INTO inventory_products (name, category, unit, quantity_on_hand, active)
  VALUES ('Λαχανικά (Α'' Ύλη)', 'Πρώτες Ύλες', 'γραμμάριο', 0, true)
  RETURNING id INTO vegetables_id;

  INSERT INTO inventory_products (name, category, unit, quantity_on_hand, active)
  VALUES ('Καφές σε Κόκκους (Α'' Ύλη)', 'Πρώτες Ύλες', 'γραμμάριο', 0, true)
  RETURNING id INTO coffee_beans_id;

  SELECT id INTO brizola_id FROM inventory_products WHERE name = 'Χοιρινή Μπριζόλα' LIMIT 1;

  IF brizola_id IS NOT NULL THEN
    INSERT INTO inventory_recipe_items (dish_product_id, ingredient_product_id, quantity_per_unit) VALUES
      (brizola_id, potatoes_id, 170),
      (brizola_id, rice_id, 70),
      (brizola_id, vegetables_id, 40);
  ELSE
    RAISE NOTICE 'Δεν βρέθηκε προϊόν "Χοιρινή Μπριζόλα" — η συνταγή παραδείγματος παραλείφθηκε. Δημιουργήστε τη σύνδεση χειροκίνητα από το UI.';
  END IF;
END;
$$;
