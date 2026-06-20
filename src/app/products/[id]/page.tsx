'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { fetchProduct, fetchMovements, isLowStock } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import type { InventoryProduct, InventoryMovement } from '@/lib/supabase';

const MOVEMENT_LABEL: Record<string, string> = {
  in: 'Παραλαβή',
  out: 'Χρήση/Φύρα',
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
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  const fetchData = useCallback(async () => {
    const [productData, movementsData] = await Promise.all([
      fetchProduct(params.id),
      fetchMovements(params.id, 20),
    ]);
    setProduct(productData);
    setMovements(movementsData);
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

        <h2 className="text-sm font-medium text-[#2c2a24] mb-3">Πρόσφατες κινήσεις</h2>
        <div className="app-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e3d6] text-left text-xs text-[#8a8578]">
                <th className="px-4 py-2.5">Ημερομηνία</th>
                <th className="px-4 py-2.5">Τύπος</th>
                <th className="px-4 py-2.5">Ποσότητα</th>
                <th className="px-4 py-2.5">Υπόλοιπο</th>
                <th className="px-4 py-2.5">Αιτία</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e3d6]">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-[#5a5750]">{formatDateTime(m.created_at)}</td>
                  <td className="px-4 py-2.5 text-[#2c2a24]">{MOVEMENT_LABEL[m.movement_type]}</td>
                  <td className="px-4 py-2.5 text-[#2c2a24]">{m.quantity}</td>
                  <td className="px-4 py-2.5 text-[#2c2a24]">{m.resulting_quantity}</td>
                  <td className="px-4 py-2.5 text-[#5a5750]">{m.reason ?? '—'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#8a8578] text-sm">
                    Δεν υπάρχουν κινήσεις ακόμα.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {adjusting && (
        <StockAdjustModal
          product={product}
          onClose={() => setAdjusting(false)}
          onSaved={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
