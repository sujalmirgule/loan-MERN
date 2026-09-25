import React from 'react';
import { Archive, Trash2, RefreshCw, X, CheckSquare } from 'lucide-react';

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onArchiveSelected?: () => void;
  onRestoreSelected?: () => void;
  onDeleteSelected?: () => void;
  archiveLabel?: string;
  restoreLabel?: string;
  deleteLabel?: string;
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  }>;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onArchiveSelected,
  onRestoreSelected,
  onDeleteSelected,
  archiveLabel = 'Archive Selected',
  restoreLabel = 'Restore Selected',
  deleteLabel = 'Delete Selected',
  customActions = [],
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-4 z-40 mb-4 p-4 bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-xl backdrop-blur-md animate-in slide-in-from-top duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Indicator */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-100 text-sm">
                {selectedCount} {selectedCount === 1 ? 'record selected' : 'records selected'}
              </span>
              <span className="text-xs text-slate-400">
                (out of {totalCount} visible)
              </span>
            </div>
            <p className="text-xs text-slate-400">Choose a safe batch management action</p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {customActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}

          {onRestoreSelected && (
            <button
              onClick={onRestoreSelected}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition border border-emerald-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{restoreLabel}</span>
            </button>
          )}

          {onArchiveSelected && (
            <button
              onClick={onArchiveSelected}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition border border-amber-500/30"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{archiveLabel}</span>
            </button>
          )}

          {onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition border border-red-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleteLabel}</span>
            </button>
          )}

          <button
            onClick={onClearSelection}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
