'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { fetchProducts, isLowStock } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import { ResponsiveTable } from '@/components/ResponsiveTable';
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
          <ResponsiveTable
            rows={filtered}
            getRowKey={(product) => product.id}
            emptyMessage="Δεν βρέθηκαν προϊόντα."
            rowClassName={(product) => (!product.active ? 'opacity-50' : undefined)}
            defaultSort={{ index: 0, dir: 'asc' }}
            columns={[
              {
                header: 'Όνομα',
                mobileFullWidth: true,
                sortValue: (product) => product.name,
                cell: (product) => (
                  <Link href={`/products/${product.id}`} className="text-[#2c2a24] hover:text-gold-600 font-medium">
                    {product.name}
                  </Link>
                ),
              },
              {
                header: 'Κατηγορία',
                className: 'text-[#5a5750]',
                sortValue: (product) => product.category ?? '',
                cell: (product) => product.category ?? '—',
              },
              {
                header: 'Απόθεμα',
                sortValue: (product) => product.quantity_on_hand,
                cell: (product) => (
                  <span className={isLowStock(product) ? 'text-red-500 font-medium' : 'text-[#2c2a24]'}>
                    {product.quantity_on_hand} {product.unit}
                  </span>
                ),
              },
              {
                header: 'Ενέργειες',
                headerHidden: true,
                mobileFullWidth: true,
                className: 'text-right',
                cell: (product) =>
                  product.active ? (
                    <button
                      onClick={() => setAdjustingProduct(product)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[#e8e3d6] text-[#5a5750] hover:bg-[#f0ece0] transition-colors w-full sm:w-auto"
                    >
                      Προσαρμογή
                    </button>
                  ) : null,
              },
            ]}
          />
        )}
      </main>

      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          ingredientProducts={products}
          onClose={() => setAdjustingProduct(null)}
          onSaved={() => fetchData(showInactive)}
        />
      )}
    </div>
  );
}
