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
    refreshTimer
}: QuickActionsProps) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-6">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-700 mr-2">
                    Quick Actions:
                </span>

                <button
                    onClick={onCheckSelected}
                    disabled={selectedCount === 0}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span>🔍</span> Check Selected ({selectedCount})
                </button>

                <button
                    onClick={onRetryCaptchas}
                    className="bg-orange-50 text-orange-600 hover:bg-orange-100 px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                >
                    <span>🔄</span> Retry Captchas
                </button>

                <button
                    onClick={onExport}
                    className="bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                >
                    <span>📊</span> Export Selected
                </button>

                <button
                    onClick={onExportAll}
                    className="bg-slate-50 text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                >
                    <span>📥</span> Export All
                </button>

                <button
                    onClick={onBulkActions}
                    disabled={selectedCount === 0}
                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span>⚡</span> Bulk Actions
                </button>

                <button
                    onClick={onReminders}
                    className="bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                >
                    <span>📅</span> Reminders
                </button>

                <div className="flex-grow"></div>

                <span className="text-xs text-slate-500">
                    Auto-refresh: {refreshTimer}
                </span>
            </div>
        </div>
    );
}
