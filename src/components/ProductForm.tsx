'use client';

import { useState } from 'react';
import type { InventoryProduct } from '@/lib/supabase';

const UNIT_OPTIONS = ['μερίδα', 'τεμάχιο', 'γραμμάριο', 'κιλό', 'λίτρο', 'κιβώτιο'];

export type ProductFormValues = {
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: string;
  notes: string;
};

function toFormValues(product?: InventoryProduct): ProductFormValues {
  return {
    name: product?.name ?? '',
    category: product?.category ?? '',
    unit: product?.unit ?? 'μερίδα',
    low_stock_threshold: product?.low_stock_threshold != null ? String(product.low_stock_threshold) : '',
    notes: product?.notes ?? '',
  };
}

export function ProductForm({
  product,
  saving,
  onSubmit,
  submitLabel,
}: {
  product?: InventoryProduct;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: {
    name: string;
    category: string | null;
    unit: string;
    low_stock_threshold: number | null;
    notes: string | null;
  }) => void | Promise<void>;
}) {
  const [values, setValues] = useState<ProductFormValues>(() => toFormValues(product));
  const [error, setError] = useState('');

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Το όνομα είναι υποχρεωτικό.');
      return;
    }
    setError('');
    await onSubmit({
      name: values.name.trim(),
      category: values.category.trim() || null,
      unit: values.unit,
      low_stock_threshold: values.low_stock_threshold ? Number(values.low_stock_threshold) : null,
      notes: values.notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="app-card p-5 space-y-4">
      <div>
        <label className="block text-xs text-[#8a8578] mb-1.5">Όνομα προϊόντος *</label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#8a8578] mb-1.5">Κατηγορία</label>
          <input
            type="text"
            value={values.category}
            onChange={(e) => update('category', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#8a8578] mb-1.5">Μονάδα</label>
          <select
            value={values.unit}
            onChange={(e) => update('unit', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#8a8578] mb-1.5">Όριο χαμηλού αποθέματος</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={values.low_stock_threshold}
          onChange={(e) => update('low_stock_threshold', e.target.value)}
          className="w-full px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
        />
      </div>

      <div>
        <label className="block text-xs text-[#8a8578] mb-1.5">Σημειώσεις</label>
        <textarea
          value={values.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
        />
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-gold-400 text-military-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-300 transition-colors disabled:opacity-50"
      >
        {saving ? 'Αποθήκευση...' : submitLabel}
      </button>
    </form>
  );
}
