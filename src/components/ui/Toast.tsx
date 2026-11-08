import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
            info: <Info className="w-5 h-5 text-blue-400 shrink-0" />
          };

          const borders = {
            success: 'border-emerald-500/30 bg-slate-900/95 text-emerald-200',
            warning: 'border-amber-500/30 bg-slate-900/95 text-amber-200',
            error: 'border-red-500/30 bg-slate-900/95 text-red-200',
            info: 'border-blue-500/30 bg-slate-900/95 text-blue-200'
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center justify-between gap-3 w-full max-w-sm px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md ${borders[toast.type]}`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {icons[toast.type]}
                <span className="text-sm font-medium text-slate-100 truncate">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
