import type { Member, SortState } from '../stores/membersStore';

interface MemberTableProps {
    members: Member[];
    selectedIds: Set<number>;
    onToggleSelect: (id: number) => void;
    onToggleSelectAll: () => void;
    onSort: (field: SortState['field']) => void;
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
    onResign
}: MemberTableProps) {
    const getVerificationBadge = (status: string) => {
        const badges: Record<string, { color: string; label: string }> = {
            Verified: { color: 'bg-green-100 text-green-700 border-green-200', label: '✓ Verified' },
            Partial: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '⚠ Partial' },
            Captcha: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: '🔄 Captcha' },
            Fail: { color: 'bg-red-100 text-red-700 border-red-200', label: '✗ Failed' },
            Unchecked: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: '⏳ Unchecked' },
            Duplicate: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: '👯 Duplicate' }
        };

        const badge = badges[status] || badges.Unchecked;
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const getVerificationStatus = (member: Member): string => {
        if (!member.check_results || member.check_results.length === 0) {
            return 'Unchecked';
        }
        const lastResult = member.check_results[member.check_results.length - 1].result;

        // Map backend results to frontend display names
        if (lastResult === 'Pass') return 'Verified';
        if (lastResult === 'Partial') return 'Partial';
        if (lastResult === 'Captcha') return 'Captcha';
        if (lastResult.startsWith('Fail')) return 'Fail';
        if (member.is_duplicate) return 'Duplicate';

        return lastResult;
    };

    const getSortIcon = (field: SortState['field']) => {
        if (sort.field !== field) return '▼';
        return sort.direction === 'asc' ? '▲' : '▼';
    };

    // Safety check for undefined members
    const safeMembers = members || [];

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <input
                        type="checkbox"
                        checked={safeMembers.length > 0 && selectedIds.size === safeMembers.length}
                        onChange={onToggleSelectAll}
                        className="rounded border-slate-300"
                    />
                    <h2 className="font-bold text-slate-900 text-lg">Members Directory</h2>
                </div>
                <div className="text-sm text-slate-600 font-medium">
                    Showing {safeMembers.length} member{safeMembers.length !== 1 ? 's' : ''}
                    {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b-2 border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-12"></th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                onClick={() => onSort('name')}
                            >
                                Name <span className="text-xs">{getSortIcon('name')}</span>
                            </th>
                            <th className="px-6 py-4">Address</th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                onClick={() => onSort('id')}
                            >
                                NB ID <span className="text-xs">{getSortIcon('id')}</span>
                            </th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                onClick={() => onSort('status')}
                            >
                                Status <span className="text-xs">{getSortIcon('status')}</span>
                            </th>
                            <th className="px-6 py-4">Federal Electorate</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {safeMembers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    <div className="text-4xl mb-2">📋</div>
                                    No members found
                                </td>
                            </tr>
                        ) : (
                            safeMembers.map((member) => (
                                <tr
                                    key={member.id}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(member.id)}
                                            onChange={() => onToggleSelect(member.id)}
                                            className="rounded border-slate-300"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">
                                            {member.first_name} {member.middle_name ? member.middle_name + ' ' : ''}{member.last_name}
                                        </div>
                                        {member.email && (
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        )}
                                        {member.mobile && (
                                            <div className="text-xs text-slate-500">{member.mobile}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700">{member.primary_city || '-'}</div>
                                        <div className="text-xs text-slate-500">
                                            {member.primary_state || '-'} {member.primary_zip || ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-slate-700">
                                            {member.nationbuilder_id || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getVerificationBadge(getVerificationStatus(member))}
                                        {member.check_results?.[member.check_results.length - 1]?.result && (
                                            <div className="text-xs text-slate-500 mt-1" title={member.check_results[member.check_results.length - 1].result}>
                                                {member.check_results[member.check_results.length - 1].result.substring(0, 30)}
                                                {member.check_results[member.check_results.length - 1].result.length > 30 ? '...' : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">
                                        {member.check_results?.[member.check_results.length - 1]?.federal_division || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(member)}
                                                className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => onAddTag(member)}
                                                className="text-purple-600 hover:text-purple-700 text-xs font-medium"
                                                title="Add Tag"
                                            >
                                                🏷️
                                            </button>
                                            <button
                                                onClick={() => onCheck(member)}
                                                className="text-green-600 hover:text-green-700 text-xs font-medium"
                                                title="Check Now"
                                            >
                                                🔍
                                            </button>
                                            <button
                                                onClick={() => onResign(member)}
                                                className="text-red-600 hover:text-red-700 text-xs font-medium"
                                                title="Resign"
                                            >
                                                ⚠️
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
