'use client';

import { useEffect, useState } from 'react';
import type { InventoryProduct, InventoryRecipeItem, MovementType } from '@/lib/supabase';
import { createMovement, applyRecipeDepletion, fetchRecipeItems, fetchProducts } from '@/lib/inventory';

const REASON_SUGGESTIONS: Record<'in' | 'out', string[]> = {
  in: ['Παραλαβή'],
  out: ['Χρήση', 'Φύρα/Απώλεια'],
};

export function StockAdjustModal({
  product,
  recipeItems: recipeItemsProp,
  ingredientProducts: ingredientProductsProp,
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  recipeItems?: InventoryRecipeItem[];
  ingredientProducts?: InventoryProduct[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'delta' | 'absolute'>('delta');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [recipeItems, setRecipeItems] = useState<InventoryRecipeItem[]>(recipeItemsProp ?? []);
  const [ingredientProducts, setIngredientProducts] = useState<InventoryProduct[]>(ingredientProductsProp ?? []);
  const [ingredientQuantities, setIngredientQuantities] = useState<Record<string, string>>({});

  // Only fetch what the caller didn't already provide (product detail page
  // already has both in state; the products list page only has the product
  // list, so this fetches just the recipe items in that case).
  useEffect(() => {
    if (recipeItemsProp !== undefined) return;
    fetchRecipeItems(product.id).then(setRecipeItems);
  }, [product.id, recipeItemsProp]);

  useEffect(() => {
    if (ingredientProductsProp !== undefined) return;
    fetchProducts().then(setIngredientProducts);
  }, [ingredientProductsProp]);

  const hasRecipe = recipeItems.length > 0;
  const showRecipePreview = mode === 'delta' && direction === 'out' && hasRecipe;

  // Recomputes every recipe line from the recipe defaults whenever the dish
  // quantity changes — keeps the common case (no override) zero-effort. Any
  // line a user has edited gets reset too if they change the dish quantity
  // again; they can just re-edit, a deliberate simplification.
  useEffect(() => {
    if (!showRecipePreview) return;
    const dishQty = Number(quantity) || 0;
    const next: Record<string, string> = {};
    recipeItems.forEach((item) => {
      next[item.ingredient_product_id] = dishQty > 0 ? String(item.quantity_per_unit * dishQty) : '';
    });
    setIngredientQuantities(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, recipeItems, showRecipePreview]);

  const ingredientsById = new Map(ingredientProducts.map((p) => [p.id, p]));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(quantity);
    if (!quantity || isNaN(value) || value <= 0) {
      setError('Δώστε έναν έγκυρο, θετικό αριθμό.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (showRecipePreview) {
        const ingredients = recipeItems.map((item) => ({
          product_id: item.ingredient_product_id,
          quantity: Number(ingredientQuantities[item.ingredient_product_id]) || 0,
        }));
        await applyRecipeDepletion(product.id, value, reason.trim() || null, ingredients);
      } else {
        const movement_type: MovementType = mode === 'absolute' ? 'adjustment' : direction;
        await createMovement({
          product_id: product.id,
          movement_type,
          quantity: value,
          reason: reason.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Κάτι πήγε στραβά.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
      <div className="app-card p-5 w-full max-w-sm shadow-lg">
        <h2 className="app-heading text-lg text-[#2c2a24] mb-1">{product.name}</h2>
        <p className="text-xs text-[#8a8578] mb-4">
          Τρέχον απόθεμα: {product.quantity_on_hand} {product.unit}
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('delta')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              mode === 'delta' ? 'bg-gold-50 text-gold-600 font-medium' : 'text-[#5a5750] hover:bg-[#f0ece0]'
            }`}
          >
            +/- Ποσότητα
          </button>
          <button
            type="button"
            onClick={() => setMode('absolute')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              mode === 'absolute' ? 'bg-gold-50 text-gold-600 font-medium' : 'text-[#5a5750] hover:bg-[#f0ece0]'
            }`}
          >
            Διόρθωση σε...
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'delta' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('in')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  direction === 'in'
                    ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                    : 'border-[#e8e3d6] text-[#5a5750]'
                }`}
              >
                + Παραλαβή
              </button>
              <button
                type="button"
                onClick={() => setDirection('out')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  direction === 'out'
                    ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                    : 'border-[#e8e3d6] text-[#5a5750]'
                }`}
              >
                - Χρήση/Φύρα
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#8a8578] mb-1.5">
              {mode === 'absolute' ? `Νέο σύνολο (${product.unit})` : `Ποσότητα (${product.unit})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
            />
          </div>

          {showRecipePreview && (
            <div className="border border-[#e8e3d6] rounded-lg p-3">
              <p className="text-xs text-[#8a8578] mb-2">
                Αυτόματη αφαίρεση πρώτων υλών (μπορείτε να τις προσαρμόσετε για αυτή τη φορά):
              </p>
              <div className="space-y-2">
                {recipeItems.map((item) => {
                  const ingredient = ingredientsById.get(item.ingredient_product_id);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[#2c2a24]">{ingredient?.name ?? '—'}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ingredientQuantities[item.ingredient_product_id] ?? ''}
                          onChange={(e) =>
                            setIngredientQuantities((prev) => ({
                              ...prev,
                              [item.ingredient_product_id]: e.target.value,
                            }))
                          }
                          className="w-20 px-2 py-1 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
                        />
                        <span className="text-xs text-[#8a8578]">{ingredient?.unit ?? ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#8a8578] mb-1.5">Αιτία (προαιρετικό)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              list="reason-suggestions"
              className="w-full px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
            />
            <datalist id="reason-suggestions">
              {(mode === 'absolute' ? ['Διορθωτική απογραφή'] : REASON_SUGGESTIONS[direction]).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm text-[#5a5750] hover:bg-[#f0ece0] transition-colors"
            >
              Άκυρο
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm bg-gold-400 text-military-700 font-medium hover:bg-gold-300 transition-colors disabled:opacity-50"
            >
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
