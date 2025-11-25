const API_URL = '';
let allMembers = [];
let filteredMembers = [];
let selectedMembers = new Set();
let currentPage = 1;
let itemsPerPage = 20;
let sortField = 'id';
let sortAsc = true;
let currentMemberId = null;
let refreshInterval = null;
let refreshCountdown = 10;

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            showToast(`Debug: Signed in as ${user.email}`, 'info');
            // User is signed in.
            const token = await user.getIdToken();
            localStorage.setItem('authToken', token);

            loadMembers();
            loadTags();
            startRefreshTimer();

            // Update UI with user info
            document.getElementById('currentUserEmail').textContent = user.email;

            // Check if admin
            // We need to decode the token to check claims, or fetch user profile
            // For now, we'll just check if the email matches our known admins or fetch from backend
            checkAdminStatus();

        } else {
            // No user is signed in. Redirect to login.
            console.log("No user found in onAuthStateChanged, redirecting...");
            // Delay redirect slightly to see if it's just slow to load
            setTimeout(() => {
                if (!firebase.auth().currentUser) {
                    window.location.href = '/login';
                }
            }, 1000);
        }
    });
});

async function checkAdminStatus() {
    try {
        const token = localStorage.getItem('authToken');
        // We can create a /me endpoint or just try to fetch users
        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            document.getElementById('userManagementBtn').classList.remove('hidden');
            document.getElementById('currentUserRole').textContent = 'Admin';
        } else {
            document.getElementById('currentUserRole').textContent = 'User';
        }
    } catch (e) {
        console.error("Not admin");
    }
}

function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    });
}

// User Management
function openUserManagement() {
    document.getElementById('userModal').classList.remove('hidden');
    loadUsers();
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select onchange="updateUserRole(${user.id}, this.value)" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="toggleUserStatus(${user.id}, ${!user.is_active})" class="${user.is_active ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <!-- Actions -->
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load users", e);
        showToast("Failed to load users", "error");
    }
}

async function updateUserRole(userId, newRole) {
    try {
        const token = localStorage.getItem('authToken');
        await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role: newRole })
        });
        showToast("User role updated");
    } catch (e) {
        showToast("Failed to update role", "error");
    }
}

async function toggleUserStatus(userId, newStatus) {
    try {
        const token = localStorage.getItem('authToken');
        await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: newStatus })
        });
        loadUsers(); // Reload to update UI
        showToast("User status updated");
    } catch (e) {
        showToast("Failed to update status", "error");
    }
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', filterMembers);
document.getElementById('statusFilter').addEventListener('change', filterMembers);
document.getElementById('stateFilter').addEventListener('change', filterMembers);

// Tag Form Handler
document.getElementById('createTagForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createTag();
});

// User Creation Handler
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createUser();
});

async function createUser() {
    const email = document.getElementById('newUserEmail').value;
    const role = document.getElementById('newUserRole').value;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email, role, is_active: true })
        });

        if (response.ok) {
            showToast("User created successfully");
            document.getElementById('createUserForm').reset();
            loadUsers();
        } else {
            const data = await response.json();
            throw new Error(data.detail || "Failed to create user");
        }
    } catch (e) {
        showToast(e.message, "error");
    }
}

function startRefreshTimer() {
    refreshInterval = setInterval(() => {
        refreshCountdown--;
        document.getElementById('refreshTimer').textContent = `${refreshCountdown}s`;
        if (refreshCountdown <= 0) {
            loadMembers(true); // Silent refresh
            refreshCountdown = 10;
        }
    }, 1000);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

    toast.className = `${bgClass} text-white px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 translate-x-full opacity-0 flex items-center gap-3 min-w-[300px]`;
    toast.innerHTML = `
        <span class="text-2xl">${icon}</span>
        <span class="font-medium flex-grow">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white text-xl leading-none">×</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full', 'opacity-0'), 50);
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

async function loadMembers(silent = false) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        allMembers = await response.json();

        // Process members
        allMembers = allMembers.map(m => {
            const lastCheck = m.check_results.length > 0 ? m.check_results[m.check_results.length - 1] : null;
            let status = 'Unchecked';
            let electorate = '-';

            if (lastCheck) {
                if (lastCheck.result === 'Pass') {
                    status = 'Verified';
                    electorate = lastCheck.federal_division || '-';
                } else if (lastCheck.result === 'Captcha') {
                    status = 'Captcha';
                } else {
                    // Preserve specific failure types for clearer user feedback
                    status = lastCheck.result; // e.g., 'Fail', 'Fail_Suburb', 'Fail_Street', 'Fail_No_Match'
                }
            } else if (lastCheck && lastCheck.result === 'Partial') {
                status = 'Partial';
            }

            return {
                ...m,
                _status: status,
                _electorate: electorate,
                _fullName: `${m.first_name} ${m.middle_name || ''} ${m.last_name}`.toLowerCase().trim(),
                _lastCheck: lastCheck
            };
        });

        filterMembers();
        if (!silent) showToast('Members loaded successfully', 'info');
    } catch (error) {
        console.error('Error loading members:', error);
        if (!silent) showToast('Failed to load members', 'error');
    }
}

function filterMembers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value;
    const stateFilter = document.getElementById('stateFilter').value;

    filteredMembers = allMembers.filter(member => {
        const matchesSearch = !searchTerm ||
            member._fullName.includes(searchTerm) ||
            member.primary_city.toLowerCase().includes(searchTerm) ||
            member._electorate.toLowerCase().includes(searchTerm) ||
            String(member.nationbuilder_id).includes(searchTerm);

        // Handle "Fail" filter to show all failure types
        let matchesStatus;
        if (statusFilter === 'all') {
            matchesStatus = true;
        } else if (statusFilter === 'Fail') {
            // Show all failure types when filtering by "Fail"
            matchesStatus = member._status === 'Fail' ||
                member._status === 'Fail_Suburb' ||
                member._status === 'Fail_Street' ||
                member._status === 'Fail_No_Match';
        } else if (statusFilter === 'Partial') {
            matchesStatus = member._status === 'Partial';
        } else {
            matchesStatus = member._status === statusFilter;
        }

        const matchesState = stateFilter === 'all' || member.primary_state === stateFilter;

        return matchesSearch && matchesStatus && matchesState;
    });

    updateStats();
    currentPage = 1;
    renderTable();
}

function updateStats() {
    const verified = allMembers.filter(m => m._status === 'Verified').length;
    // Count all failure types together for the main stat
    const failed = allMembers.filter(m =>
        m._status === 'Fail' ||
        m._status === 'Fail_Suburb' ||
        m._status === 'Fail_Street' ||
        m._status === 'Fail_No_Match'
    ).length;
    const partial = allMembers.filter(m => m._status === 'Partial').length;
    const pending = allMembers.filter(m => m._status === 'Unchecked').length;
    const captcha = allMembers.filter(m => m._status === 'Captcha').length;
    const total = allMembers.length;

    // Main dashboard stats
    document.getElementById('totalMembers').innerText = total;
    document.getElementById('verifiedCount').innerText = verified;
    document.getElementById('verifiedPercent').innerText = total > 0 ? Math.round((verified / total) * 100) + '%' : '0%';
    document.getElementById('pendingCount').innerText = pending;
    document.getElementById('failedCount').innerText = failed;

    // Sidebar stats
    document.getElementById('sidebar-total').innerText = total;
    document.getElementById('sidebar-rate').innerText = total > 0 ? Math.round((verified / total) * 100) + '%' : '0%';
    document.getElementById('sidebar-verified-count').innerText = verified;
    document.getElementById('sidebar-pending-count').innerText = pending;
    document.getElementById('sidebar-failed-count').innerText = failed;
    document.getElementById('sidebar-captcha-count').innerText = captcha;
}

function setActiveView(view) {
    // Update navigation active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById(`nav-${view}`).classList.add('active');

    // Update page title
    const titles = {
        'dashboard': { title: 'Dashboard', subtitle: 'Overview of member enrollment verification' },
        'members': { title: 'All Members', subtitle: 'Complete member directory' },
        'verified': { title: 'Verified Members', subtitle: 'Successfully verified enrollments' },
        'pending': { title: 'Pending Verification', subtitle: 'Members awaiting enrollment check' },
        'failed': { title: 'Failed Verifications', subtitle: 'Members with verification issues' },
        'captcha': { title: 'Captcha Issues', subtitle: 'Members requiring retry due to captcha' }
    };

    document.getElementById('page-title').textContent = titles[view].title;
    document.getElementById('page-subtitle').textContent = titles[view].subtitle;

    // Update filters based on view
    document.getElementById('searchInput').value = '';
    document.getElementById('stateFilter').value = 'all';

    switch (view) {
        case 'dashboard':
            document.getElementById('statusFilter').value = 'all';
            break;
        case 'members':
            document.getElementById('statusFilter').value = 'all';
            break;
        case 'verified':
            document.getElementById('statusFilter').value = 'Verified';
            break;
        case 'pending':
            document.getElementById('statusFilter').value = 'Unchecked';
            break;
        case 'failed':
            document.getElementById('statusFilter').value = 'Fail';
            break;
        case 'captcha':
            document.getElementById('statusFilter').value = 'Captcha';
            break;
    }

    filterMembers();
}

function sortBy(field) {
    if (sortField === field) {
        sortAsc = !sortAsc;
    } else {
        sortField = field;
        sortAsc = true;
    }
    renderTable();
}

function toggleSelectAll() {
    const isChecked = document.getElementById('selectAll').checked;
    const pageStart = (currentPage - 1) * itemsPerPage;
    const pageEnd = Math.min(pageStart + itemsPerPage, filteredMembers.length);

    for (let i = pageStart; i < pageEnd; i++) {
        if (isChecked) {
            selectedMembers.add(filteredMembers[i].id);
        } else {
            selectedMembers.delete(filteredMembers[i].id);
        }
    }

    updateSelectedCount();
    renderTable();
}

function toggleMemberSelection(id) {
    if (selectedMembers.has(id)) {
        selectedMembers.delete(id);
    } else {
        selectedMembers.add(id);
    }
    updateSelectedCount();
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = selectedMembers.size;
    document.getElementById('checkSelectedBtn').disabled = selectedMembers.size === 0;
}

function renderTable() {
    // Sort
    filteredMembers.sort((a, b) => {
        let valA, valB;
        if (sortField === 'name') { valA = a._fullName; valB = b._fullName; }
        else if (sortField === 'id') { valA = a.nationbuilder_id; valB = b.nationbuilder_id; }
        else if (sortField === 'status') { valA = a._status; valB = b._status; }
        else { valA = a.id; valB = b.id; }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    // Paginate
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredMembers.length);
    const pageItems = filteredMembers.slice(start, end);

    const tbody = document.getElementById('membersTableBody');
    tbody.innerHTML = '';

    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                    <div class="text-5xl mb-3">🔍</div>
                    <div class="text-lg font-medium">No members found</div>
                    <div class="text-sm mt-1">Try adjusting your filters</div>
                </td>
            </tr>
        `;
        document.getElementById('showingStats').innerText = 'No results';
        return;
    }

    pageItems.forEach(member => {
        const isSelected = selectedMembers.has(member.id);
        let statusHtml = '';

        if (member._status === 'Verified') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">✓ Verified</span>';
        } else if (member._status === 'Captcha') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">🔄 Captcha</span>';
        } else if (member._status === 'Partial') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">⚠ Partial Match</span>';
        } else if (member._status === 'Fail_Suburb') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">✗ Suburb Not Found</span>';
        } else if (member._status === 'Fail_Street') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">✗ Street Not Found</span>';
        } else if (member._status === 'Fail_No_Match') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">✗ Not Enrolled</span>';
        } else if (member._status === 'Fail' || member._status === 'Partial') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">✗ Failed</span>';
        } else {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">⏳ Unchecked</span>';
        }

        const row = `
            <tr class="hover:bg-indigo-50/50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}">
                <td class="px-6 py-4">
                    <input type="checkbox" class="checkbox-custom" ${isSelected ? 'checked' : ''} 
                        onchange="toggleMemberSelection(${member.id})">
                </td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-slate-900">${member.first_name} ${member.middle_name ? member.middle_name + ' ' : ''}${member.last_name}</div>
                    <div class="text-xs text-slate-500">${member.primary_state}</div>
                </td>
                <td class="px-6 py-4 text-slate-600">
                    <div>${member.primary_address1}</div>
                    <div class="text-xs text-slate-500">${member.primary_city}, ${member.primary_zip}</div>
                </td>
                <td class="px-6 py-4 text-slate-600 font-mono text-sm">${member.nationbuilder_id}</td>
                <td class="px-6 py-4">${statusHtml}</td>
                <td class="px-6 py-4 text-slate-600 font-medium">${member._electorate}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="showMemberDetail(${member.id})" 
                            class="text-indigo-600 hover:text-indigo-900 font-medium text-sm hover:underline">
                            View
                        </button>
                        <button onclick="checkMember(${member.id}, event)" 
                            class="text-blue-600 hover:text-blue-900 font-medium text-sm hover:underline">
                            Check
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // Update Pagination
    document.getElementById('showingStats').innerText = `Showing ${start + 1}-${end} of ${filteredMembers.length}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = end >= filteredMembers.length;

    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    const pageNumbersDiv = document.getElementById('pageNumbers');
    pageNumbersDiv.innerHTML = `<span class="px-3 py-1 text-sm font-medium text-slate-700">Page ${currentPage} of ${totalPages || 1}</span>`;
}

function changePage(delta) {
    currentPage += delta;
    renderTable();
}

function changeItemsPerPage() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPageSelect').value);
    currentPage = 1;
    renderTable();
}

function showMemberDetail(id) {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;

    currentMemberId = id;

    // Fetch fresh member data with tags and notes
    const token = localStorage.getItem('authToken');
    fetch(`${API_URL}/members/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(fullMember => {
            document.getElementById('detailMemberName').textContent =
                `${fullMember.first_name} ${fullMember.middle_name || ''} ${fullMember.last_name}`.trim();

            const detailContent = document.getElementById('memberDetailContent');
            detailContent.innerHTML = `
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Personal Information</h3>
                        <dl class="space-y-2">
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">Full Name</dt>
                                <dd class="text-sm text-slate-900 font-medium">${fullMember.first_name} ${fullMember.middle_name || ''} ${fullMember.last_name}</dd>
                            </div>
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">NationBuilder ID</dt>
                                <dd class="text-sm text-slate-900 font-mono">${fullMember.nationbuilder_id}</dd>
                            </div>
                            ${fullMember.email ? `
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">Email</dt>
                                <dd class="text-sm text-slate-900">${fullMember.email}</dd>
                            </div>
                            ` : ''}
                            ${fullMember.phone ? `
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">Phone</dt>
                                <dd class="text-sm text-slate-900">${fullMember.phone}</dd>
                            </div>
                            ` : ''}
                            ${fullMember.membership_status ? `
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">Membership Status</dt>
                                <dd class="text-sm">
                                    <span class="inline-flex px-2 py-1 rounded text-xs font-semibold ${fullMember.membership_status === 'active' ? 'bg-green-100 text-green-800' :
                        fullMember.membership_status === 'lapsed' ? 'bg-orange-100 text-orange-800' :
                            'bg-slate-100 text-slate-800'
                    }">${fullMember.membership_status}</span>
                                </dd>
                            </div>
                            ` : ''}
                        </dl>
                    </div>
                    
                    <div>
                        <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Address</h3>
                        <dl class="space-y-2">
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">Street</dt>
                                <dd class="text-sm text-slate-900">${fullMember.primary_address1}</dd>
                            </div>
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">Suburb</dt>
                                <dd class="text-sm text-slate-900">${fullMember.primary_city}</dd>
                            </div>
                            <div>
                                <dt class="text-xs text-slate-500 font-semibold">State & Postcode</dt>
                                <dd class="text-sm text-slate-900">${fullMember.primary_state} ${fullMember.primary_zip}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <!-- Tags Section -->
                <div class="border-t border-slate-200 pt-6 mt-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide">Tags</h3>
                        <button onclick="showAddTagToMember(${id})" 
                            class="text-xs text-indigo-600 hover:text-indigo-900 font-medium hover:underline">
                            + Add Tag
                        </button>
                    </div>
                    <div id="memberTagsContainer" class="flex flex-wrap gap-2">
                        ${fullMember.tags && fullMember.tags.length > 0 ?
                    fullMember.tags.map(tag => `
                                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border"
                                    style="background-color: ${tag.color}20; border-color: ${tag.color}; color: ${tag.color}">
                                    ${tag.name}
                                    <button onclick="removeTagFromMember(${id}, ${tag.id})" 
                                        class="hover:opacity-70">×</button>
                                </span>
                            `).join('') :
                    '<p class="text-slate-500 text-sm italic">No tags assigned</p>'
                }
                    </div>
                </div>

                <!-- Notes Section -->
                <div class="border-t border-slate-200 pt-6 mt-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide">Notes</h3>
                    </div>
                    <div class="mb-4">
                        <textarea id="newNoteInput" placeholder="Add a note..." 
                            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            rows="2"></textarea>
                        <button onclick="addNoteToMember(${id})" 
                            class="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                            Add Note
                        </button>
                    </div>
                    <div id="memberNotesContainer" class="space-y-3">
                        ${fullMember.notes && fullMember.notes.length > 0 ?
                    fullMember.notes.map(note => `
                                <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                    <div class="text-sm text-slate-900">${note.note}</div>
                                    <div class="text-xs text-slate-500 mt-2">
                                        ${note.created_by ? `By ${note.created_by} • ` : ''}
                                        ${new Date(note.created_at).toLocaleString()}
                                    </div>
                                </div>
                            `).join('') :
                    '<p class="text-slate-500 text-sm italic">No notes yet</p>'
                }
                    </div>
                </div>
                
                <div class="border-t border-slate-200 pt-6 mt-6">
                    <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">AEC Verification History</h3>
                    ${fullMember.check_results.length === 0 ?
                    '<p class="text-slate-500 text-sm italic">No checks performed yet</p>' :
                    `<div class="space-y-3">
                            ${fullMember.check_results.slice().reverse().map(check => `
                                <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div class="flex justify-between items-start mb-2">
                                        <span class="text-xs font-semibold text-slate-500">${new Date(check.timestamp).toLocaleString()}</span>
                                        <span class="text-xs px-2 py-1 rounded font-medium ${check.result === 'Pass' ? 'bg-green-100 text-green-800' :
                            check.result === 'Captcha' ? 'bg-orange-100 text-orange-800' :
                                check.result === 'Fail_Suburb' ? 'bg-red-100 text-red-800' :
                                    check.result === 'Fail_Street' ? 'bg-red-100 text-red-800' :
                                        check.result === 'Fail_No_Match' ? 'bg-red-100 text-red-800' :
                                            'bg-red-100 text-red-800'
                        }">${check.result === 'Pass' ? '✓ Pass' :
                            check.result === 'Captcha' ? '🔄 Captcha' :
                                check.result === 'Fail_Suburb' ? '✗ Suburb Not Found' :
                                    check.result === 'Fail_Street' ? '✗ Street Not Found' :
                                        check.result === 'Fail_No_Match' ? '✗ Not Enrolled' :
                                            check.result
                        }</span>
                                    </div>
                                    ${check.federal_division ? `
                                        <dl class="grid grid-cols-2 gap-2 text-xs mt-2">
                                            <div><dt class="text-slate-500">Federal:</dt><dd class="font-medium">${check.federal_division}</dd></div>
                                            ${check.state_division ? `<div><dt class="text-slate-500">State:</dt><dd class="font-medium">${check.state_division}</dd></div>` : ''}
                                            ${check.local_government ? `<div><dt class="text-slate-500">LGA:</dt><dd class="font-medium">${check.local_government}</dd></div>` : ''}
                                        </dl>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>`
                }
                </div>
            `;

            document.getElementById('memberDetailModal').classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error loading member details:', error);
            showToast('Failed to load member details', 'error');
        });
}

function recheckCurrentMember() {
    if (currentMemberId) {
        checkMember(currentMemberId);
        document.getElementById('memberDetailModal').classList.add('hidden');
    }
}

async function checkMember(id, event = null) {
    try {
        if (event) {
            const btn = event.target;
            btn.textContent = 'Queuing...';
            btn.disabled = true;
        }

        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_URL}/members/${id}/check`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Enrollment check queued');
        } else {
            throw new Error('Failed');
        }
    } catch (error) {
        showToast('Failed to queue check', 'error');
    }
}

async function checkSelected() {
    if (selectedMembers.size === 0) return;

    if (!confirm(`Queue enrollment checks for ${selectedMembers.size} selected members?`)) return;

    let count = 0;
    for (const id of selectedMembers) {
        try {
            const token = localStorage.getItem('authToken');
            await fetch(`${API_URL}/members/${id}/check`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            count++;
        } catch (e) { console.error(e); }
    }

    showToast(`Queued ${count} enrollment checks`);
    selectedMembers.clear();
    updateSelectedCount();
    renderTable();
}

async function retryCaptchas() {
    const captchaMembers = allMembers.filter(m => m._status === 'Captcha');

    if (captchaMembers.length === 0) {
        showToast('No captcha failures found', 'info');
        return;
    }

    if (!confirm(`Retry ${captchaMembers.length} captcha failures?`)) return;

    let count = 0;
    for (const member of captchaMembers) {
        try {
            const token = localStorage.getItem('authToken');
            await fetch(`${API_URL}/members/${member.id}/check`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            count++;
        } catch (e) { console.error(e); }
    }

    showToast(`Queued ${count} captcha retries`);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('stateFilter').value = 'all';
    filterMembers();
}

function exportSelected() {
    const membersToExport = allMembers.filter(m => selectedMembers.has(m.id));
    if (membersToExport.length === 0) {
        showToast('No members selected', 'error');
        return;
    }
    exportCSVData(membersToExport, 'aec_crm_selected.csv');
}

function exportAll() {
    exportCSVData(filteredMembers, 'aec_crm_export.csv');
}

function exportCSVData(members, filename) {
    const headers = ['First Name', 'Middle Name', 'Last Name', 'NB ID', 'Address', 'Suburb', 'State', 'Postcode', 'Status', 'Federal Electorate', 'State Electorate', 'LGA'];
    const csvContent = [
        headers.join(','),
        ...members.map(m => {
            const lastCheck = m._lastCheck;
            return [
                `"${m.first_name}"`,
                `"${m.middle_name || ''}"`,
                `"${m.last_name}"`,
                m.nationbuilder_id,
                `"${m.primary_address1}"`,
                `"${m.primary_city}"`,
                m.primary_state,
                m.primary_zip,
                m._status,
                lastCheck?.federal_division || '',
                lastCheck?.state_division || '',
                lastCheck?.local_government || ''
            ].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    showToast(`Exported ${members.length} members`);
}

async function uploadCSV() {
    const fileInput = document.getElementById('csvInput');
    if (fileInput.files.length === 0) {
        showToast('Please select a file first', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const modal = document.getElementById('importModal');
    const originalFileName = document.getElementById('fileName').innerText;

    // Show loading state
    document.getElementById('fileName').innerText = '⏳ Importing and queuing checks...';

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/members/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            const summary = `${result.message}. ${result.queued} checks queued.${result.skipped > 0 ? ` ${result.skipped} skipped (duplicates).` : ''}${result.errors > 0 ? ` ${result.errors} errors.` : ''}`;
            showToast(summary, 'success');
            modal.classList.add('hidden');
            loadMembers();
        } else {
            showToast('Import failed: ' + (result.detail || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed - check console for details', 'error');
    } finally {
        fileInput.value = '';
        document.getElementById('fileName').innerText = 'No file selected';
    }
}

// Add Member Form Handler
document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.nationbuilder_id = parseInt(data.nationbuilder_id);

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('Member added successfully and queued for AEC check');
            document.getElementById('addMemberModal').classList.add('hidden');
            e.target.reset();
            loadMembers();
        } else {
            const err = await response.json();
            showToast('Error: ' + err.detail, 'error');
        }
    } catch (error) {
        showToast('Failed to add member', 'error');
    }
});

// File Input Change Listener
document.getElementById('csvInput').addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
        document.getElementById('fileName').innerText = e.target.files[0].name;
    }
});

// Drag and Drop functionality
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('bg-indigo-100', 'border-indigo-500');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('bg-indigo-100', 'border-indigo-500');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('bg-indigo-100', 'border-indigo-500');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
        const csvInput = document.getElementById('csvInput');
        csvInput.files = files;
        document.getElementById('fileName').innerText = files[0].name;
        // Auto-trigger upload after drop
        uploadCSV();
    } else {
        showToast('Please drop a CSV file', 'error');
    }
});

// ========== TAG MANAGEMENT ==========
let allTags = [];

async function openTagManager() {
    await loadTags();
    document.getElementById('tagModal').classList.remove('hidden');
}

async function loadTags() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/tags`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allTags = await response.json();
        renderTagsList();
    } catch (error) {
        console.error('Error loading tags:', error);
        showToast('Failed to load tags', 'error');
    }
}

function renderTagsList() {
    const container = document.getElementById('tagsListContainer');
    if (allTags.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-sm italic py-4">No tags created yet</p>';
        return;
    }

    container.innerHTML = allTags.map(tag => `
        <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
            <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded-full border border-slate-300" style="background-color: ${tag.color}"></div>
                <div>
                    <div class="font-medium text-slate-900">${tag.name}</div>
                    ${tag.description ? `<div class="text-xs text-slate-500">${tag.description}</div>` : ''}
                </div>
            </div>
            <button onclick="deleteTag(${tag.id})" 
                class="text-red-600 hover:text-red-900 text-sm font-medium hover:underline">
                Delete
            </button>
        </div>
    `).join('');
}

async function createTag() {
    const form = document.getElementById('createTagForm');
    const formData = new FormData(form);
    const data = {
        name: formData.get('tag_name'),
        color: formData.get('tag_color'),
        description: formData.get('tag_description') || null
    };

    try {
        const response = await fetch(`${API_URL}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('Tag created successfully');
            form.reset();
            await loadTags();
        } else {
            const err = await response.json();
            showToast('Error: ' + err.detail, 'error');
        }
    } catch (error) {
        showToast('Failed to create tag', 'error');
    }
}

async function deleteTag(tagId) {
    if (!confirm('Delete this tag? It will be removed from all members.')) return;

    try {
        const response = await fetch(`${API_URL}/tags/${tagId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Tag deleted');
            await loadTags();
        } else {
            showToast('Failed to delete tag', 'error');
        }
    } catch (error) {
        showToast('Failed to delete tag', 'error');
    }
}

// ========== REPORTS DASHBOARD ==========
async function openReports() {
    document.getElementById('reportsModal').classList.remove('hidden');
    await loadDashboardStats();
    await loadElectorateStats();
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/stats/dashboard`);
        const stats = await response.json();

        const container = document.getElementById('reportsContent');
        container.innerHTML = `
            <div class="grid grid-cols-3 gap-6 mb-6">
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                    <div class="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Total Members</div>
                    <div class="text-4xl font-bold text-blue-900">${stats.total_members}</div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                    <div class="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Verified</div>
                    <div class="text-4xl font-bold text-green-900">${stats.verified_count}</div>
                    <div class="text-xs text-green-700 mt-1">${Math.round((stats.verified_count / stats.total_members) * 100) || 0}% verification rate</div>
                </div>
                <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                    <div class="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Pending</div>
                    <div class="text-4xl font-bold text-amber-900">${stats.unchecked_count}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-6 mb-6">
                <div class="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Status Breakdown</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-slate-600">Verified</span>
                            <span class="font-bold text-green-600">${stats.verified_count}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-slate-600">Failed</span>
                            <span class="font-bold text-red-600">${stats.failed_count}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-slate-600">Unchecked</span>
                            <span class="font-bold text-slate-600">${stats.unchecked_count}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-slate-600">Captcha</span>
                            <span class="font-bold text-orange-600">${stats.captcha_count}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">State Distribution</h3>
                    <div class="space-y-3" id="stateDistribution">
                        ${Object.entries(stats.by_state).map(([state, count]) => `
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-slate-600 font-mono">${state}</span>
                                <span class="font-bold text-slate-900">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-6">
                <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Top Electorates</h3>
                <div id="electorateStats"></div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Failed to load dashboard statistics', 'error');
    }
}

async function loadElectorateStats() {
    try {
        const response = await fetch(`${API_URL}/stats/electorates`);
        const electorates = await response.json();

        const container = document.getElementById('electorateStats');
        if (electorates.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-sm italic">No electorate data available</p>';
            return;
        }

        const maxCount = Math.max(...electorates.map(e => e.count));

        container.innerHTML = electorates.slice(0, 10).map(electorate => {
            const barWidth = (electorate.count / maxCount) * 100;
            return `
                <div class="mb-3">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-slate-700">${electorate.federal_division}</span>
                        <span class="text-sm font-bold text-indigo-600">${electorate.count}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                            style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading electorate stats:', error);
    }
}

async function addNoteToMember(memberId) {
    const noteText = document.getElementById('newNoteInput').value.trim();
    if (!noteText) {
        showToast('Please enter a note', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/members/${memberId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note: noteText,
                created_by: 'System' // TODO: Replace with actual user
            })
        });

        if (response.ok) {
            showToast('Note added');
            document.getElementById('newNoteInput').value = '';
            showMemberDetail(memberId); // Refresh
        } else {
            showToast('Failed to add note', 'error');
        }
    } catch (error) {
        showToast('Failed to add note', 'error');
    }
}

async function showAddTagToMember(memberId) {
    if (allTags.length === 0) {
        await loadTags();
    }

    const member = allMembers.find(m => m.id === memberId);
    const memberTagIds = member.tags ? member.tags.map(t => t.id) : [];
    const availableTags = allTags.filter(t => !memberTagIds.includes(t.id));

    if (availableTags.length === 0) {
        showToast('No available tags to add', 'info');
        return;
    }

    const tagOptions = availableTags.map(tag =>
        `<option value="${tag.id}">${tag.name}</option>`
    ).join('');

    const select = document.createElement('select');
    select.className = 'border border-slate-300 rounded px-3 py-2 text-sm';
    select.innerHTML = `<option value="">Select tag...</option>${tagOptions}`;

    const result = confirm('Select a tag to add (this is a demo - in production use a better UI)');
    if (result) {
        const tagId = prompt('Enter tag ID to add:');
        if (tagId) {
            await addTagToMember(memberId, parseInt(tagId));
        }
    }
}

async function addTagToMember(memberId, tagId) {
    try {
        const response = await fetch(`${API_URL}/members/${memberId}/tags/${tagId}`, {
            method: 'POST'
        });

        if (response.ok) {
            showToast('Tag added');
            showMemberDetail(memberId); // Refresh
            loadMembers(true); // Refresh main list
        } else {
            showToast('Failed to add tag', 'error');
        }
    } catch (error) {
        showToast('Failed to add tag', 'error');
    }
}

async function removeTagFromMember(memberId, tagId) {
    try {
        const response = await fetch(`${API_URL}/members/${memberId}/tags/${tagId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Tag removed');
            showMemberDetail(memberId); // Refresh
            loadMembers(true); // Refresh main list
        } else {
            showToast('Failed to remove tag', 'error');
        }
    } catch (error) {
        showToast('Failed to remove tag', 'error');
    }
}

function closeMemberDetail() {
    document.getElementById('memberDetailModal').classList.add('hidden');
    currentMemberId = null;
}

async function deleteMemberConfirm() {
    if (!currentMemberId) return;

    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/members/${currentMemberId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Member deleted');
            closeMemberDetail();
            loadMembers();
        } else {
            showToast('Failed to delete member', 'error');
        }
    } catch (error) {
        showToast('Failed to delete member', 'error');
    }
}
