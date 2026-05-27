import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { useNavigate } from "react-router-dom";
import { $stats, fetchStats } from "../stores/statsStore";
import { statsApi } from "../services/api";
import { updateFilters } from "../stores/membersStore";

// Widgets
import { QueueWidget } from "../components/widgets/QueueWidget";
import { EraStatusWidget } from "../components/widgets/EraStatusWidget";
import { ActionCenterWidget } from "../components/widgets/ActionCenterWidget";
import { MiniMapWidget } from "../components/widgets/MiniMapWidget";
import { HouseholdWidget } from "../components/widgets/HouseholdWidget";

// Icons
import {
  Search,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const stats = useStore($stats);
  const [activity, setActivity] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingActivity, setLoadingActivity] = useState(true);

  const fetchActivity = async () => {
    try {
      const data = await statsApi.getActivity(10);
      setActivity(data);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchActivity();

    const interval = setInterval(() => {
      fetchStats();
      fetchActivity();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      updateFilters({ search: searchTerm });
      navigate("/members");
    }
  };

  const verifiedPercent = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Campaign overview and quick actions</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80 pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="w-5 h-5" />
          </div>
        </form>
      </div>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5 flex items-center hover:border-border/80 transition-colors">
          <div className="w-12 h-12 rounded-lg stat-icon-blue flex items-center justify-center mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Total Contacts</div>
            <div className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</div>
          </div>
        </div>

        <div className="card p-5 flex items-center hover:border-border/80 transition-colors">
          <div className="w-12 h-12 rounded-lg stat-icon-green flex items-center justify-center mr-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Verified</div>
            <div className="text-2xl font-bold text-foreground">{stats.verified.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
              <TrendingUp className="w-3 h-3" />
              {verifiedPercent}% rate
            </div>
          </div>
        </div>

        <div className="card p-5 flex items-center hover:border-border/80 transition-colors">
          <div className="w-12 h-12 rounded-lg stat-icon-amber flex items-center justify-center mr-4">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-foreground">{stats.unchecked.toLocaleString()}</div>
          </div>
        </div>

        <div className="card p-5 flex items-center hover:border-border/80 transition-colors">
          <div className="w-12 h-12 rounded-lg stat-icon-red flex items-center justify-center mr-4">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold text-foreground">{stats.failed.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Column 1: Action Center & Queue */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="flex-none">
            <ActionCenterWidget />
          </div>
          <div className="flex-1 min-h-[250px]">
            <QueueWidget />
          </div>
          <div className="flex-1 min-h-[200px]">
            <EraStatusWidget />
          </div>
          <div className="flex-1">
            <HouseholdWidget />
          </div>
        </div>

        {/* Column 2 & 3: Map & Activity */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Mini Map */}
          <div className="h-[350px]">
            <MiniMapWidget />
          </div>

          {/* Activity Feed */}
          <div className="flex-1 card min-h-[300px] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 stat-icon-purple rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
                <h2 className="font-semibold text-foreground">Live Activity</h2>
              </div>
              <button
                onClick={() => fetchActivity()}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <div className="divide-y divide-border">
                {loadingActivity && activity.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">Loading...</div>
                ) : activity.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No recent activity.</div>
                ) : (
                  activity.map((item) => (
                    <div
                      key={item.id}
                      className="px-6 py-3 flex items-center gap-4 hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          item.result === "Pass"
                            ? "bg-green-500/15 text-green-400"
                            : item.result === "Captcha"
                              ? "bg-purple-500/15 text-purple-400"
                              : item.result === "Partial"
                                ? "bg-orange-500/15 text-orange-400"
                                : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {item.result === "Pass" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : item.result === "Captcha" ? (
                          <Clock className="w-4 h-4" />
                        ) : item.result === "Partial" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground text-sm">
                            {item.member_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.timestamp
                              ? new Date(item.timestamp).toLocaleTimeString()
                              : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate max-w-[200px]">
                            {item.federal_division || "No Electorate"}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              item.result === "Pass"
                                ? "text-green-400"
                                : item.result === "Fail"
                                  ? "text-red-400"
                                  : "text-muted-foreground"
                            }
                          >
                            {item.result}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
