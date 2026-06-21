import { supabase, InventoryProduct, InventoryMovement, InventoryRecipeItem, MovementType } from '@/lib/supabase';

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

export async function fetchRecipeItems(dishProductId: string): Promise<InventoryRecipeItem[]> {
  const { data, error } = await supabase
    .from('inventory_recipe_items')
    .select('*')
    .eq('dish_product_id', dishProductId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as InventoryRecipeItem[];
}

export async function addRecipeItem(
  dishProductId: string,
  ingredientProductId: string,
  quantityPerUnit: number
): Promise<InventoryRecipeItem> {
  const { data, error } = await supabase
    .from('inventory_recipe_items')
    .insert({
      dish_product_id: dishProductId,
      ingredient_product_id: ingredientProductId,
      quantity_per_unit: quantityPerUnit,
    })
    .select()
    .single();
  if (error) throw error;
  return data as InventoryRecipeItem;
}

export async function removeRecipeItem(recipeItemId: string): Promise<void> {
  const { error } = await supabase.from('inventory_recipe_items').delete().eq('id', recipeItemId);
  if (error) throw error;
}

// Atomically applies the dish's own depletion plus each ingredient's
// (already-resolved, possibly overridden) quantity via apply_recipe_depletion —
// see sql/inventory_recipes.sql. If any single insert would go negative, the
// whole call rolls back, nothing partial gets applied.
export async function applyRecipeDepletion(
  dishProductId: string,
  dishQuantity: number,
  reason: string | null,
  ingredients: Array<{ product_id: string; quantity: number }>
): Promise<void> {
  const { error } = await supabase.rpc('apply_recipe_depletion', {
    p_dish_product_id: dishProductId,
    p_dish_quantity: dishQuantity,
    p_reason: reason ?? 'Χρήση',
    p_ingredients: ingredients,
  });
  if (error) throw error;
}
