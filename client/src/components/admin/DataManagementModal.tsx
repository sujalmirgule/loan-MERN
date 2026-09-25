import React, { useState } from 'react';
import {
  AlertTriangle,
  Archive,
  RefreshCw,
  Trash2,
  X,
  Lock,
  Info,
} from 'lucide-react';

export type ManagementActionType = 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'CANCEL' | 'DEACTIVATE' | 'REACTIVATE';

export interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  actionType: ManagementActionType;
  title: string;
  description: string;
  itemCount: number;
  itemNames?: string[];
  warningMessage?: string;
  requireTypedConfirmation?: boolean;
  confirmTextRequired?: string;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  title,
  description,
  itemCount,
  itemNames = [],
  warningMessage,
  requireTypedConfirmation = false,
  confirmTextRequired = 'DELETE',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getActionConfig = () => {
    switch (actionType) {
      case 'DELETE':
        return {
          icon: <Trash2 className="w-6 h-6 text-red-500" />,
          badgeBg: 'bg-red-500/10 text-red-500 border-red-500/20',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20',
          label: itemCount > 1 ? `Permanently Delete ${itemCount} Records` : 'Permanently Delete Record',
          defaultWarning: 'This action is permanent and cannot be undone. Selected database records and related unlinked assets will be removed.',
        };
      case 'ARCHIVE':
      case 'DEACTIVATE':
      case 'CANCEL':
        return {
          icon: <Archive className="w-6 h-6 text-amber-500" />,
          badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20',
          label: itemCount > 1 ? `Archive / Deactivate ${itemCount} Records` : 'Archive / Deactivate Record',
          defaultWarning: 'Historical financial, KYC, and application records will be preserved for compliance audit while disabling active access.',
        };
      case 'RESTORE':
      case 'REACTIVATE':
        return {
          icon: <RefreshCw className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20',
          label: itemCount > 1 ? `Restore ${itemCount} Records` : 'Restore Record',
          defaultWarning: 'Restoring access will reactivate selected records into active operational workflows.',
        };
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-500" />,
          badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20',
          label: 'Confirm Action',
          defaultWarning: 'Please confirm your action.',
        };
    }
  };

  const config = getActionConfig();
  const isTypeMatched = !requireTypedConfirmation || typedInput.trim().toUpperCase() === confirmTextRequired.toUpperCase();

  const handleConfirmClick = async () => {
    if (!isTypeMatched || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Action failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${config.badgeBg}`}>
              {config.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
              <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${config.badgeBg}`}>
                {itemCount} {itemCount === 1 ? 'Record Selected' : 'Records Selected'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-sm text-slate-300 leading-relaxed">{description}</p>

          {/* Affected Item Preview Pill */}
          {itemNames.length > 0 && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
              <span className="font-semibold text-slate-400">Affected items:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {itemNames.slice(0, 5).map((name, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-300 rounded-md truncate max-w-[200px]">
                    {name}
                  </span>
                ))}
                {itemNames.length > 5 && (
                  <span className="px-2 py-1 bg-slate-800/60 text-slate-400 rounded-md">
                    +{itemNames.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start space-x-3">
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>{warningMessage || config.defaultWarning}</p>
          </div>

          {/* Require Typed Confirmation Input */}
          {requireTypedConfirmation && (
            <div className="pt-2 space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                To confirm permanent deletion, type <span className="font-mono font-bold text-red-400">{confirmTextRequired}</span> below:
              </label>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={`Type "${confirmTextRequired}" here`}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!isTypeMatched || isSubmitting}
            className={`flex items-center space-x-2 px-5 py-2.5 text-sm font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${config.btnBg}`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{config.label}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
