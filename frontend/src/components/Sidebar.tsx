import { useStore } from "@nanostores/react";
import { NavLink, useNavigate } from "react-router-dom";
import { $stats, fetchStats } from "../stores/statsStore";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../utils/firebase";
import { updateFilters } from "../stores/membersStore";
import {
  LayoutDashboard,
  Users,
  Map,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RotateCcw,
  LogOut,
  ChevronLeft,
  ChevronRight,

  Database,
  RefreshCw,
  Home,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const stats = useStore($stats);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleFilterClick = (status: string) => {
    updateFilters({
      search: "",
      status: [status],
      state: "all",
      tags: [],
      tagOperator: "AND",
    });
    navigate("/members");
  };

  const handleResetFilters = () => {
    updateFilters({
      search: "",
      status: [],
      state: "all",
      tags: [],
      tagOperator: "AND",
    });
  };

  const navLinkClasses = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    } ${collapsed ? "justify-center" : ""}`;

  const statusButtonClasses = (color: string) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      collapsed ? "justify-center" : ""
    } ${color}`;

  const sectionLabelClasses = "px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";

  return (
    <div
      className={`fixed inset-y-0 left-0 bg-sidebar-bg border-r border-sidebar-border z-40 flex flex-col transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo/Brand */}
      <div
        className={`p-5 border-b border-sidebar-border flex items-center ${
          collapsed ? "justify-center px-4" : "justify-between"
        }`}
      >
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-foreground">PoliCRM</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Campaign Management</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* Core Navigation */}
        {!collapsed && <p className={sectionLabelClasses}>Core</p>}
        
        <NavLink
          to="/dashboard"
          end
          onClick={handleResetFilters}
          className={({ isActive }) => navLinkClasses(isActive)}
          title="Dashboard"
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/members"
          className={({ isActive }) => navLinkClasses(isActive)}
          title="Contacts"
        >
          <Users className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Contacts</span>}
        </NavLink>

        <NavLink
          to="/war-room"
          className={({ isActive }) => navLinkClasses(isActive)}
          title="Campaign HQ"
        >
          <Map className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Campaign HQ</span>}
        </NavLink>

        <NavLink
          to="/electoral-roll"
          className={({ isActive }) => navLinkClasses(isActive)}
          title="Electoral Roll"
        >
          <ClipboardList className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Electoral Roll</span>}
        </NavLink>

        <NavLink
          to="/household-analytics"
          className={({ isActive }) => navLinkClasses(isActive)}
          title="Household Analytics"
        >
          <Home className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Households</span>}
        </NavLink>

        {/* Admin Section */}
        {!collapsed && (
          <div className="border-t border-sidebar-border my-4 pt-4">
            <p className={sectionLabelClasses}>Admin</p>
          </div>
        )}

        <NavLink
          to="/queue"
          className={({ isActive }) => navLinkClasses(isActive)}
          title="Queue"
        >
          <RefreshCw className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Queue</span>}
        </NavLink>

        <NavLink
          to="/database"
          className={({ isActive }) => navLinkClasses(isActive)}
          title="Database"
        >
          <Database className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Database</span>}
        </NavLink>

        {/* Status Filters Section */}
        {!collapsed && (
          <div className="border-t border-sidebar-border my-4 pt-4">
            <p className={sectionLabelClasses}>Quick Filters</p>
          </div>
        )}

        <div className="space-y-1 mt-2">
          <button
            onClick={() => handleFilterClick("Verified")}
            className={statusButtonClasses("bg-green-500/10 text-green-400 hover:bg-green-500/20")}
            title="Verified"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Verified</span>
                <span className="text-xs font-medium bg-green-500/20 px-2 py-0.5 rounded">
                  {stats.verified}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => handleFilterClick("Unchecked")}
            className={statusButtonClasses("bg-amber-500/10 text-amber-400 hover:bg-amber-500/20")}
            title="Pending"
          >
            <Clock className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Pending</span>
                <span className="text-xs font-medium bg-amber-500/20 px-2 py-0.5 rounded">
                  {stats.unchecked}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => handleFilterClick("Partial")}
            className={statusButtonClasses("bg-orange-500/10 text-orange-400 hover:bg-orange-500/20")}
            title="Partial"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Partial</span>
                <span className="text-xs font-medium bg-orange-500/20 px-2 py-0.5 rounded">
                  {stats.partial}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => handleFilterClick("Fail")}
            className={statusButtonClasses("bg-red-500/10 text-red-400 hover:bg-red-500/20")}
            title="Failed"
          >
            <XCircle className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Failed</span>
                <span className="text-xs font-medium bg-red-500/20 px-2 py-0.5 rounded">
                  {stats.failed}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => handleFilterClick("Captcha")}
            className={statusButtonClasses("bg-purple-500/10 text-purple-400 hover:bg-purple-500/20")}
            title="Captcha"
          >
            <RotateCcw className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Captcha</span>
                <span className="text-xs font-medium bg-purple-500/20 px-2 py-0.5 rounded">
                  {stats.captcha}
                </span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* User Section */}
      <div className={`p-4 border-t border-sidebar-border ${collapsed ? "flex justify-center" : ""}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {auth.currentUser?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {auth.currentUser?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {auth.currentUser?.email || ""}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border bg-secondary/50">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">
                {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
