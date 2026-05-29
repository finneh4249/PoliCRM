import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Upload,
  Map,
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/* ─── Nav items ──────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/members",   icon: Users,           label: "Members"   },
  { to: "/app/import",    icon: Upload,          label: "Import"    },
  { to: "/app/war-room",  icon: Map,             label: "War Room"  },
] as const;

/* ─── Role labels ────────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, string> = {
  sys_admin:        "System Admin",
  state_secretary:  "State Secretary",
  branch_organiser: "Branch Organiser",
  volunteer:        "Volunteer",
  read_only:        "Read Only",
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--navy)",
        borderRight: "1px solid var(--navy-border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: "22px 20px 18px",
          borderBottom: "1px solid var(--navy-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/policrm-logo-transparent.png"
            alt="PoliCRM Logo"
            style={{ width: 24, height: 24, objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 17,
              color: "oklch(98.5% 0.006 240)",
              letterSpacing: "-0.01em",
            }}
          >
            PoliCRM
          </span>
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "oklch(55% 0.015 240)",
            marginTop: 4,
          }}
        >
          Operations Console
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 12px 0" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}
              >
                <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Section divider */}
        <div
          style={{
            margin: "16px 0 12px",
            height: 1,
            background: "var(--navy-border)",
          }}
        />
      </nav>

      {/* User row */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid var(--navy-border)",
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "transparent",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            textAlign: "left",
          }}
          className="nav-item"
          title="Sign out"
        >
          {/* Avatar initial */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "oklch(52% 0.22 260 / 0.25)",
              border: "1px solid oklch(52% 0.22 260 / 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "oklch(72% 0.18 260)",
              flexShrink: 0,
            }}
          >
            {user?.name?.[0] ?? "U"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "oklch(90% 0.008 240)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name ?? "User"}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "oklch(55% 0.015 240)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </div>
          </div>

          <LogOut size={14} style={{ flexShrink: 0, color: "oklch(50% 0.015 240)" }} />
        </button>
      </div>
    </aside>
  );
}
