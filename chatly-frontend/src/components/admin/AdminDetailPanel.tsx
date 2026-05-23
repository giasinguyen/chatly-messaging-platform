import type { ReactNode } from "react";
import { X } from "lucide-react";

interface AdminDetailPanelProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AdminDetailPanel({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: AdminDetailPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {subtitle && (
                <p className="mt-1 break-all text-xs font-medium text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close details"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-800"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="border-t border-slate-100 px-6 py-4">{footer}</footer>
        )}
      </aside>
    </div>
  );
}
