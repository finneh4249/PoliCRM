import { Search, RefreshCw, Download, Zap, Calendar } from "lucide-react";

interface QuickActionsProps {
  selectedCount: number;
  onCheckSelected: () => void;
  onRetryCaptchas: () => void;
  onExport: () => void;
  onExportAll: () => void;
  onBulkActions: () => void;
  onReminders: () => void;
  refreshTimer: string;
}

export function QuickActions({
  selectedCount,
  onCheckSelected,
  onRetryCaptchas,
  onExport,
  onExportAll,
  onBulkActions,
  onReminders,
}: QuickActionsProps) {
  const buttonBase = "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onCheckSelected}
        disabled={selectedCount === 0}
        className={`${buttonBase} bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Search className="w-4 h-4" />
        Check ({selectedCount})
      </button>

      <button
        onClick={onRetryCaptchas}
        className={`${buttonBase} bg-orange-500/15 text-orange-400 hover:bg-orange-500/25`}
      >
        <RefreshCw className="w-4 h-4" />
        Retry Captchas
      </button>

      <button
        onClick={onExport}
        className={`${buttonBase} bg-green-500/15 text-green-400 hover:bg-green-500/25`}
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      <button
        onClick={onExportAll}
        className={`${buttonBase} bg-secondary text-muted-foreground hover:bg-secondary/80`}
      >
        <Download className="w-4 h-4" />
        Export All
      </button>

      <button
        onClick={onBulkActions}
        disabled={selectedCount === 0}
        className={`${buttonBase} bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Zap className="w-4 h-4" />
        Bulk
      </button>

      <button
        onClick={onReminders}
        className={`${buttonBase} bg-amber-500/15 text-amber-400 hover:bg-amber-500/25`}
      >
        <Calendar className="w-4 h-4" />
        Reminders
      </button>
    </div>
  );
}
