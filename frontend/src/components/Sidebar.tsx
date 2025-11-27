import { useStore } from '@nanostores/react';
import { NavLink, useNavigate } from 'react-router-dom';
import { $stats, fetchStats } from '../stores/statsStore';
import { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { updateFilters } from '../stores/membersStore';

export function Sidebar() {
    const stats = useStore($stats);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
        // Refresh stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    const handleFilterClick = (status: string) => {
        // Reset other filters and set status
        updateFilters({
            search: '',
            status: [status],
            state: 'all',
            tags: [],
            tagOperator: 'AND'
        });
        navigate('/dashboard');
    };

    const handleResetFilters = () => {
        updateFilters({
            search: '',
            status: [],
            state: 'all',
            tags: [],
            tagOperator: 'AND'
        });
    };

    return (
        <div className="fixed inset-y-0 left-0 w-64 gradient-bg text-white shadow-2xl z-40 flex flex-col">
            {/* Logo/Brand */}
            <div className="p-6 border-b border-white/20">
                <h1 className="text-2xl font-bold">🗳️ PoliCRM</h1>
                <p className="text-indigo-200 text-xs mt-1">Electoral Verification System</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <NavLink
                    to="/dashboard"
                    end
                    onClick={handleResetFilters}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`
                    }
                >
                    <span className="text-lg">📊</span>
                    <span>Dashboard</span>
                </NavLink>

                <NavLink
                    to="/war-room"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`
                    }
                >
                    <span className="text-lg">🗺️</span>
                    <span>War Room</span>
                </NavLink>

                <div className="border-t border-white/20 my-4"></div>

                <button
                    onClick={() => handleFilterClick('Verified')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <span className="text-lg">✅</span>
                    <span>Verified</span>
                    <span className="ml-auto bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.verified}
                    </span>
                </button>

                <button
                    onClick={() => handleFilterClick('Unchecked')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <span className="text-lg">⏳</span>
                    <span>Pending Check</span>
                    <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.unchecked}
                    </span>
                </button>

                <button
                    onClick={() => handleFilterClick('Partial')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <span className="text-lg">⚠️</span>
                    <span>Partial Matches</span>
                    <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.partial}
                    </span>
                </button>

                <button
                    onClick={() => handleFilterClick('Fail')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <span className="text-lg">❌</span>
                    <span>Failed Checks</span>
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.failed}
                    </span>
                </button>

                <button
                    onClick={() => handleFilterClick('Captcha')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <span className="text-lg">🔄</span>
                    <span>Captcha Issues</span>
                    <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.captcha}
                    </span>
                </button>

                <button
                    onClick={() => handleFilterClick('Duplicate')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <span className="text-lg">👯</span>
                    <span>Duplicates</span>
                    <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.duplicate}
                    </span>
                </button>

                <div className="border-t border-white/20 my-4"></div>

                {/* User Info */}
                <div className="px-4 py-3 mt-auto">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white">{auth.currentUser?.email}</p>
                        </div>
                        <button onClick={handleLogout} className="text-indigo-200 hover:text-white" title="Logout">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Footer Stats */}
            <div className="p-4 border-t border-white/20 bg-white/10">
                <div className="text-xs text-indigo-200 mb-2">Quick Stats</div>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white/10 rounded-lg p-2">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-xs text-indigo-200">Total</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                        <div className="text-2xl font-bold text-green-300">
                            {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%
                        </div>
                        <div className="text-xs text-indigo-200">Verified</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
