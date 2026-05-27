import { useState, useEffect } from "react";
import { systemApi } from "../services/api";
import { RefreshCw, Monitor, Database, Globe, Zap } from "lucide-react";

interface WorkerStatus {
  status: string;
  member_id: number | null;
  member_name: string | null;
  type: "era" | "browser";
}

interface QueueStatus {
  era_queue_size: number;
  browser_queue_size: number;
  queued_items: number[];
  workers: Record<string, WorkerStatus>;
  pool_size: number;
  era_workers: number;
  browser_workers: number;
}

export default function Queue() {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await systemApi.getQueueStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch queue status:", err);
      setError("Failed to fetch queue status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg font-medium">{error}</div>
          <button
            onClick={fetchStatus}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Separate workers by type
  const eraWorkers = Object.entries(status?.workers || {}).filter(
    ([, w]) => w.type === "era"
  );
  const browserWorkers = Object.entries(status?.workers || {}).filter(
    ([, w]) => w.type === "browser"
  );
  
  const activeEraWorkers = eraWorkers.filter(([, w]) => w.status !== "idle").length;
  const activeBrowserWorkers = browserWorkers.filter(([, w]) => w.status !== "idle").length;
  
  const totalQueueSize = (status?.era_queue_size || 0) + (status?.browser_queue_size || 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Verification Queue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Split architecture: Fast ERA lookups → Slow browser fallback
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* ERA Queue */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">ERA Queue</div>
              <div className="text-xl font-bold text-foreground">{status?.era_queue_size || 0}</div>
            </div>
          </div>
        </div>

        {/* Browser Queue */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Browser Queue</div>
              <div className="text-xl font-bold text-foreground">{status?.browser_queue_size || 0}</div>
            </div>
          </div>
        </div>

        {/* Active Workers */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full stat-icon-purple flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Active</div>
              <div className="text-xl font-bold text-foreground">
                {activeEraWorkers + activeBrowserWorkers}
                <span className="text-sm text-muted-foreground font-normal ml-1">
                  / {status?.pool_size || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              totalQueueSize > 0
                ? "stat-icon-green"
                : "bg-muted text-muted-foreground"
            }`}>
              <RefreshCw className={`w-5 h-5 ${totalQueueSize > 0 ? "animate-spin" : ""}`} />
            </div>
            <div>
              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Status</div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    totalQueueSize > 0
                      ? "bg-green-400 animate-pulse"
                      : "bg-muted-foreground"
                  }`}
                ></div>
                <span className="text-base font-semibold text-foreground">
                  {totalQueueSize > 0 ? "Processing" : "Idle"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ERA Workers Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            ERA Workers
          </h2>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Fast • Parallel
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {eraWorkers.map(([name, worker]) => {
            const isIdle = worker.status === "idle";
            const displayNum = name.replace("era_", "");

            return (
              <div
                key={name}
                className={`card p-4 transition-all ${
                  isIdle ? "" : "border-emerald-500/30 ring-1 ring-emerald-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isIdle
                          ? "bg-secondary text-muted-foreground"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      E{displayNum}
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">ERA {displayNum}</div>
                      <div
                        className={`text-xs ${
                          isIdle ? "text-muted-foreground" : "text-emerald-400 font-medium"
                        }`}
                      >
                        {isIdle ? "Idle" : "Checking"}
                      </div>
                    </div>
                  </div>
                  {!isIdle && (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-400 border-t-transparent"></div>
                  )}
                </div>

                {worker.status !== "idle" ? (
                  <div className="bg-secondary rounded-lg p-2 text-xs">
                    <div className="font-medium text-foreground truncate">{worker.member_name}</div>
                    <div className="text-muted-foreground font-mono">ID: {worker.member_id}</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">Waiting...</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Browser Worker Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Browser Worker
          </h2>
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
            Rate Limited • Anti-CAPTCHA
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {browserWorkers.map(([name, worker]) => {
            const isIdle = worker.status === "idle";

            return (
              <div
                key={name}
                className={`card p-5 transition-all ${
                  isIdle ? "" : "border-amber-500/30 ring-1 ring-amber-500/20"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isIdle
                          ? "bg-secondary text-muted-foreground"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Browser Fallback</div>
                      <div
                        className={`text-xs ${
                          isIdle ? "text-muted-foreground" : "text-amber-400 font-medium"
                        }`}
                      >
                        {isIdle ? "Idle • Waiting for ERA failures" : "Verifying via AEC Website"}
                      </div>
                    </div>
                  </div>
                  {!isIdle && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400 border-t-transparent"></div>
                  )}
                </div>

                {worker.status !== "idle" ? (
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Currently checking:</div>
                    <div className="font-medium text-foreground">{worker.member_name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      ID: {worker.member_id}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Only processes members that fail ERA matching...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Queue List */}
      {status?.queued_items && status.queued_items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">All Queued Jobs</h3>
            <span className="text-sm text-muted-foreground">{status.queued_items.length} pending</span>
          </div>
          <div className="divide-y divide-border max-h-60 overflow-y-auto">
            {status.queued_items.slice(0, 50).map((id, index) => (
              <div
                key={id}
                className="px-5 py-2.5 flex items-center gap-3 text-sm hover:bg-secondary/50 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">
                  Member: <span className="font-mono text-foreground font-medium">{id}</span>
                </span>
              </div>
            ))}
            {status.queued_items.length > 50 && (
              <div className="px-5 py-2.5 text-sm text-muted-foreground italic">
                ...and {status.queued_items.length - 50} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

