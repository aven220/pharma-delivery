import { X } from 'lucide-react';
import { useToastStore } from '@/store/toast.store';

const styles = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${styles[item.type]}`}
          role="status"
        >
          <span className="flex-1">{item.message}</span>
          <button
            type="button"
            className="rounded p-0.5 opacity-70 hover:opacity-100"
            onClick={() => dismiss(item.id)}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
