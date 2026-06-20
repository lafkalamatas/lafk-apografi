import { supabase, InventoryProduct, InventoryMovement, MovementType } from '@/lib/supabase';

export async function fetchProducts(includeInactive = false): Promise<InventoryProduct[]> {
  let query = supabase.from('inventory_products').select('*').order('name');
  if (!includeInactive) {
    query = query.eq('active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InventoryProduct[];
}

export async function fetchProduct(id: string): Promise<InventoryProduct> {
  const { data, error } = await supabase.from('inventory_products').select('*').eq('id', id).single();
  if (error) throw error;
  return data as InventoryProduct;
}

export async function createProduct(input: {
  name: string;
  category: string | null;
  unit: string;
  reference_price: number | null;
  low_stock_threshold: number | null;
  notes: string | null;
}): Promise<InventoryProduct> {
  const { data, error } = await supabase.from('inventory_products').insert(input).select().single();
  if (error) throw error;
  return data as InventoryProduct;
}

export async function updateProduct(
  id: string,
  input: {
    name: string;
    category: string | null;
    unit: string;
    reference_price: number | null;
    low_stock_threshold: number | null;
    notes: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from('inventory_products').update(input).eq('id', id);
  if (error) throw error;
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('inventory_products').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function fetchMovements(productId?: string, limit = 200): Promise<InventoryMovement[]> {
  let query = supabase
    .from('inventory_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (productId) {
    query = query.eq('product_id', productId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InventoryMovement[];
}

// The DB trigger computes the new quantity_on_hand and resulting_quantity —
// this never sends a computed quantity, only the raw movement.
export async function createMovement(input: {
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reason?: string | null;
}): Promise<InventoryMovement> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('inventory_movements')
    .insert({
      product_id: input.product_id,
      movement_type: input.movement_type,
      quantity: input.quantity,
      reason: input.reason ?? null,
      created_by: userData.user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as InventoryMovement;
}

export function isLowStock(product: InventoryProduct): boolean {
  return product.low_stock_threshold != null && product.quantity_on_hand <= product.low_stock_threshold;
}
