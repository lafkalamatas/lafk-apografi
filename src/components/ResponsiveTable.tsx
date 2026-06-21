'use client';

import { useMemo, useState, type ReactNode } from 'react';

export type ResponsiveColumn<T> = {
  /** Column header, also used as the field label in the mobile card layout. */
  header: string;
  /** Renders the cell content for a given row. */
  cell: (row: T) => ReactNode;
  /** Extra classes for the desktop <td> / <th>. */
  className?: string;
  /**
   * Hide the header text on desktop (e.g. an actions column) and omit the
   * field label in the mobile card.
   */
  headerHidden?: boolean;
  /**
   * On mobile, render this field full-width without a label (e.g. a title or
   * an action button) instead of as a label/value row.
   */
  mobileFullWidth?: boolean;
  /**
   * Makes the column sortable. Return the comparable value for a row
   * (string → locale-aware, number → numeric).
   */
  sortValue?: (row: T) => string | number;
};

type SortState = { index: number; dir: 'asc' | 'desc' };

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'el', { numeric: true });
}

export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  rowClassName,
  defaultSort,
}: {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
  rowClassName?: (row: T) => string | undefined;
  /** Initial sort, referencing a sortable column by its index. */
  defaultSort?: { index: number; dir?: 'asc' | 'desc' };
}) {
  const [sort, setSort] = useState<SortState | null>(
    defaultSort ? { index: defaultSort.index, dir: defaultSort.dir ?? 'asc' } : null
  );

  const sortableColumns = columns
    .map((col, index) => ({ col, index }))
    .filter((entry) => entry.col.sortValue);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns[sort.index];
    if (!col?.sortValue) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => factor * compareValues(col.sortValue!(a), col.sortValue!(b)));
  }, [rows, sort, columns]);

  function toggleSort(index: number) {
    setSort((prev) =>
      prev && prev.index === index
        ? { index, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { index, dir: 'asc' }
    );
  }

  if (rows.length === 0) {
    return (
      <div className="app-card overflow-hidden">
        <p className="px-4 py-8 text-center text-[#8a8578] text-sm">{emptyMessage}</p>
      </div>
    );
  }

  function sortIndicator(index: number) {
    if (!sort || sort.index !== index) return '↕';
    return sort.dir === 'asc' ? '↑' : '↓';
  }

  return (
    <>
      {/* Desktop: real table */}
      <div className="app-card overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e3d6] text-left text-xs text-[#8a8578]">
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-2.5 font-medium ${col.className ?? ''}`}>
                  {col.headerHidden ? (
                    ''
                  ) : col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(i)}
                      className="inline-flex items-center gap-1 hover:text-[#2c2a24] transition-colors"
                    >
                      {col.header}
                      <span className={sort?.index === i ? 'text-gold-600' : 'text-[#c9c4b5]'}>
                        {sortIndicator(i)}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e3d6]">
            {sortedRows.map((row) => (
              <tr key={getRowKey(row)} className={rowClassName?.(row)}>
                {columns.map((col, i) => (
                  <td key={i} className={`px-4 py-2.5 ${col.className ?? ''}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: sort control + stacked cards */}
      <div className="sm:hidden">
        {sortableColumns.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-[#8a8578] shrink-0">Ταξινόμηση</label>
            <select
              value={sort ? sort.index : ''}
              onChange={(e) =>
                setSort(e.target.value === '' ? null : { index: Number(e.target.value), dir: sort?.dir ?? 'asc' })
              }
              className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#e8e3d6] rounded-lg text-sm text-[#2c2a24] focus:outline-none focus:border-[#c4a94d]"
            >
              <option value="">—</option>
              {sortableColumns.map(({ col, index }) => (
                <option key={index} value={index}>
                  {col.header}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSort((prev) => (prev ? { ...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : prev))}
              disabled={!sort}
              aria-label="Αλλαγή κατεύθυνσης ταξινόμησης"
              className="shrink-0 px-3 py-2 rounded-lg border border-[#e8e3d6] text-sm text-[#5a5750] hover:bg-[#f0ece0] transition-colors disabled:opacity-40"
            >
              {sort?.dir === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        )}
        <div className="app-card overflow-hidden divide-y divide-[#e8e3d6]">
          {sortedRows.map((row) => (
            <div key={getRowKey(row)} className={`p-4 space-y-2 ${rowClassName?.(row) ?? ''}`}>
              {columns.map((col, i) =>
                col.mobileFullWidth || col.headerHidden ? (
                  <div key={i}>{col.cell(row)}</div>
                ) : (
                  <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-xs text-[#8a8578] shrink-0">{col.header}</span>
                    <span className="text-right">{col.cell(row)}</span>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
