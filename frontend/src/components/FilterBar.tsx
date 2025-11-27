import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $tags } from '../stores/tagsStore';
import type { MemberFilters } from '../stores/membersStore';

interface FilterBarProps {
    filters: MemberFilters;
    onFiltersChange: (filters: Partial<MemberFilters>) => void;
    onClearFilters: () => void;
}

export function FilterBar({ filters, onFiltersChange, onClearFilters }: FilterBarProps) {
    const tags = useStore($tags);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

    const statusOptions = [
        { value: 'Verified', label: '✓ Verified', emoji: '✓' },
        { value: 'Partial', label: '⚠ Partial Match', emoji: '⚠' },
        { value: 'Captcha', label: '🔄 Captcha', emoji: '🔄' },
        { value: 'Fail', label: '✗ Failed', emoji: '✗' },
        { value: 'Unchecked', label: '⏳ Unchecked', emoji: '⏳' },
        { value: 'Duplicate', label: '👯 Duplicate', emoji: '👯' }
    ];

    const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

    const toggleStatusFilter = (status: string) => {
        const currentStatus = filters.status || [];
        const newStatus = currentStatus.includes(status)
            ? currentStatus.filter(s => s !== status)
            : [...currentStatus, status];
        onFiltersChange({ status: newStatus });
    };

    const toggleTagFilter = (tagId: string) => {
        const currentTags = filters.tags || [];
        const newTags = currentTags.includes(tagId)
            ? currentTags.filter(t => t !== tagId)
            : [...currentTags, tagId];
        onFiltersChange({ tags: newTags });
    };

    const setStatusPreset = (preset: 'action_required' | 'safe') => {
        if (preset === 'action_required') {
            onFiltersChange({ status: ['Captcha', 'Fail', 'Unchecked'] });
        } else {
            onFiltersChange({ status: ['Verified'] });
        }
        setStatusDropdownOpen(false);
    };

    const getStatusFilterLabel = () => {
        if (!filters.status || filters.status.length === 0) return 'All Statuses';
        if (filters.status.length === 1) return statusOptions.find(s => s.value === filters.status[0])?.label || 'All Statuses';
        return `${filters.status.length} selected`;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-grow">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                        Search Members
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => onFiltersChange({ search: e.target.value })}
                            placeholder="Search by name, NB ID, suburb, or electorate..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <svg
                            className="w-5 h-5 text-slate-400 absolute left-3 top-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Status Filter */}
                <div className="w-full lg:w-48 relative">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                        Status
                    </label>
                    <button
                        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                        className="w-full text-left px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex justify-between items-center"
                    >
                        <span className="truncate text-sm">{getStatusFilterLabel()}</span>
                        <span className="text-xs text-slate-400">▼</span>
                    </button>

                    {statusDropdownOpen && (
                        <div className="absolute top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-30">
                            {/* Presets */}
                            <div className="mb-3 pb-3 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                                    Presets
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setStatusPreset('action_required')}
                                        className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded border border-orange-100 hover:bg-orange-100"
                                    >
                                        Action Required
                                    </button>
                                    <button
                                        onClick={() => setStatusPreset('safe')}
                                        className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-100 hover:bg-green-100"
                                    >
                                        Safe
                                    </button>
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {statusOptions.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={filters.status?.includes(option.value) || false}
                                            onChange={() => toggleStatusFilter(option.value)}
                                            className="rounded border-slate-300"
                                        />
                                        <span className="text-sm">{option.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => onFiltersChange({ status: [] })}
                                    className="text-xs text-slate-500 hover:text-red-600"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* State Filter */}
                <div className="w-full lg:w-48">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                        State
                    </label>
                    <select
                        value={filters.state}
                        onChange={(e) => onFiltersChange({ state: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm"
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
                <div className="w-full lg:w-48 relative">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                        Tags
                    </label>
                    <button
                        onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm flex items-center gap-2"
                    >
                        <span>🏷️</span>
                        <span>Tags</span>
                        {filters.tags && filters.tags.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 rounded-full">
                                {filters.tags.length}
                            </span>
                        )}
                    </button>

                    {tagDropdownOpen && (
                        <div className="absolute top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-20">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">
                                    Filter by Tags
                                </span>
                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                    <button
                                        onClick={() => onFiltersChange({ tagOperator: 'AND' })}
                                        className={`px-2 py-0.5 text-xs font-bold rounded ${filters.tagOperator === 'AND'
                                            ? 'bg-white shadow-sm text-indigo-600'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        AND
                                    </button>
                                    <button
                                        onClick={() => onFiltersChange({ tagOperator: 'OR' })}
                                        className={`px-2 py-0.5 text-xs font-bold rounded ${filters.tagOperator === 'OR'
                                            ? 'bg-white shadow-sm text-indigo-600'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        OR
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                                {tags.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No tags available</p>
                                ) : (
                                    tags.map((tag) => (
                                        <label
                                            key={tag.id}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filters.tags?.includes(String(tag.id)) || false}
                                                onChange={() => toggleTagFilter(String(tag.id))}
                                                className="rounded border-slate-300"
                                            />
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="text-sm">{tag.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => onFiltersChange({ tags: [] })}
                                    className="text-xs text-slate-500 hover:text-red-600"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                    <button
                        onClick={onClearFilters}
                        className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
