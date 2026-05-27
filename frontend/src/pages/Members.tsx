import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  $filters,
  $pagination,
  $sort,
  updateFilters,
  updatePagination,
  updateSort,
  type Member,
} from "../stores/membersStore";
import { fetchStats } from "../stores/statsStore";
import { $tags, fetchTags } from "../stores/tagsStore";
import { membersApi, tagsApi } from "../services/api";
import { Modal, ModalFooter } from "../components/ui/modal";
import MemberProfile from "../components/MemberProfile";
import { Dropdown, ActionMenu, ActionMenuItem } from "../components/ui/dropdown";
import {
  Search,
  Plus,
  Download,

  ChevronLeft,
  ChevronRight,
  Tag,
  X,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  Users,
  Edit3,
  Trash2,
  CheckCircle,
  UserMinus,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "Verified", label: "Verified" },
  { value: "Unchecked", label: "Unchecked" },
  { value: "Partial", label: "Partial" },
  { value: "Fail", label: "Failed" },
  { value: "Captcha", label: "Captcha" },
];

const STATE_OPTIONS = [
  { value: "NSW", label: "NSW" },
  { value: "VIC", label: "VIC" },
  { value: "QLD", label: "QLD" },
  { value: "WA", label: "WA" },
  { value: "SA", label: "SA" },
  { value: "TAS", label: "TAS" },
  { value: "ACT", label: "ACT" },
  { value: "NT", label: "NT" },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Recently added" },
  { value: "name:asc", label: "Name A-Z" },
  { value: "name:desc", label: "Name Z-A" },
  { value: "updated_at:desc", label: "Recently updated" },
];

export default function Members() {
  const filters = useStore($filters);
  const pagination = useStore($pagination);
  const sort = useStore($sort);
  // const stats = useStore($stats);
  const tags = useStore($tags);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showTagPicker, setShowTagPicker] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    primary_address: "",
    primary_city: "",
    primary_state: "",
    primary_zip: "",
  });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {
        search: filters.search || undefined,
        status: filters.status.length > 0 ? filters.status : undefined,
        state: filters.state !== "all" ? filters.state : undefined,
        tags: filters.tags.length > 0 ? filters.tags.map(Number) : undefined,
        tag_operator: filters.tagOperator,
        skip: (pagination.page - 1) * pagination.itemsPerPage,
        limit: pagination.itemsPerPage,
        sort_by: sort.field || undefined,
        sort_order: sort.direction,
      };

      const response = await membersApi.getAll(params);
      setMembers(response.members);
      updatePagination({ totalItems: response.total });
    } catch (error) {
      console.error("Failed to fetch members:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchStats();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [filters, pagination.page, pagination.itemsPerPage, sort]);

  const handleAddMember = async () => {
    setSaving(true);
    try {
      await membersApi.create(formData);
      setShowAddModal(false);
      setFormData({ first_name: "", last_name: "", email: "", mobile: "", primary_address: "", primary_city: "", primary_state: "", primary_zip: "" });
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error("Failed to create member:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const params: any = {
      format: "nb"
    };

    if (filters.status.length > 0) params.status = filters.status;
    if (filters.state !== "all") params.state = filters.state;
    if (filters.search) params.search = filters.search;
    if (filters.tags.length > 0) {
      params.tags = filters.tags;
      params.tag_operator = filters.tagOperator;
    }

    try {
      await membersApi.exportCSV(params);
    } catch (error) {
      console.error("Export failed:", error);
      // Could verify alert here but simple console error for now
    } finally {
      setExporting(false);
    }
  };

  /* const handleEditMember = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await membersApi.update(selectedMember.id, formData);
      setShowEditModal(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      console.error("Failed to update member:", error);
    } finally {
      setSaving(false);
    }
  }; */

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Delete ${member.first_name} ${member.last_name}?`)) return;
    try {
      await membersApi.delete(member.id);
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error("Failed to delete member:", error);
    }
  };

  const handleCheckMember = async (member: Member) => {
    try {
      await membersApi.checkSelected([member.id]);
      fetchMembers();
    } catch (error) {
      console.error("Failed to check member:", error);
    }
  };

  const handleResignMember = async (member: Member) => {
    if (!confirm(`Mark ${member.first_name} ${member.last_name} as resigned?`)) return;
    try {
      await membersApi.resign(member.id);
      fetchMembers();
      fetchStats();
    } catch (error) {
      console.error("Failed to resign member:", error);
    }
  };

  const handleAddTag = async (memberId: number, tagId: number) => {
    try {
      await tagsApi.addToMember(memberId, tagId);
      fetchMembers();
      setShowTagPicker(null);
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleRemoveTag = async (memberId: number, tagId: number) => {
    try {
      await tagsApi.removeFromMember(memberId, tagId);
      fetchMembers();
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      email: member.email || "",
      mobile: member.mobile || "",
      primary_address: member.primary_address1 || "",
      primary_city: member.primary_city || "",
      primary_state: member.primary_state || "",
      primary_zip: member.primary_zip || "",
    });
    setShowEditModal(true);
  };

  const handleSortChange = (value: string) => {
    const [field, direction] = value.split(":");
    updateSort(field as "status" | "name" | "id" | null);
    if (direction) {
      // updateSort already toggles, so we may need to call twice or update store directly
    }
  };

  const getVerificationStatus = (member: Member): string => {
    if (!member.check_results || member.check_results.length === 0) return "Unchecked";
    const lastResult = member.check_results[member.check_results.length - 1].result;
    if (lastResult === "Pass") return "Verified";
    if (lastResult === "Partial") return "Partial";
    if (lastResult === "Captcha") return "Captcha";
    if (lastResult.startsWith("Fail")) return "Fail";
    return lastResult;
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      Verified: "bg-green-500/20 text-green-400 border-green-500/30",
      Partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      Captcha: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      Fail: "bg-red-500/20 text-red-400 border-red-500/30",
      Unchecked: "bg-muted text-muted-foreground border-border",
    };
    return styles[status] || styles.Unchecked;
  };

  const getInitials = (member: Member) => {
    const first = member.first_name?.charAt(0) || "";
    const last = member.last_name?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  const getAvatarColor = (member: Member) => {
    const colors = [
      "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
      "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500"
    ];
    const hash = (member.first_name?.charCodeAt(0) || 0) + (member.last_name?.charCodeAt(0) || 0);
    return colors[hash % colors.length];
  };

  const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);
  const startItem = (pagination.page - 1) * pagination.itemsPerPage + 1;
  const endItem = Math.min(pagination.page * pagination.itemsPerPage, pagination.totalItems);

  const memberTags = (member: Member) => {
    // Tags would come from member.tags if available
    return member.tags || [];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-foreground">People</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search people..."
                value={filters.search || ""}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="w-64 pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground border border-border rounded-lg font-medium text-sm hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exporting ? "Exporting..." : "Export"}
            </button>
            <button
              onClick={() => {
                setFormData({ first_name: "", last_name: "", email: "", mobile: "", primary_address: "", primary_city: "", primary_state: "", primary_zip: "" });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              New person
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 text-sm">
          {[
            { id: "all", label: "All People" },
            { id: "members", label: "Members" },
            { id: "supporters", label: "Supporters" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "all") updateFilters({ status: [] });
                if (tab.id === "members") updateFilters({ status: ["Verified"] });
                if (tab.id === "supporters") updateFilters({ status: ["Unchecked", "Partial"] });
              }}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-foreground font-medium border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border bg-card/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dropdown
              label="Status"
              options={STATUS_OPTIONS}
              value={filters.status}
              onChange={(value) => updateFilters({ status: value as string[] })}
              multiple
            />
            <Dropdown
              label="State"
              options={STATE_OPTIONS}
              value={filters.state === "all" ? "" : filters.state}
              onChange={(value) => updateFilters({ state: (value as string) || "all" })}
            />
            {(filters.status.length > 0 || filters.state !== "all") && (
              <button
                onClick={() => updateFilters({ status: [], state: "all" })}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Dropdown
              label="Sort"
              options={SORT_OPTIONS}
              value={`${sort.field || "created_at"}:${sort.direction}`}
              onChange={(val) => handleSortChange(val as string)}
              placeholder="Recently added"
            />
            <span className="font-medium text-foreground">
              {pagination.totalItems > 0 ? `${startItem} to ${endItem} of ${pagination.totalItems.toLocaleString()}` : "0 results"}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updatePagination({ page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="p-1.5 rounded hover:bg-secondary disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updatePagination({ page: pagination.page + 1 })}
                disabled={pagination.page >= totalPages}
                className="p-1.5 rounded hover:bg-secondary disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* People List */}
      <div className="p-6">
        {loading && members.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 mx-auto text-muted-foreground animate-spin mb-3" />
            <p className="text-muted-foreground">Loading people...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-foreground font-medium">No people found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or add a new person</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const status = getVerificationStatus(member);
              const division = member.check_results?.[member.check_results.length - 1]?.federal_division;
              const mTags = memberTags(member);

              return (
                <div
                  key={member.id}
                  className="card p-5 hover:border-border/80 transition-colors cursor-pointer"
                  onClick={() => openEditModal(member)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-14 h-14 rounded-full ${getAvatarColor(member)} flex items-center justify-center text-white font-semibold text-lg shrink-0`}>
                      {getInitials(member)}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      {/* Name Row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-semibold text-foreground text-base hover:text-primary cursor-pointer"
                          onClick={() => openEditModal(member)}
                        >
                          {member.first_name} {member.last_name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getStatusStyle(status)}`}>
                          {status}
                        </span>
                      </div>

                      {/* Location */}
                      {(member.primary_city || member.primary_state) && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                          <MapPin className="w-3.5 h-3.5" />
                          {[member.primary_city, member.primary_state, "AU"].filter(Boolean).join(", ")}
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        {member.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="text-primary">{member.email}</span>
                          </div>
                        )}
                        {member.mobile && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            {member.mobile}
                          </div>
                        )}
                        {division && (
                          <span className="text-muted-foreground/70">Division: {division}</span>
                        )}
                      </div>

                      {/* Tags Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTagPicker(showTagPicker === member.id ? null : member.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-secondary rounded hover:bg-secondary/80"
                          >
                            <Tag className="w-3 h-3" />
                            Add tag
                          </button>
                          {showTagPicker === member.id && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                              {tags.map((tag) => (
                                <button
                                  key={tag.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddTag(member.id, tag.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-secondary"
                                >
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                  {tag.name}
                                </button>
                              ))}
                              {tags.length === 0 && (
                                <p className="px-3 py-2 text-xs text-muted-foreground">No tags available</p>
                              )}
                            </div>
                          )}
                        </div>
                        {mTags.map((tag: any) => (
                          <span
                            key={tag.id}
                            className="group flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
                            style={{ backgroundColor: `${tag.color}30`, color: tag.color }}
                          >
                            {tag.name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(member.id, tag.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        trigger={
                          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        }
                      >
                        <ActionMenuItem icon={<Edit3 className="w-4 h-4" />} onClick={() => openEditModal(member)}>
                          Edit
                        </ActionMenuItem>
                        <ActionMenuItem icon={<CheckCircle className="w-4 h-4" />} onClick={() => handleCheckMember(member)}>
                          Check AEC
                        </ActionMenuItem>
                        <ActionMenuItem icon={<UserMinus className="w-4 h-4" />} onClick={() => handleResignMember(member)}>
                          Resign
                        </ActionMenuItem>
                        <ActionMenuItem icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDeleteMember(member)} danger>
                          Delete
                        </ActionMenuItem>
                      </ActionMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Pagination */}
        {members.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => updatePagination({ itemsPerPage: Number(e.target.value), page: 1 })}
                className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {startItem} to {endItem} of {pagination.totalItems.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updatePagination({ page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => updatePagination({ page: pagination.page + 1 })}
                  disabled={pagination.page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary disabled:opacity-40"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Person" size="lg">
        {/* ... existing add form ... */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">First Name *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Last Name *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Mobile</label>
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Address</label>
            <input
              type="text"
              value={formData.primary_address}
              onChange={(e) => setFormData({ ...formData, primary_address: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">City/Suburb</label>
            <input
              type="text"
              value={formData.primary_city}
              onChange={(e) => setFormData({ ...formData, primary_city: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">State</label>
              <select
                value={formData.primary_state}
                onChange={(e) => setFormData({ ...formData, primary_state: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm"
              >
                <option value="">Select</option>
                {STATE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Postcode</label>
              <input
                type="text"
                value={formData.primary_zip}
                onChange={(e) => setFormData({ ...formData, primary_zip: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
        <ModalFooter>
          <button
            onClick={() => setShowAddModal(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleAddMember}
            disabled={!formData.first_name || !formData.last_name || saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Person"}
          </button>
        </ModalFooter>
      </Modal>

      {/* Member Profile/Edit Modal */}
      {selectedMember && (
        <MemberProfile
          member={selectedMember}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMember(null);
          }}
          onUpdate={() => {
            fetchMembers();
            fetchStats();
            // Keep modal open or close? Usually keep open to show updated state, 
            // but fetching members will update 'members' list.
            // But 'selectedMember' needs to be updated too!
            // fetchMembers updates the list, but selectedMember is a separate state.
            // We should reload selectedMember from the updated list or re-fetch it.
            // For now, let's close it or re-fetch the specific member.
            
            // Re-fetch specific member to update the modal view
            membersApi.getById(selectedMember.id).then(updated => {
              setSelectedMember(updated);
            });
          }}
        />
      )}
    </div>
  );
}

