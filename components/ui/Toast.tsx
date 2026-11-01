'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type?: 'error' | 'success' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export function showToast(toast: Omit<ToastItem, 'id'>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          ...toast,
          id: Math.random().toString(36).substring(2, 9),
        },
      })
    );
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;

      const newToast: ToastItem = {
        id: customEvent.detail.id || Math.random().toString(36).substring(2, 9),
        type: customEvent.detail.type || 'error',
        title: customEvent.detail.title,
        message: customEvent.detail.message,
        duration: customEvent.detail.duration ?? 6000,
      };

      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast', handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <aside 
      aria-label="Notificações do sistema"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-md px-4 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-xl p-4 shadow-xl border flex items-start gap-3 backdrop-blur-md ${
                isError
                  ? 'bg-red-50/95 border-red-200 text-red-900'
                  : isSuccess
                  ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50/95 border-slate-200 text-slate-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isError && <AlertCircle className="w-5 h-5 text-red-600" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {!isError && !isSuccess && <Info className="w-5 h-5 text-blue-600" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm leading-relaxed font-medium">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className={`shrink-0 p-1 rounded-lg transition-colors ${
                  isError
                    ? 'text-red-500 hover:bg-red-100 hover:text-red-800'
                    : isSuccess
                    ? 'text-emerald-500 hover:bg-emerald-100 hover:text-emerald-800'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
}
