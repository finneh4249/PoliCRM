import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  MapPin,
  Upload,
  Clock,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { MembershipBadge, type MembershipStatus } from "../components/MembershipBadge";
import { analyticsApi, personsApi, importApi } from "../services/api";
import type { ImportJob, Person } from "../services/api";

/* ─── Phase 1 checklist ─────────────────────────────────────────────────── */
const PHASE1_ITEMS = [
  { done: true,  label: "Unified Person model (UUID primary key)" },
  { done: true,  label: "AES-256-GCM field-level encryption on all PII" },
  { done: true,  label: "SHA-256 blind index on email for encrypted lookup" },
  { done: true,  label: "External identities table (NationBuilder decoupling)" },
  { done: true,  label: "Direct NationBuilder API importer (idempotent)" },
  { done: false, label: "Person update (PATCH /persons/:id) with re-encryption" },
  { done: false, label: "Soft-delete with deleted_at" },
  { done: false, label: "Search by state, zip, or email blind index" },
  { done: false, label: "Cursor-based pagination on GET /persons" },
  { done: false, label: "Party & Branch CRUD (hierarchical)" },
  { done: false, label: "Membership lifecycle (active → lapsed → resigned)" },
  { done: false, label: "Interactions — event sourcing" },
  { done: false, label: "Tags + person_tags junction table" },
];

/* ─── Mock data (shown when backend unreachable) ─────────────────────────── */
const MOCK_RECENT: Array<Person & { membership_status: MembershipStatus }> = [
  { id: "1", given_name: "Amelia",  surname: "Thornton",  primary_state: "VIC", primary_zip: "3000", created_at: "2025-11-01T09:00:00Z", updated_at: "2025-11-20T14:00:00Z", membership_status: "active"   },
  { id: "2", given_name: "Marcus",  surname: "Oduya",     primary_state: "NSW", primary_zip: "2000", created_at: "2025-10-15T11:00:00Z", updated_at: "2025-11-18T09:00:00Z", membership_status: "active"   },
  { id: "3", given_name: "Priya",   surname: "Sharma",    primary_state: "QLD", primary_zip: "4000", created_at: "2025-09-22T08:00:00Z", updated_at: "2025-11-05T10:00:00Z", membership_status: "lapsed"   },
  { id: "4", given_name: "Daniel",  surname: "Kowalski",  primary_state: "WA",  primary_zip: "6000", created_at: "2025-08-10T13:00:00Z", updated_at: "2025-10-30T16:00:00Z", membership_status: "active"   },
  { id: "5", given_name: "Sophie",  surname: "Nakamura",  primary_state: "SA",  primary_zip: "5000", created_at: "2025-07-03T10:00:00Z", updated_at: "2025-11-12T11:00:00Z", membership_status: "resigned" },
];

const MOCK_IMPORTS: ImportJob[] = [
  { id: "j1", source: "nationbuilder", status: "complete", records_total: 3226, records_processed: 3194, records_skipped: 32, filename: "nationbuilder-export-3226", started_at: "2025-11-25T02:00:00Z", completed_at: "2025-11-25T02:18:00Z" },
  { id: "j2", source: "csv",           status: "complete", records_total: 3194, records_processed: 3194, records_skipped: 0,  filename: "nationbuilder-export-3194.csv", started_at: "2025-11-25T01:30:00Z", completed_at: "2025-11-25T01:44:00Z" },
];

const MOCK_SUMMARY = { total_persons: 12847, states_covered: 7, imports_total: 24, last_import_at: "2025-11-25T02:18:00Z" };

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "Just now";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function jobStatusColor(s: ImportJob["status"]): string {
  return s === "complete" ? "var(--status-active)" :
         s === "failed"   ? "var(--status-suspended)" :
         s === "running"  ? "var(--ops-blue)" : "var(--slate-muted)";
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [summary, setSummary] = useState<{
    total_persons: number;
    states_covered: number;
    imports_total: number;
    last_import_at?: string;
  }>(MOCK_SUMMARY);
  const [members, setMembers] = useState<typeof MOCK_RECENT>(MOCK_RECENT);
  const [imports, setImports] = useState<ImportJob[]>(MOCK_IMPORTS);
  const [phaseOpen, setPhaseOpen] = useState(false);

  useEffect(() => {
    analyticsApi.summary()
      .then(setSummary)
      .catch((err: unknown) => {
        console.error("analyticsApi.summary failed:", (err instanceof Error ? err.message : err));
      });
    personsApi.list({ limit: 8 })
      .then((p) => setMembers(
        (p.data ?? []).map((m) => ({ ...m, membership_status: "active" as MembershipStatus }))
      ))
      .catch((err: unknown) => {
        console.error("personsApi.list failed:", (err instanceof Error ? err.message : err));
        setMembers([]);
      });
    importApi.list()
      .then(setImports)
      .catch((err: unknown) => {
        console.error("importApi.list failed:", (err instanceof Error ? err.message : err));
        setImports([]);
      });
  }, []);

  const doneCount = PHASE1_ITEMS.filter((i) => i.done).length;
  const totalCount = PHASE1_ITEMS.length;

  return (
    <div className="page-content" style={{ padding: "32px 40px" }}>
      <PageHeader
        title="Dashboard"
        subtitle={`Last import ${timeAgo(summary.last_import_at)}`}
        action={
          <Link to="/app/import" className="btn-primary">
            Import Members <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        }
      />

      {/* ── Stat row ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          background: "var(--canvas-raised)",
          border: "1px solid var(--console-border)",
          borderRadius: 12,
          marginBottom: 32,
          overflow: "hidden",
        }}
      >
        {[
          { icon: Users,  label: "Members",         value: summary.total_persons.toLocaleString("en-AU") },
          { icon: MapPin, label: "States Covered",  value: `${summary.states_covered}/8` },
          { icon: Upload, label: "Imports Run",     value: summary.imports_total.toLocaleString("en-AU") },
          { icon: Clock,  label: "Last Import",     value: timeAgo(summary.last_import_at) },
        ].map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            style={{
              padding: "24px 28px",
              borderRight: i < 3 ? "1px solid var(--console-border)" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 12,
              }}
            >
              <Icon size={14} strokeWidth={2} style={{ color: "var(--slate-muted)" }} />
              <span className="stat-label">{label}</span>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column content ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Recent members */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "oklch(19% 0.03 260)",
                margin: 0,
              }}
            >
              Recent Members
            </h2>
            <Link
              to="/app/members"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--ops-blue)",
              }}
            >
              View all <ChevronRight size={13} strokeWidth={2.5} />
            </Link>
          </div>

          <div
            style={{
              background: "var(--canvas-raised)",
              border: "1px solid var(--console-border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <table
              className="data-table"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Name</th>
                  <th style={{ textAlign: "left" }}>State</th>
                  <th style={{ textAlign: "left" }}>Added</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span style={{ fontWeight: 500, color: "oklch(22% 0.03 260)" }}>
                        {m.given_name} {m.surname}
                      </span>
                    </td>
                    <td style={{ color: "var(--slate-muted)" }}>{m.primary_state ?? "—"}</td>
                    <td style={{ color: "var(--slate-muted)" }}>{fmtDate(m.created_at)}</td>
                    <td>
                      <MembershipBadge status={m.membership_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Import history */}
          <section>
            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "oklch(19% 0.03 260)",
                margin: "0 0 12px",
              }}
            >
              Recent Imports
            </h2>
            <div
              style={{
                background: "var(--canvas-raised)",
                border: "1px solid var(--console-border)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {imports.slice(0, 4).map((job, i) => (
                <div
                  key={job.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: i < Math.min(imports.length, 4) - 1
                      ? "1px solid var(--console-border)"
                      : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: "oklch(22% 0.03 260)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 180,
                      }}
                    >
                      {job.filename ?? job.source}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--slate-muted)", marginTop: 2 }}>
                      {job.records_processed?.toLocaleString("en-AU") ?? "—"} records
                      {job.started_at ? ` · ${timeAgo(job.started_at)}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: jobStatusColor(job.status),
                    }}
                  >
                    {job.status}
                  </span>
                </div>
              ))}

              {imports.length === 0 && (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    fontSize: 13,
                    color: "var(--slate-muted)",
                  }}
                >
                  No imports yet.
                </div>
              )}
            </div>
          </section>

          {/* Phase 1 progress */}
          <section>
            <button
              onClick={() => setPhaseOpen((o) => !o)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--canvas-raised)",
                border: "1px solid var(--console-border)",
                borderRadius: phaseOpen ? "12px 12px 0 0" : 12,
                padding: "12px 16px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 13.5,
                    color: "oklch(19% 0.03 260)",
                  }}
                >
                  Phase 1 Progress
                </div>
                <div style={{ fontSize: 11.5, color: "var(--slate-muted)", marginTop: 2 }}>
                  {doneCount}/{totalCount} tasks complete
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Progress bar */}
                <div
                  style={{
                    width: 56,
                    height: 4,
                    background: "var(--console-border)",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(doneCount / totalCount) * 100}%`,
                      background: "var(--ops-blue)",
                      borderRadius: 99,
                    }}
                  />
                </div>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  style={{
                    color: "var(--slate-muted)",
                    transform: phaseOpen ? "rotate(180deg)" : "none",
                    transition: "transform 200ms ease-out",
                  }}
                />
              </div>
            </button>

            {phaseOpen && (
              <div
                style={{
                  background: "var(--canvas-raised)",
                  border: "1px solid var(--console-border)",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: "4px 0 8px",
                }}
              >
                {PHASE1_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "7px 16px",
                    }}
                  >
                    {item.done ? (
                      <CheckSquare
                        size={13}
                        strokeWidth={2}
                        style={{ color: "var(--status-active)", flexShrink: 0, marginTop: 1 }}
                      />
                    ) : (
                      <Square
                        size={13}
                        strokeWidth={2}
                        style={{ color: "var(--console-border)", flexShrink: 0, marginTop: 1 }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 12,
                        color: item.done ? "var(--slate-muted)" : "oklch(32% 0.025 260)",
                        lineHeight: 1.4,
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
