'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { fetchProduct, updateProduct, setProductActive } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import { ProductForm } from '@/components/ProductForm';
import { ConfirmDialog, ConfirmDialogState } from '@/components/ConfirmDialog';
import type { InventoryProduct } from '@/lib/supabase';

export default function EditProductPage() {
  const { authenticated, loading: authLoading } = useAuthGuard();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState>(null);

  const fetchData = useCallback(async () => {
    const data = await fetchProduct(params.id);
    setProduct(data);
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
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <p className="text-sm text-[#8a8578]">Φόρτωση...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="app-heading text-2xl text-[#2c2a24]">Επεξεργασία Προϊόντος</h1>
          {product.active ? (
            <button
              onClick={() =>
                setConfirmState({
                  title: 'Αφαίρεση προϊόντος',
                  message: `Το "${product.name}" θα κρυφτεί από τη λίστα προϊόντων. Το ιστορικό κινήσεων θα παραμείνει.`,
                  confirmLabel: 'Αφαίρεση',
                  onConfirm: async () => {
                    await setProductActive(product.id, false);
                    router.push('/products');
                  },
                })
              }
              className="text-sm text-red-500 hover:text-red-600"
            >
              Αφαίρεση
            </button>
          ) : (
            <button
              onClick={() =>
                setConfirmState({
                  title: 'Επαναφορά προϊόντος',
                  message: `Το "${product.name}" θα εμφανιστεί ξανά στη λίστα προϊόντων.`,
                  confirmLabel: 'Επαναφορά',
                  confirmTone: 'primary',
                  onConfirm: async () => {
                    await setProductActive(product.id, true);
                    router.push(`/products/${product.id}`);
                  },
                })
              }
              className="text-sm text-gold-600 hover:text-gold-700"
            >
              Επαναφορά
            </button>
          )}
        </div>
        <ProductForm
          product={product}
          saving={saving}
          submitLabel="Αποθήκευση"
          onSubmit={async (values) => {
            setSaving(true);
            await updateProduct(product.id, values);
            router.push(`/products/${product.id}`);
          }}
        />
      </main>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
