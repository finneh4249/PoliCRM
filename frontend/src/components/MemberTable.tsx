import { Edit3, Tag, Search, AlertTriangle, ChevronUp, ChevronDown, FileX } from "lucide-react";
import type { Member, SortState } from "../stores/membersStore";

interface MemberTableProps {
  members: Member[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onSort: (field: SortState["field"]) => void;
  sort: SortState;
  onEdit: (member: Member) => void;
  onAddTag: (member: Member) => void;
  onCheck: (member: Member) => void;
  onResign: (member: Member) => void;
}

export function MemberTable({
  members,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  sort,
  onEdit,
  onAddTag,
  onCheck,
  onResign,
}: MemberTableProps) {
  const getVerificationBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      Verified: {
        color: "bg-green-500/15 text-green-400 border-green-500/20",
        label: "Verified",
      },
      Partial: {
        color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        label: "Partial",
      },
      Captcha: {
        color: "bg-orange-500/15 text-orange-400 border-orange-500/20",
        label: "Captcha",
      },
      Fail: {
        color: "bg-red-500/15 text-red-400 border-red-500/20",
        label: "Failed",
      },
      Unchecked: {
        color: "bg-muted text-muted-foreground border-border",
        label: "Unchecked",
      },
      Duplicate: {
        color: "bg-purple-500/15 text-purple-400 border-purple-500/20",
        label: "Duplicate",
      },
    };

    const badge = badges[status] || badges.Unchecked;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  const getVerificationStatus = (member: Member): string => {
    if (!member.check_results || member.check_results.length === 0) {
      return "Unchecked";
    }
    const lastResult = member.check_results[member.check_results.length - 1].result;

    if (lastResult === "Pass") return "Verified";
    if (lastResult === "Partial") return "Partial";
    if (lastResult === "Captcha") return "Captcha";
    if (lastResult.startsWith("Fail")) return "Fail";
    if (member.is_duplicate) return "Duplicate";

    return lastResult;
  };

  const getSortIcon = (field: SortState["field"]) => {
    if (sort.field !== field) return <ChevronDown className="w-3 h-3 opacity-50" />;
    return sort.direction === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const safeMembers = members || [];
  const thClass = "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider";
  const thSortableClass = `${thClass} cursor-pointer hover:text-foreground transition-colors select-none`;

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={safeMembers.length > 0 && selectedIds.size === safeMembers.length}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary/30"
          />
          <h2 className="font-semibold text-foreground">Contacts</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {safeMembers.length} contact{safeMembers.length !== 1 ? "s" : ""}
          {selectedIds.size > 0 && (
            <span className="text-primary font-medium"> · {selectedIds.size} selected</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3"></th>
              <th className={thSortableClass} onClick={() => onSort("name")}>
                <div className="flex items-center gap-1.5">
                  Name {getSortIcon("name")}
                </div>
              </th>
              <th className={thClass}>Address</th>
              <th className={thSortableClass} onClick={() => onSort("id")}>
                <div className="flex items-center gap-1.5">
                  NB ID {getSortIcon("id")}
                </div>
              </th>
              <th className={thSortableClass} onClick={() => onSort("status")}>
                <div className="flex items-center gap-1.5">
                  Status {getSortIcon("status")}
                </div>
              </th>
              <th className={thClass}>Division</th>
              <th className={`${thClass} text-center`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {safeMembers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <FileX className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">No contacts found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters</p>
                </td>
              </tr>
            ) : (
              safeMembers.map((member) => (
                <tr
                  key={member.id}
                  className={`hover:bg-secondary/30 transition-colors ${
                    selectedIds.has(member.id) ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={() => onToggleSelect(member.id)}
                      className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary/30"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-foreground">
                      {member.first_name} {member.middle_name ? member.middle_name + " " : ""}
                      {member.last_name}
                    </div>
                    {member.email && (
                      <div className="text-xs text-muted-foreground mt-0.5">{member.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm text-foreground">{member.primary_city || "-"}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.primary_state || "-"} {member.primary_zip || ""}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm text-muted-foreground">
                      {member.nationbuilder_id || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {getVerificationBadge(getVerificationStatus(member))}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {member.check_results?.[member.check_results.length - 1]?.federal_division || "-"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(member)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAddTag(member)}
                        className="p-1.5 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                        title="Add Tag"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onCheck(member)}
                        className="p-1.5 text-muted-foreground hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                        title="Check Now"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onResign(member)}
                        className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Resign"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
