'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { fetchMovements, fetchProducts } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import type { InventoryMovement, InventoryProduct, MovementType } from '@/lib/supabase';

const MOVEMENT_LABEL: Record<MovementType, string> = {
  in: 'Παραλαβή',
  out: 'Χρήση',
  adjustment: 'Διόρθωση',
};

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MovementsPage() {
  const { authenticated, loading: authLoading } = useAuthGuard();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<MovementType | ''>('');
  const [filterProductId, setFilterProductId] = useState('');

  const fetchData = useCallback(async () => {
    const [movementsData, productsData] = await Promise.all([fetchMovements(undefined, 500), fetchProducts(true)]);
    setMovements(movementsData);
    setProducts(productsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  const productsById = useMemo(() => {
    const map = new Map<string, InventoryProduct>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (filterType && m.movement_type !== filterType) return false;
      if (filterProductId && m.product_id !== filterProductId) return false;
      return true;
    });
  }, [movements, filterType, filterProductId]);

  function handleExport() {
    const rows = filtered.map((m) => ({
      Ημερομηνία: formatDateTime(m.created_at),
      Προϊόν: productsById.get(m.product_id)?.name ?? m.product_id,
      Τύπος: MOVEMENT_LABEL[m.movement_type],
      Ποσότητα: m.quantity,
      Υπόλοιπο: m.resulting_quantity,
      Αιτία: m.reason ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Κινήσεις');
    XLSX.writeFile(wb, `kiniseis-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (authLoading || !authenticated) return null;

  return (
    <div className="app-page">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="app-heading text-2xl text-[#2c2a24]">Ιστορικό Κινήσεων</h1>
          <button
            onClick={handleExport}
            className="border border-[#e8e3d6] text-[#5a5750] px-3 py-2 rounded-lg text-sm hover:bg-[#f0ece0] transition-colors"
          >
            Εξαγωγή Excel
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
          >
            <option value="">Όλα τα προϊόντα</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MovementType | '')}
            className="px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
          >
            <option value="">Όλοι οι τύποι</option>
            <option value="in">Παραλαβή</option>
            <option value="out">Χρήση</option>
            <option value="adjustment">Διόρθωση</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[#8a8578]">Φόρτωση...</p>
        ) : (
          <div className="app-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e3d6] text-left text-xs text-[#8a8578]">
                  <th className="px-4 py-2.5">Ημερομηνία</th>
                  <th className="px-4 py-2.5">Προϊόν</th>
                  <th className="px-4 py-2.5">Τύπος</th>
                  <th className="px-4 py-2.5">Ποσότητα</th>
                  <th className="px-4 py-2.5">Υπόλοιπο</th>
                  <th className="px-4 py-2.5">Αιτία</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e3d6]">
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5 text-[#5a5750]">{formatDateTime(m.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/products/${m.product_id}`} className="text-[#2c2a24] hover:text-gold-600">
                        {productsById.get(m.product_id)?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-[#2c2a24]">{MOVEMENT_LABEL[m.movement_type]}</td>
                    <td className="px-4 py-2.5 text-[#2c2a24]">{m.quantity}</td>
                    <td className="px-4 py-2.5 text-[#2c2a24]">{m.resulting_quantity}</td>
                    <td className="px-4 py-2.5 text-[#5a5750]">{m.reason ?? '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#8a8578] text-sm">
                      Δεν βρέθηκαν κινήσεις.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
