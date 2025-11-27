import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { useNavigate } from 'react-router-dom';
import {
    $filters,
    $pagination,
    $sort,
    $selectedMembers,
    updateFilters,
    updatePagination,
    updateSort,
    toggleMemberSelection,
    toggleSelectAll,
    clearSelection,
    type Member
} from '../stores/membersStore';
import { membersApi, tagsApi } from '../services/api';
import { QuickActions } from '../components/QuickActions';
import { FilterBar } from '../components/FilterBar';
import { MemberTable } from '../components/MemberTable';
import { Pagination } from '../components/Pagination';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';

export default function Dashboard() {
    const navigate = useNavigate();
    const filters = useStore($filters);
    const pagination = useStore($pagination);
    const sort = useStore($sort);
    const selectedIds = useStore($selectedMembers);

    const [members, setMembers] = useState<Member[]>([]);
    // Stats are now handled by statsStore and Sidebar
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshTimer, setRefreshTimer] = useState('10s');
    const [, setRefreshIntervalState] = useState<number | null>(null);

    // Modals state
    const [, setShowAddMember] = useState(false);
    const [, setShowEditMember] = useState(false);
    const [, setShowImportCSV] = useState(false);
    const [, setShowExportWizard] = useState(false);
    const [, setShowBulkStatus] = useState(false);
    const [, setShowResignModal] = useState(false);
    const [, setShowReminders] = useState(false);

    const [, setSelectedMember] = useState<Member | null>(null);

    // Fetch members with filters
    const fetchMembers = async () => {
        try {
            setLoading(true);
            const params = {
                search: filters.search || undefined,
                status: filters.status.length > 0 ? filters.status : undefined,
                state: filters.state !== 'all' ? filters.state : undefined,
                tags: filters.tags.length > 0 ? filters.tags.map(Number) : undefined,
                tag_operator: filters.tagOperator,
                skip: (pagination.page - 1) * pagination.itemsPerPage,
                limit: pagination.itemsPerPage,
                sort_by: sort.field || undefined,
                sort_order: sort.direction
            };

            // Backend returns array directly, not wrapped in { members: [...] }
            const members = await membersApi.getAll(params);
            setMembers(members);
        } catch (error) {
            console.error('Failed to fetch members:', error);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    };



    // Fetch tags
    const fetchTags = async () => {
        try {
            const response = await tagsApi.getAll();
            setTags(response);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchMembers();
        fetchTags();
    }, []);

    // Refetch when filters/pagination/sort change
    useEffect(() => {
        fetchMembers();
    }, [filters, pagination.page, pagination.itemsPerPage, sort]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMembers();
        }, 10000);
        setRefreshIntervalState(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [filters, pagination, sort]);

    // Timer countdown for display
    useEffect(() => {
        let countdown = 10;
        const timer = setInterval(() => {
            countdown--;
            if (countdown <= 0) countdown = 10;
            setRefreshTimer(`${countdown} s`);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Handlers
    const handleCheckSelected = async () => {
        const ids = Array.from(selectedIds).map(Number);
        if (ids.length === 0) return;

        try {
            await membersApi.checkSelected(ids);
            clearSelection();
            fetchMembers();
        } catch (error) {
            console.error('Failed to check selected:', error);
            alert('Failed to initiate check. Please try again.');
        }
    };

    const handleRetryCaptchas = async () => {
        const captchaMembers = members.filter(m => {
            const lastResult = m.check_results?.[m.check_results.length - 1]?.result;
            return lastResult === 'Captcha';
        });

        if (captchaMembers.length === 0) {
            alert('No members with CAPTCHA status found.');
            return;
        }

        const confirmRetry = window.confirm(`Retry ${captchaMembers.length} member(s) with CAPTCHA status ? `);
        if (confirmRetry) {
            try {
                for (const member of captchaMembers) {
                    await membersApi.checkSelected([member.id]);
                }
                fetchMembers();
            } catch (error) {
                console.error('Failed to retry captchas:', error);
                alert('Failed to retry CAPTCHA checks.');
            }
        }
    };

    const handleExportSelected = () => {
        setShowExportWizard(true);
    };

    const handleExportAll = () => {
        membersApi.exportCSV({});
    };

    const handleBulkActions = () => {
        setShowBulkStatus(true);
    };

    const handleReminders = () => {
        setShowReminders(true);
    };

    const handleClearFilters = () => {
        updateFilters({
            search: '',
            status: [],
            state: 'all',
            tags: [],
            tagOperator: 'AND'
        });
    };

    const handleEdit = (member: Member) => {
        setSelectedMember(member);
        setShowEditMember(true);
    };

    const handleAddTag = (member: Member) => {
        setSelectedMember(member);
        // Open tag modal - we'll implement this in the modal component
    };

    const handleCheck = async (member: Member) => {
        try {
            await membersApi.checkSelected([member.id]);
            fetchMembers();
        } catch (error) {
            console.error('Failed to check member:', error);
            alert('Failed to check member. Please try again.');
        }
    };

    const handleResign = (member: Member) => {
        setSelectedMember(member);
        setShowResignModal(true);
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Header */}
            <div className="gradient-bg text-white shadow-lg">
                <div className="px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Dashboard</h1>
                            <p className="text-indigo-100 mt-1">
                                Overview of member enrollment verification
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowImportCSV(true)}
                                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all font-medium border border-white/30"
                            >
                                📁 Import CSV
                            </button>
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg shadow-lg transition-all font-medium"
                            >
                                + Add Member
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all font-medium border border-white/20"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                {/* StatsCards removed as they are now in Sidebar */}

                <QuickActions
                    selectedCount={selectedIds.size}
                    onCheckSelected={handleCheckSelected}
                    onRetryCaptchas={handleRetryCaptchas}
                    onExport={handleExportSelected}
                    onExportAll={handleExportAll}
                    onBulkActions={handleBulkActions}
                    onReminders={handleReminders}
                    refreshTimer={refreshTimer}
                />

                <FilterBar
                    filters={filters}
                    onFiltersChange={(newFilters) => updateFilters(newFilters)}
                    onClearFilters={handleClearFilters}
                />

                <MemberTable
                    members={members}
                    selectedIds={selectedIds}
                    onToggleSelect={(id) => toggleMemberSelection(id)}
                    onToggleSelectAll={() => toggleSelectAll(members.map(m => m.id))}
                    onSort={(field) => updateSort(field)}
                    sort={sort}
                    onEdit={handleEdit}
                    onAddTag={handleAddTag}
                    onCheck={handleCheck}
                    onResign={handleResign}
                />

                <Pagination
                    currentPage={pagination.page}
                    totalPages={totalPages}
                    itemsPerPage={pagination.itemsPerPage}
                    onPageChange={(page) => updatePagination({ page })}
                    onItemsPerPageChange={(itemsPerPage) => updatePagination({ itemsPerPage, page: 1 })}
                />
            </div>

            {/* Modals will be added here */}
            {/* {showAddMember && <AddMemberModal ... />} */}
            {/* {showEditMember && <EditMemberModal ... />} */}
            {/* etc. */}
        </div>
    );
}
