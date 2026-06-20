'use client';

import { useEffect, useState } from 'react';
import type { InventoryProduct, InventoryRecipeItem } from '@/lib/supabase';
import { addRecipeItem, removeRecipeItem } from '@/lib/inventory';

export function RecipeEditor({
  dishProduct,
  recipeItems,
  allProducts,
  onChanged,
}: {
  dishProduct: InventoryProduct;
  recipeItems: InventoryRecipeItem[];
  allProducts: InventoryProduct[];
  onChanged: () => void;
}) {
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIngredientId('');
    setQuantity('');
    setError('');
  }, [recipeItems.length]);

  const productsById = new Map(allProducts.map((p) => [p.id, p]));
  const linkedIds = new Set(recipeItems.map((r) => r.ingredient_product_id));
  const availableIngredients = allProducts.filter((p) => p.id !== dishProduct.id && !linkedIds.has(p.id));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(quantity);
    if (!ingredientId) {
      setError('Επιλέξτε πρώτη ύλη.');
      return;
    }
    if (!quantity || isNaN(value) || value <= 0) {
      setError('Δώστε έναν έγκυρο, θετικό αριθμό.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addRecipeItem(dishProduct.id, ingredientId, value);
      onChanged();
    } catch (err: any) {
      setError(err?.message ?? 'Κάτι πήγε στραβά.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(recipeItemId: string) {
    await removeRecipeItem(recipeItemId);
    onChanged();
  }

  return (
    <div className="app-card p-5">
      <h2 className="text-sm font-medium text-[#2c2a24] mb-1">Συνταγή</h2>
      <p className="text-xs text-[#8a8578] mb-3">
        Πρώτες ύλες που αφαιρούνται αυτόματα κάθε φορά που καταγράφεται χρήση 1 {dishProduct.unit} από αυτό το
        προϊόν.
      </p>

      {recipeItems.length > 0 && (
        <ul className="divide-y divide-[#e8e3d6] mb-3">
          {recipeItems.map((item) => {
            const ingredient = productsById.get(item.ingredient_product_id);
            return (
              <li key={item.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-[#2c2a24]">{ingredient?.name ?? '—'}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#5a5750]">
                    {item.quantity_per_unit} {ingredient?.unit ?? ''}
                  </span>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Αφαίρεση
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {availableIngredients.length > 0 ? (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <select
            value={ingredientId}
            onChange={(e) => setIngredientId(e.target.value)}
            className="px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
          >
            <option value="">Επιλέξτε πρώτη ύλη...</option>
            {availableIngredients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Ποσότητα ανά μονάδα"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-40 px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-lg text-sm bg-gold-400 text-military-700 font-medium hover:bg-gold-300 transition-colors disabled:opacity-50"
          >
            Προσθήκη
          </button>
        </form>
      ) : (
        <p className="text-xs text-[#8a8578]">Δεν υπάρχουν άλλα προϊόντα διαθέσιμα για σύνδεση.</p>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
