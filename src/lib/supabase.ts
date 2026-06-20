import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type InventoryProduct = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  reference_price: number | null;
  quantity_on_hand: number;
  low_stock_threshold: number | null;
  source_menu_item_id: string | null;
  source_psita_item_id: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MovementType = 'in' | 'out' | 'adjustment';

export type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  resulting_quantity: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type InventoryRecipeItem = {
  id: string;
  dish_product_id: string;
  ingredient_product_id: string;
  quantity_per_unit: number;
  created_at: string;
};
