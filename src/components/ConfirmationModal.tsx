import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemDetails?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  itemDetails,
  confirmLabel,
  cancelLabel,
  isDangerous = true,
  onConfirm,
  onCancel,
}) => {
  const { t } = useThemeLanguage();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-slate-900 border border-emerald-800/80 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-emerald-900/60">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${isDangerous ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              {title || t('নিশ্চিতকরণ প্রয়োজন', 'Confirmation Required')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-2">
          <p className="text-sm font-medium text-slate-200">
            {message || t('আপনি কি নিশ্চিতভাবে এই আইটেমটি মুছে ফেলতে চান? এটি খতিয়ান ও ক্যাশ খাতায় প্রভাব ফেলবে।', 'Are you sure you want to delete this item? This will affect Khotiyan and Cash ledger.')}
          </p>
          {itemDetails && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-900/80 rounded-xl text-xs text-amber-300 font-mono">
              {itemDetails}
            </div>
          )}
          <p className="text-xs text-slate-400">
            {t('এই পদক্ষেপটি বাতিল করা সম্ভব নয়। সংশ্লিষ্ট লেজার হিসাব স্বয়ংক্রিয়ভাবে পুনর্গণনা করা হবে।', 'This action cannot be undone. Relevant ledgers will automatically recalculate.')}
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-emerald-900/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
          >
            {cancelLabel || t('বাতিল', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5 active:scale-95 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmLabel || t('হ্যাঁ, মুছে ফেলুন', 'Yes, Delete')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
