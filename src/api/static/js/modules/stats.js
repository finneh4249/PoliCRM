import { API_URL, fetchWithAuth } from './utils.js';

export async function loadDashboardStats() {
    try {
        const response = await fetchWithAuth(`${API_URL}/stats/dashboard`);
        const stats = await response.json();

        const container = document.getElementById('reportsContent');
        if (container) {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div class="text-sm font-medium text-slate-500 mb-1">Total Members</div>
                        <div class="text-3xl font-bold text-slate-900">${stats.total_members}</div>
                        <div class="text-xs text-green-600 mt-2">
                            +${stats.new_members_30d} in last 30 days
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div class="text-sm font-medium text-slate-500 mb-1">Verified Enrolled</div>
                        <div class="text-3xl font-bold text-green-600">${stats.verified_count}</div>
                        <div class="text-xs text-slate-500 mt-2">
                            ${stats.total_members > 0 ? Math.round((stats.verified_count / stats.total_members) * 100) : 0}% of total
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div class="text-sm font-medium text-slate-500 mb-1">Pending Check</div>
                        <div class="text-3xl font-bold text-slate-600">${stats.unchecked_count}</div>
                        <div class="text-xs text-slate-500 mt-2">
                            Requires verification
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div class="text-sm font-medium text-slate-500 mb-1">Issues</div>
                        <div class="text-3xl font-bold text-red-600">${stats.failed_count + stats.captcha_count}</div>
                        <div class="text-xs text-red-500 mt-2">
                            ${stats.failed_count} failed, ${stats.captcha_count} captcha
                        </div>
                    </div>
                </div>

                <!-- State Distribution -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">State Distribution</h3>
                    <div class="h-64 flex items-end justify-between gap-2">
                        ${Object.entries(stats.by_state).map(([state, count]) => `
                            <div class="flex flex-col items-center flex-1 group">
                                <div class="w-full bg-indigo-100 rounded-t-lg relative group-hover:bg-indigo-200 transition-all" 
                                     style="height: ${Math.max((count / stats.total_members) * 200, 4)}px">
                                     <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        ${count}
                                     </div>
                                </div>
                                <div class="mt-2 text-xs font-medium text-slate-500">${state}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

export async function loadElectorateStats() {
    try {
        const response = await fetchWithAuth(`${API_URL}/stats/electorates`);
        const electorates = await response.json();

        const container = document.getElementById('electorateStats');
        if (container) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100">
                        <h3 class="text-lg font-bold text-slate-800">Top Federal Electorates</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Division</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Verified Members</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Percentage</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-slate-200">
                                ${electorates.slice(0, 10).map((elec, index) => `
                                    <tr class="hover:bg-slate-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            ${index + 1}. ${elec.federal_division}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            ${elec.count}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            <div class="w-24 bg-slate-200 rounded-full h-2">
                                                <div class="bg-indigo-600 h-2 rounded-full" style="width: ${Math.min((elec.count / electorates[0].count) * 100, 100)}%"></div>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading electorate stats:', error);
    }
}

export function updateSidebarStats(allMembers) {
    const verified = allMembers.filter(m => m._status === 'Verified').length;
    const failed = allMembers.filter(m =>
        m._status === 'Fail' ||
        m._status === 'Fail_Suburb' ||
        m._status === 'Fail_Street' ||
        m._status === 'Fail_No_Match'
    ).length;
    const partial = allMembers.filter(m => m._status === 'Partial').length;
    const pending = allMembers.filter(m => m._status === 'Unchecked').length;
    const captcha = allMembers.filter(m => m._status === 'Captcha').length;
    const duplicates = allMembers.filter(m => m._isDuplicate).length;
    const total = allMembers.length;

    // Main dashboard stats (if visible)
    const totalEl = document.getElementById('totalMembers');
    if (totalEl) totalEl.innerText = total;

    const verifiedCountEl = document.getElementById('verifiedCount');
    if (verifiedCountEl) verifiedCountEl.innerText = verified;

    const verifiedPercentEl = document.getElementById('verifiedPercent');
    if (verifiedPercentEl) verifiedPercentEl.innerText = total > 0 ? Math.round((verified / total) * 100) + '%' : '0%';

    const pendingCountEl = document.getElementById('pendingCount');
    if (pendingCountEl) pendingCountEl.innerText = pending;

    const failedCountEl = document.getElementById('failedCount');
    if (failedCountEl) failedCountEl.innerText = failed;

    // Sidebar stats
    document.getElementById('sidebar-total').innerText = total;
    document.getElementById('sidebar-rate').innerText = total > 0 ? Math.round((verified / total) * 100) + '%' : '0%';
    document.getElementById('sidebar-verified-count').innerText = verified;
    document.getElementById('sidebar-pending-count').innerText = pending;
    document.getElementById('sidebar-failed-count').innerText = failed;
    document.getElementById('sidebar-captcha-count').innerText = captcha;
    document.getElementById('sidebar-partial-count').innerText = partial;
    document.getElementById('sidebar-duplicate-count').innerText = duplicates;
}
