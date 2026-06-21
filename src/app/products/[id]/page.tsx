'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { fetchProduct, fetchProducts, fetchMovements, fetchRecipeItems, isLowStock } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import { RecipeEditor } from '@/components/RecipeEditor';
import { ResponsiveTable } from '@/components/ResponsiveTable';
import type { InventoryProduct, InventoryMovement, InventoryRecipeItem } from '@/lib/supabase';

const MOVEMENT_LABEL: Record<string, string> = {
  in: 'Παραλαβή',
  out: 'Χρήση',
  adjustment: 'Διόρθωση',
};

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ProductDetailPage() {
  const { authenticated, loading: authLoading } = useAuthGuard();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [allProducts, setAllProducts] = useState<InventoryProduct[]>([]);
  const [recipeItems, setRecipeItems] = useState<InventoryRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  const fetchData = useCallback(async () => {
    const [productData, movementsData, productsData, recipeData] = await Promise.all([
      fetchProduct(params.id),
      fetchMovements(params.id, 20),
      fetchProducts(),
      fetchRecipeItems(params.id),
    ]);
    setProduct(productData);
    setMovements(movementsData);
    setAllProducts(productsData);
    setRecipeItems(recipeData);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  if (authLoading || !authenticated) return null;
  if (loading || !product) {
    return (
      <div className="app-page">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-sm text-[#8a8578]">Φόρτωση...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="app-heading text-2xl text-[#2c2a24]">{product.name}</h1>
            {product.category && <p className="text-sm text-[#8a8578]">{product.category}</p>}
          </div>
          <Link
            href={`/products/${product.id}/edit`}
            className="border border-[#e8e3d6] text-[#5a5750] px-3 py-2 rounded-lg text-sm hover:bg-[#f0ece0] transition-colors"
          >
            Επεξεργασία
          </Link>
        </div>

        <div className="app-card p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8a8578] mb-1">Τρέχον απόθεμα</p>
            <p className={`text-2xl font-medium ${isLowStock(product) ? 'text-red-500' : 'text-[#2c2a24]'}`}>
              {product.quantity_on_hand} {product.unit}
            </p>
          </div>
          <button
            onClick={() => setAdjusting(true)}
            className="bg-gold-400 text-military-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-300 transition-colors"
          >
            Προσαρμογή Αποθέματος
          </button>
        </div>

        {product.notes && (
          <div className="app-card p-5 mb-6">
            <p className="text-xs text-[#8a8578] mb-1">Σημειώσεις</p>
            <p className="text-sm text-[#2c2a24]">{product.notes}</p>
          </div>
        )}

        <div className="mb-6">
          <RecipeEditor
            dishProduct={product}
            recipeItems={recipeItems}
            allProducts={allProducts}
            onChanged={fetchData}
          />
        </div>

        <h2 className="text-sm font-medium text-[#2c2a24] mb-3">Πρόσφατες κινήσεις</h2>
        <ResponsiveTable
          rows={movements}
          getRowKey={(m) => m.id}
          emptyMessage="Δεν υπάρχουν κινήσεις ακόμα."
          columns={[
            { header: 'Ημερομηνία', className: 'text-[#5a5750]', cell: (m) => formatDateTime(m.created_at) },
            { header: 'Τύπος', className: 'text-[#2c2a24]', cell: (m) => MOVEMENT_LABEL[m.movement_type] },
            { header: 'Ποσότητα', className: 'text-[#2c2a24]', cell: (m) => m.quantity },
            { header: 'Υπόλοιπο', className: 'text-[#2c2a24]', cell: (m) => m.resulting_quantity },
            { header: 'Αιτία', className: 'text-[#5a5750]', cell: (m) => m.reason ?? '—' },
          ]}
        />
      </main>

      {adjusting && (
        <StockAdjustModal
          product={product}
          recipeItems={recipeItems}
          ingredientProducts={allProducts}
          onClose={() => setAdjusting(false)}
          onSaved={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
