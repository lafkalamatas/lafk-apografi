'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { createProduct } from '@/lib/inventory';
import { AppHeader } from '@/components/AppHeader';
import { ProductForm } from '@/components/ProductForm';

export default function NewProductPage() {
  const { authenticated, loading: authLoading } = useAuthGuard();
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (authLoading || !authenticated) return null;

  return (
    <div className="app-page">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <h1 className="app-heading text-2xl text-[#2c2a24] mb-6">Νέο Προϊόν</h1>
        <ProductForm
          saving={saving}
          submitLabel="Δημιουργία"
          onSubmit={async (values) => {
            setSaving(true);
            const product = await createProduct(values);
            router.push(`/products/${product.id}`);
          }}
        />
      </main>
    </div>
  );
}
