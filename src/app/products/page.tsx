'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { fetchProducts, isLowStock } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import type { InventoryProduct } from '@/lib/supabase';

export default function ProductsPage() {
  const { authenticated, loading: authLoading } = useAuthGuard();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryProduct | null>(null);

  const fetchData = useCallback(async (includeInactive: boolean) => {
    const data = await fetchProducts(includeInactive);
    setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) fetchData(showInactive);
  }, [authenticated, showInactive, fetchData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.category ?? '').toLowerCase().includes(term)
    );
  }, [products, search]);

  function handleExport() {
    const rows = filtered.map((p) => ({
      Όνομα: p.name,
      Κατηγορία: p.category ?? '',
      Μονάδα: p.unit,
      Ποσότητα: p.quantity_on_hand,
      'Τιμή αναφοράς': p.reference_price ?? '',
      'Όριο χαμηλού αποθέματος': p.low_stock_threshold ?? '',
      Κατάσταση: p.active ? 'Ενεργό' : 'Ανενεργό',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Προϊόντα');
    XLSX.writeFile(wb, `apografi-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (authLoading || !authenticated) return null;

  return (
    <div className="app-page">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="app-heading text-2xl text-[#2c2a24]">Προϊόντα</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="border border-[#e8e3d6] text-[#5a5750] px-3 py-2 rounded-lg text-sm hover:bg-[#f0ece0] transition-colors"
            >
              Εξαγωγή Excel
            </button>
            <Link
              href="/products/new"
              className="bg-gold-400 text-military-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gold-300 transition-colors"
            >
              Προσθήκη Προϊόντος
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Αναζήτηση..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d] w-full sm:w-64"
          />
          <label className="flex items-center gap-2 text-sm text-[#5a5750]">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Εμφάνιση ανενεργών
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-[#8a8578]">Φόρτωση...</p>
        ) : (
          <div className="app-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e3d6] text-left text-xs text-[#8a8578]">
                  <th className="px-4 py-2.5">Όνομα</th>
                  <th className="px-4 py-2.5">Κατηγορία</th>
                  <th className="px-4 py-2.5">Απόθεμα</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e3d6]">
                {filtered.map((product) => {
                  const lowStock = isLowStock(product);
                  return (
                    <tr key={product.id} className={!product.active ? 'opacity-50' : undefined}>
                      <td className="px-4 py-2.5">
                        <Link href={`/products/${product.id}`} className="text-[#2c2a24] hover:text-gold-600">
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-[#5a5750]">{product.category ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={lowStock ? 'text-red-500 font-medium' : 'text-[#2c2a24]'}>
                          {product.quantity_on_hand} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {product.active && (
                          <button
                            onClick={() => setAdjustingProduct(product)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-[#e8e3d6] text-[#5a5750] hover:bg-[#f0ece0] transition-colors"
                          >
                            Προσαρμογή
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#8a8578] text-sm">
                      Δεν βρέθηκαν προϊόντα.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSaved={() => fetchData(showInactive)}
        />
      )}
    </div>
  );
}
