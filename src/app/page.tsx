'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { fetchProducts, fetchMovements, isLowStock } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import type { InventoryProduct, InventoryMovement } from '@/lib/supabase';

export default function DashboardPage() {
  const { authenticated, loading: authLoading } = useAuthGuard();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [productsData, movementsData] = await Promise.all([fetchProducts(), fetchMovements(undefined, 50)]);
    setProducts(productsData);
    setMovements(movementsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  if (authLoading || !authenticated) return null;

  const lowStockProducts = products.filter(isLowStock);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysMovements = movements.filter((m) => m.created_at.startsWith(todayStr));

  return (
    <div className="app-page">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="app-heading text-2xl text-[#2c2a24] mb-6">Πίνακας</h1>

        {loading ? (
          <p className="text-sm text-[#8a8578]">Φόρτωση...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="app-card p-4">
                <p className="text-xs text-[#8a8578] mb-1">Ενεργά προϊόντα</p>
                <p className="text-2xl font-medium text-[#2c2a24]">{products.length}</p>
              </div>
              <div className="app-card p-4">
                <p className="text-xs text-[#8a8578] mb-1">Χαμηλό απόθεμα</p>
                <p className="text-2xl font-medium text-[#2c2a24]">{lowStockProducts.length}</p>
              </div>
              <div className="app-card p-4">
                <p className="text-xs text-[#8a8578] mb-1">Κινήσεις σήμερα</p>
                <p className="text-2xl font-medium text-[#2c2a24]">{todaysMovements.length}</p>
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <div className="app-card p-5 mb-8">
                <h2 className="text-sm font-medium text-[#2c2a24] mb-3">Χαμηλό απόθεμα</h2>
                <ul className="divide-y divide-[#e8e3d6]">
                  {lowStockProducts.map((product) => (
                    <li key={product.id} className="py-2 flex items-center justify-between text-sm">
                      <Link href={`/products/${product.id}`} className="text-[#2c2a24] hover:text-gold-600">
                        {product.name}
                      </Link>
                      <span className="text-red-500">
                        {product.quantity_on_hand} {product.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href="/products"
                className="bg-gold-400 text-military-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-300 transition-colors"
              >
                Προϊόντα
              </Link>
              <Link
                href="/movements"
                className="border border-[#e8e3d6] text-[#5a5750] px-4 py-2 rounded-lg text-sm hover:bg-[#f0ece0] transition-colors"
              >
                Ιστορικό κινήσεων
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
