'use client';

import type { ReactNode } from 'react';

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
};

export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  rowClassName,
}: {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  if (rows.length === 0) {
    return (
      <div className="app-card overflow-hidden">
        <p className="px-4 py-8 text-center text-[#8a8578] text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: real table */}
      <div className="app-card overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e3d6] text-left text-xs text-[#8a8578]">
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-2.5 ${col.className ?? ''}`}>
                  {col.headerHidden ? '' : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e3d6]">
            {rows.map((row) => (
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

      {/* Mobile: stacked cards */}
      <div className="app-card overflow-hidden divide-y divide-[#e8e3d6] sm:hidden">
        {rows.map((row) => (
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
    </>
  );
}
