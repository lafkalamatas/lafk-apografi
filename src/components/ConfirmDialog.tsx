'use client';

export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Visual tone of the confirm button. Defaults to 'danger'. */
  confirmTone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
} | null;

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmDialogState;
  onClose: () => void;
}) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
      <div className="app-card p-5 w-full max-w-sm shadow-lg">
        <h2 className="app-heading text-lg text-[#2c2a24] mb-1">{state.title}</h2>
        <p className="text-sm text-[#5a5750] mb-5">{state.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm text-[#5a5750] hover:bg-[#f0ece0] transition-colors"
          >
            Άκυρο
          </button>
          <button
            type="button"
            onClick={async () => {
              await state.onConfirm();
              onClose();
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              state.confirmTone === 'primary'
                ? 'bg-gold-400 text-military-700 hover:bg-gold-300'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {state.confirmLabel ?? 'Επιβεβαίωση'}
          </button>
        </div>
      </div>
    </div>
  );
}
