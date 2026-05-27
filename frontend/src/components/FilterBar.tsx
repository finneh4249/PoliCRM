import { useState } from "react";
import { useStore } from "@nanostores/react";
import { $tags } from "../stores/tagsStore";
import type { MemberFilters } from "../stores/membersStore";
import { Search, ChevronDown, Tag, X } from "lucide-react";

interface FilterBarProps {
  filters: MemberFilters;
  onFiltersChange: (filters: Partial<MemberFilters>) => void;
  onClearFilters: () => void;
}

export function FilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
}: FilterBarProps) {
  const tags = useStore($tags);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  const statusOptions = [
    { value: "Verified", label: "Verified", color: "bg-green-500/15 text-green-400" },
    { value: "Partial", label: "Partial Match", color: "bg-amber-500/15 text-amber-400" },
    { value: "Captcha", label: "Captcha", color: "bg-orange-500/15 text-orange-400" },
    { value: "Fail", label: "Failed", color: "bg-red-500/15 text-red-400" },
    { value: "Unchecked", label: "Unchecked", color: "bg-muted text-muted-foreground" },
    { value: "Duplicate", label: "Duplicate", color: "bg-purple-500/15 text-purple-400" },
  ];

  const states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

  const toggleStatusFilter = (status: string) => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter((s) => s !== status)
      : [...currentStatus, status];
    onFiltersChange({ status: newStatus });
  };

  const toggleTagFilter = (tagId: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((t) => t !== tagId)
      : [...currentTags, tagId];
    onFiltersChange({ tags: newTags });
  };

  const setStatusPreset = (preset: "action_required" | "safe") => {
    if (preset === "action_required") {
      onFiltersChange({ status: ["Captcha", "Fail", "Unchecked"] });
    } else {
      onFiltersChange({ status: ["Verified"] });
    }
    setStatusDropdownOpen(false);
  };

  const getStatusFilterLabel = () => {
    if (!filters.status || filters.status.length === 0) return "All Statuses";
    if (filters.status.length === 1)
      return statusOptions.find((s) => s.value === filters.status[0])?.label || "All Statuses";
    return `${filters.status.length} selected`;
  };

  const hasActiveFilters =
    filters.search ||
    (filters.status && filters.status.length > 0) ||
    filters.state !== "all" ||
    (filters.tags && filters.tags.length > 0);

  return (
    <div className="card p-5 mb-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-grow">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search</label>
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Search by name, ID, suburb..."
              className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-48 relative">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="w-full text-left px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 flex justify-between items-center text-sm text-foreground hover:bg-secondary/80 transition-colors"
          >
            <span className="truncate">{getStatusFilterLabel()}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {statusDropdownOpen && (
            <div className="absolute top-full mt-2 w-64 bg-card rounded-xl border border-border p-4 z-30 shadow-lg">
              {/* Presets */}
              <div className="mb-3 pb-3 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Quick Filters
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusPreset("action_required")}
                    className="px-3 py-1.5 text-xs bg-orange-500/15 text-orange-400 rounded-lg hover:bg-orange-500/25 font-medium transition-colors"
                  >
                    Action Required
                  </button>
                  <button
                    onClick={() => setStatusPreset("safe")}
                    className="px-3 py-1.5 text-xs bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25 font-medium transition-colors"
                  >
                    Verified Only
                  </button>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-secondary p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(option.value) || false}
                      onChange={() => toggleStatusFilter(option.value)}
                      className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary/30"
                    />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${option.color}`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => {
                    onFiltersChange({ status: [] });
                    setStatusDropdownOpen(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-red-400 font-medium transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* State Filter */}
        <div className="w-full lg:w-40">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">State</label>
          <select
            value={filters.state}
            onChange={(e) => onFiltersChange({ state: e.target.value })}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:ring-2 focus:ring-primary/30 text-sm text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <option value="all">All States</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Filter */}
        <div className="w-full lg:w-40 relative">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags</label>
          <button
            onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:ring-2 focus:ring-primary/30 text-sm flex items-center gap-2 text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Tag className="w-4 h-4" />
            <span>Tags</span>
            {filters.tags && filters.tags.length > 0 && (
              <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
                {filters.tags.length}
              </span>
            )}
          </button>

          {tagDropdownOpen && (
            <div className="absolute top-full mt-2 w-64 bg-card rounded-xl border border-border p-4 z-20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Filter by Tags
                </span>
                <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
                  <button
                    onClick={() => onFiltersChange({ tagOperator: "AND" })}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      filters.tagOperator === "AND"
                        ? "bg-card text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => onFiltersChange({ tagOperator: "OR" })}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      filters.tagOperator === "OR"
                        ? "bg-card text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    OR
                  </button>
                </div>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                {tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No tags available</p>
                ) : (
                  tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-secondary p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.tags?.includes(String(tag.id)) || false}
                        onChange={() => toggleTagFilter(String(tag.id))}
                        className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary/30"
                      />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm text-foreground">{tag.name}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    onFiltersChange({ tags: [] });
                    setTagDropdownOpen(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-red-400 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={onClearFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-border rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
