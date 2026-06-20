-- Digital inventory (απογραφή) for the restaurant side.
-- Lives in the same Supabase project as the website, but is a separate domain:
-- no foreign keys into menu_items / psita_items, so renaming/deleting a menu
-- item on the website can never break inventory data.

CREATE TABLE inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'μερίδα',
  reference_price NUMERIC(8,2),
  quantity_on_hand NUMERIC(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(10,2),
  source_menu_item_id UUID,
  source_psita_item_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_products_active ON inventory_products(active);
CREATE INDEX idx_inventory_products_category ON inventory_products(category);

-- Append-only ledger. Rows are never updated or deleted (see RLS below) —
-- mistakes are fixed with a new compensating movement, not by rewriting history.
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity NUMERIC(10,2) NOT NULL,
  resulting_quantity NUMERIC(10,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id, created_at DESC);

-- Maintains inventory_products.quantity_on_hand from inserted movements so
-- every page that lists products can read a single column instead of summing
-- the ledger on every request. 'in' adds, 'out' subtracts, 'adjustment' sets
-- the absolute total (the digital equivalent of a physical recount).
-- FOR UPDATE locks the product row so two concurrent adjustments can't race.
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  current_qty NUMERIC(10,2);
  new_qty NUMERIC(10,2);
BEGIN
  SELECT quantity_on_hand INTO current_qty
  FROM inventory_products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF NEW.movement_type = 'in' THEN
    new_qty := current_qty + NEW.quantity;
  ELSIF NEW.movement_type = 'out' THEN
    new_qty := current_qty - NEW.quantity;
  ELSE
    new_qty := NEW.quantity;
  END IF;

  IF new_qty < 0 THEN
    RAISE EXCEPTION 'Stock cannot go negative for product %', NEW.product_id;
  END IF;

  UPDATE inventory_products
  SET quantity_on_hand = new_qty, updated_at = now()
  WHERE id = NEW.product_id;

  NEW.resulting_quantity := new_qty;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_apply ON inventory_movements;
CREATE TRIGGER inventory_movements_apply
BEFORE INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Staff-only tool end to end — unlike the website's public menu tables,
-- nothing here is ever exposed to anonymous/public requests.
CREATE POLICY "Authenticated can read products" ON inventory_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage products" ON inventory_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read movements" ON inventory_movements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert movements" ON inventory_movements
  FOR INSERT TO authenticated WITH CHECK (true);
-- Deliberately no UPDATE/DELETE policy on inventory_movements: enforces the
-- append-only/compensating-entry rule at the database level, not just by app convention.
