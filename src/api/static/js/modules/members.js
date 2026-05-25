import { API_URL, fetchWithAuth, showToast, escapeHTML } from './utils.js';
import { updateSidebarStats } from './stats.js';
import { addTagToMember, removeTagFromMember, getSelectedTagIds, getTagOperator } from './tags.js';

let allMembers = [];
let filteredMembers = [];
let selectedMembers = new Set();
let currentPage = 1;
let itemsPerPage = 20;
let sortField = 'id';
let sortAsc = true;
let currentMemberId = null;

// Export state getters for other modules if needed
export function getFilteredMembers() { return filteredMembers; }
export function getSelectedMembers() { return selectedMembers; }
export function getAllMembers() { return allMembers; }

export async function loadMembers(silent = false) {
    try {
        const response = await fetchWithAuth(`${API_URL}/members`);
        allMembers = await response.json();

        // Process members
        allMembers = allMembers.map(m => {
            const lastCheck = m.check_results.length > 0 ? m.check_results.at(-1) : null;
            let status = 'Unchecked';
            let electorate = '-';

            if (lastCheck) {
                switch (lastCheck.result) {
                    case 'Pass':
                        status = 'Verified';
                        electorate = lastCheck.federal_division || '-';
                        break;
                    case 'Captcha':
                        status = 'Captcha';
                        break;
                    case 'Partial':
                        status = 'Partial';
                        break;
                    default:
                        status = lastCheck.result;
                }
            }

            return {
                ...m,
                _status: status,
                _electorate: electorate,
                _fullName: `${m.first_name} ${m.middle_name || ''} ${m.last_name}`.toLowerCase().trim(),
                _lastCheck: lastCheck,
                _isDuplicate: m.is_duplicate
            };
        });

        filterMembers();
        if (!silent) showToast('Members loaded successfully', 'info');
    } catch (error) {
        console.error('Error loading members:', error);
        if (!silent) showToast('Failed to load members', 'error');
    }
}

export function filterMembers() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const stateFilterEl = document.getElementById('stateFilter');
    const stateFilter = stateFilterEl ? stateFilterEl.value : 'all';

    // Tag Filters
    const selectedTagIds = getSelectedTagIds();
    const tagOperator = getTagOperator();

    // Status Filters (from checkboxes)
    const statusCheckboxes = document.querySelectorAll('.status-checkbox:checked');
    const selectedStatuses = Array.from(statusCheckboxes).map(cb => cb.value);

    filteredMembers = allMembers.filter(member => {
        const matchesSearch = !searchTerm ||
            member._fullName.includes(searchTerm) ||
            (member.primary_city && member.primary_city.toLowerCase().includes(searchTerm)) ||
            member._electorate.toLowerCase().includes(searchTerm) ||
            String(member.nationbuilder_id).includes(searchTerm);

        // Status matching
        let matchesStatus = true;
        if (selectedStatuses.length > 0) {
            switch (true) {
                case selectedStatuses.includes('Fail'):
                    matchesStatus = member._status === 'Fail' ||
                        member._status === 'Fail_Suburb' ||
                        member._status === 'Fail_Street' ||
                        member._status === 'Fail_No_Match';
                    break;
                case selectedStatuses.includes('Duplicate'):
                    matchesStatus = member._isDuplicate;
                    break;
                default:
                    matchesStatus = selectedStatuses.includes(member._status);
            }
        }

        const matchesState = stateFilter === 'all' || member.primary_state === stateFilter;

        // Tag Matching
        let matchesTags = true;
        if (selectedTagIds.length > 0) {
            const memberTagIds = member.tags.map(t => t.id);
            if (tagOperator === 'AND') {
                // Member must have ALL selected tags
                matchesTags = selectedTagIds.every(id => memberTagIds.includes(id));
            } else {
                // Member must have AT LEAST ONE selected tag
                matchesTags = selectedTagIds.some(id => memberTagIds.includes(id));
            }
        }

        return matchesSearch && matchesStatus && matchesState && matchesTags;
    });

    updateSidebarStats(allMembers);
    currentPage = 1;
    renderTable();
}

// Status Filter Logic
export function updateStatusFilterDisplay() {
    const checkboxes = document.querySelectorAll('.status-checkbox:checked');
    const label = document.getElementById('statusFilterLabel');

    if (checkboxes.length === 0) {
        label.textContent = 'All Statuses';
    } else if (checkboxes.length === 1) {
        label.textContent = checkboxes[0].parentNode.textContent.trim();
    } else {
        label.textContent = `${checkboxes.length} Selected`;
    }

    filterMembers();
}

export function setStatusPreset(preset) {
    const checkboxes = document.querySelectorAll('.status-checkbox');
    checkboxes.forEach(cb => cb.checked = false);

    if (preset === 'action_required') {
        // Select Partial, Captcha, Fail, Unchecked, Duplicate
        ['Partial', 'Captcha', 'Fail', 'Unchecked', 'Duplicate'].forEach(val => {
            const cb = document.querySelector(`.status-checkbox[value="${val}"]`);
            if (cb) cb.checked = true;
        });
    } else if (preset === 'safe') {
        // Select Verified
        const cb = document.querySelector(`.status-checkbox[value="Verified"]`);
        if (cb) cb.checked = true;
    }

    updateStatusFilterDisplay();
}

export function clearStatusFilters() {
    const checkboxes = document.querySelectorAll('.status-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateStatusFilterDisplay();
}

export function renderTable() {
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (filteredMembers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                    <div class="text-5xl mb-3">🔍</div>
                    <div class="text-lg font-medium">No members found</div>
                    <div class="text-sm mt-1">Try adjusting your filters</div>
                </td>
            </tr>
        `;
        const showingStats = document.getElementById('showingStats');
        if (showingStats) showingStats.innerText = 'No results';
        return;
    }

    // Calculate pagination
    const pageStart = (currentPage - 1) * itemsPerPage;
    const pageEnd = Math.min(pageStart + itemsPerPage, filteredMembers.length);
    const pageMembers = filteredMembers.slice(pageStart, pageEnd);

    pageMembers.forEach(member => {
        const isSelected = selectedMembers.has(member.id);
        let statusHtml = '';

        if (member._status === 'Verified') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">✓ Verified</span>';
        } else if (member._status === 'Captcha') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">🔄 Captcha</span>';
        } else if (member._status === 'Partial') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">⚠ Partial Match</span>';
        } else if (member._status === 'Fail' || (member._status && member._status.startsWith('Fail_'))) {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">✗ Failed</span>';
        } else if (member._status === 'Duplicate') {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">👯 Duplicate</span>';
        } else {
            statusHtml = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">⏳ Unchecked</span>';
        }

        const row = `
            <tr class="hover:bg-indigo-50/50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}">
                <td class="px-6 py-4">
                    <input type="checkbox" class="checkbox-custom" ${isSelected ? 'checked' : ''} 
                        data-id="${member.id}">
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
                        <button onclick="window.showMemberDetail(${member.id})" 
                            class="text-indigo-600 hover:text-indigo-900 font-medium text-sm hover:underline">
                            View
                        </button>
                        <button onclick="window.checkMember(${member.id}, event)" 
                            class="text-blue-600 hover:text-blue-900 font-medium text-sm hover:underline">
                            Check
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // Add event listeners for checkboxes
    document.querySelectorAll('.checkbox-custom').forEach(cb => {
        cb.addEventListener('change', (e) => {
            toggleMemberSelection(parseInt(e.target.dataset.id));
        });
    });

    // Update Pagination Display
    const showingStats = document.getElementById('showingStats');
    if (showingStats) {
        showingStats.innerText = `Showing ${pageStart + 1}-${pageEnd} of ${filteredMembers.length}`;
    }
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = pageEnd >= filteredMembers.length;
}

export function toggleMemberSelection(id) {
    if (selectedMembers.has(id)) {
        selectedMembers.delete(id);
    } else {
        selectedMembers.add(id);
    }
    updateSelectedCount();
    // Re-render to update row styling
    renderTable();
}

export function updateSelectedCount() {
    const count = selectedMembers.size;
    const countEl = document.getElementById('selectedCount');
    if (countEl) countEl.innerText = `${count} Selected`;
}

// Member Editing Logic
export function enableEditMode() {
    const detailContent = document.getElementById('memberDetailContent');
    if (!detailContent) return;

    // Convert display fields to inputs
    const fields = detailContent.querySelectorAll('[data-field]');
    fields.forEach(field => {
        const fieldName = field.dataset.field;
        const currentValue = field.textContent.trim();

        if (fieldName === 'party') {
            // Party Dropdown
            // We need to fetch parties first or assume they are loaded in window.parties
            let options = '<option value="">None</option>';
            if (window.parties) {
                window.parties.forEach(p => {
                    options += `<option value="${escapeHTML(p.id)}" ${currentValue === p.name ? 'selected' : ''}>${escapeHTML(p.name)} (${escapeHTML(p.type)})</option>`;
                });
            }
            field.innerHTML = `<select id="edit_party_id" class="w-full border rounded px-2 py-1 text-sm">${options}</select>`;
        } else {
            field.innerHTML = `<input type="text" id="edit_${escapeHTML(fieldName)}" value="${escapeHTML(currentValue)}" class="w-full border rounded px-2 py-1 text-sm">`;
        }
    });

    // Show Save/Cancel buttons, Hide Edit button
    document.getElementById('editMemberBtn').classList.add('hidden');
    document.getElementById('saveMemberBtn').classList.remove('hidden');
    document.getElementById('cancelEditBtn').classList.remove('hidden');
}

export async function saveMemberChanges(memberId) {
    const updates = {};

    // Collect values
    const fields = ['first_name', 'middle_name', 'last_name', 'email', 'phone', 'primary_address1', 'primary_city', 'primary_state', 'primary_zip'];
    fields.forEach(f => {
        const input = document.getElementById(`edit_${f}`);
        if (input) {
            Object.defineProperty(updates, f, {
                value: input.value,
                writable: true,
                enumerable: true,
                configurable: true
            });
        }
    });

    const partyInput = document.getElementById('edit_party_id');
    if (partyInput) updates.party_id = partyInput.value ? parseInt(partyInput.value) : null;

    try {
        const response = await fetch(`/members/${memberId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update member');

        showToast('Member updated successfully');

        // Reload member details
        // We can just close and re-open or fetch and re-render
        // Let's re-fetch
        const updatedMember = await response.json();
        // We need to re-fetch the full member to get the party name if it changed, 
        // but the response should contain it if the model is set up right. 
        // Actually response is MemberResponse, which might not have party name nested unless we updated schema.
        // Let's just reload the list and close modal for simplicity, or re-open.

        document.getElementById('memberDetailModal').classList.add('hidden');
        await loadMembers(); // Refresh list

    } catch (error) {
        console.error('Error updating member:', error);
        showToast('Failed to update member', 'error');
    }
}


export function changePage(delta) {
    currentPage += delta;
    renderTable();
}

export function changeItemsPerPage() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPageSelect').value);
    currentPage = 1;
    renderTable();
}

export function toggleSelectAll() {
    const isChecked = document.getElementById('selectAll').checked;
    const pageStart = (currentPage - 1) * itemsPerPage;
    const pageEnd = Math.min(pageStart + itemsPerPage, filteredMembers.length);

    for (let i = pageStart; i < pageEnd; i++) {
        const member = filteredMembers.at(i);
        if (member) {
            if (isChecked) {
                selectedMembers.add(member.id);
            } else {
                selectedMembers.delete(member.id);
            }
        }
    }

    updateSelectedCount();
    renderTable();
}

export function sortBy(field) {
    if (sortField === field) {
        sortAsc = !sortAsc;
    } else {
        sortField = field;
        sortAsc = true;
    }
    renderTable();
}

export async function showMemberDetail(id) {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;

    currentMemberId = id;

    try {
        const response = await fetchWithAuth(`${API_URL}/members/${id}`);
        const fullMember = await response.json();

        // ... (Rendering logic similar to original app.js, but using imported functions)
        // For brevity, I'll assume we can reuse the HTML structure or need to reconstruct it.
        // Since this is a refactor, I should copy the rendering logic.

        document.getElementById('detailMemberName').textContent =
            `${fullMember.first_name} ${fullMember.middle_name || ''} ${fullMember.last_name}`.trim();

        const detailContent = document.getElementById('memberDetailContent');
        // ... (HTML generation - copying from original app.js) ...
        // To save space in this tool call, I will implement the full rendering in the next step or assume it's there.
        // Actually, I must implement it fully to avoid breaking things.

        // Simplified rendering for now to ensure it works, then I can paste the full block.
        // ...

        // Let's use the original rendering logic
        renderMemberDetailModal(fullMember);

        document.getElementById('memberDetailModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading member details:', error);
        showToast('Failed to load member details', 'error');
    }
}

function renderMemberDetailModal(fullMember) {
    const detailContent = document.getElementById('memberDetailContent');

    detailContent.innerHTML = `
        <div class="grid grid-cols-2 gap-6">
            <div>
                <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Personal Information</h3>
                <dl class="space-y-2">
                    <div>
                        <dt class="text-xs text-slate-500 font-semibold">Full Name</dt>
                        <dd class="text-sm text-slate-900 font-medium">${escapeHTML(fullMember.first_name)} ${escapeHTML(fullMember.middle_name || '')} ${escapeHTML(fullMember.last_name)}</dd>
                    </div>
                    <div>
                        <dt class="text-xs text-slate-500 font-semibold">NationBuilder ID</dt>
                        <dd class="text-sm text-slate-900 font-mono">${escapeHTML(fullMember.nationbuilder_id)}</dd>
                    </div>
                    ${fullMember.email ? `<div><dt class="text-xs text-slate-500 font-semibold">Email</dt><dd class="text-sm text-slate-900">${escapeHTML(fullMember.email)}</dd></div>` : ''}
                    ${fullMember.phone ? `<div><dt class="text-xs text-slate-500 font-semibold">Phone</dt><dd class="text-sm text-slate-900">${escapeHTML(fullMember.phone)}</dd></div>` : ''}
                    ${fullMember.membership_status ? `<div><dt class="text-xs text-slate-500 font-semibold">Membership Status</dt><dd class="text-sm"><span class="inline-flex px-2 py-1 rounded text-xs font-semibold ${fullMember.membership_status === 'active' ? 'bg-green-100 text-green-800' : fullMember.membership_status === 'lapsed' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-800'}">${escapeHTML(fullMember.membership_status)}</span></dd></div>` : ''}
                    ${fullMember.resignation_date ? `<div><dt class="text-xs text-slate-500 font-semibold">Resignation Date</dt><dd class="text-sm text-slate-900">${escapeHTML(new Date(fullMember.resignation_date).toLocaleDateString())}</dd></div>` : ''}
                </dl>
                
                ${fullMember.membership_status !== 'Resigned' && fullMember.membership_status !== 'Archived' ? `
                <div class="mt-4">
                    <button onclick="window.openResignModal(${escapeHTML(fullMember.id)}, '${escapeHTML(fullMember.first_name)} ${escapeHTML(fullMember.last_name)}')" class="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded transition-colors">
                        Resign Member
                    </button>
                </div>
                ` : ''}
            </div>
            <div>
                <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Address</h3>
                <dl class="space-y-2">
                    <div><dt class="text-xs text-slate-500 font-semibold">Street</dt><dd class="text-sm text-slate-900">${escapeHTML(fullMember.primary_address1)}</dd></div>
                    <div><dt class="text-xs text-slate-500 font-semibold">Suburb</dt><dd class="text-sm text-slate-900">${escapeHTML(fullMember.primary_city)}</dd></div>
                    <div><dt class="text-xs text-slate-500 font-semibold">State & Postcode</dt><dd class="text-sm text-slate-900">${escapeHTML(fullMember.primary_state)} ${escapeHTML(fullMember.primary_zip)}</dd></div>
                </dl>
            </div>
        </div>

        <!-- Tags Section -->
        <div class="border-t border-slate-200 pt-6 mt-6">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide">Tags</h3>
                <button onclick="window.showAddTagToMember(${escapeHTML(fullMember.id)})" class="text-xs text-indigo-600 hover:text-indigo-900 font-medium hover:underline">+ Add Tag</button>
            </div>
            <div id="memberTagsContainer" class="flex flex-wrap gap-2">
                ${fullMember.tags && fullMember.tags.length > 0 ?
            fullMember.tags.map(tag => `
                        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border" style="background-color: ${escapeHTML(tag.color)}20; border-color: ${escapeHTML(tag.color)}; color: ${escapeHTML(tag.color)}">
                            ${escapeHTML(tag.name)}
                            <button onclick="window.removeTagFromMember(${escapeHTML(fullMember.id)}, ${escapeHTML(tag.id)})" class="hover:opacity-70">×</button>
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
                <textarea id="newNoteInput" placeholder="Add a note..." class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" rows="2"></textarea>
                <button onclick="window.addNoteToMember(${escapeHTML(fullMember.id)})" class="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Add Note</button>
            </div>
            <div id="memberNotesContainer" class="space-y-3">
                ${fullMember.notes && fullMember.notes.length > 0 ?
            fullMember.notes.map(note => `
                        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div class="text-sm text-slate-900">${escapeHTML(note.note)}</div>
                            <div class="text-xs text-slate-500 mt-2">${note.created_by ? `By ${escapeHTML(note.created_by)} • ` : ''}${escapeHTML(new Date(note.created_at).toLocaleString())}</div>
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
                                <span class="text-xs font-semibold text-slate-500">${escapeHTML(new Date(check.timestamp).toLocaleString())}</span>
                                <span class="text-xs px-2 py-1 rounded font-medium ${check.result === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${escapeHTML(check.result)}</span>
                            </div>
                            ${check.federal_division ? `
                                <dl class="grid grid-cols-2 gap-2 text-xs mt-2">
                                    <div><dt class="text-slate-500">Federal:</dt><dd class="font-medium">${escapeHTML(check.federal_division)}</dd></div>
                                    ${check.state_division ? `<div><dt class="text-slate-500">State:</dt><dd class="font-medium">${escapeHTML(check.state_division)}</dd></div>` : ''}
                                </dl>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>`
        }
        </div>
    `;
}

export async function checkMember(id, event = null) {
    try {
        if (event) {
            const btn = event.target;
            btn.textContent = 'Queuing...';
            btn.disabled = true;
        }

        const response = await fetchWithAuth(`${API_URL}/members/${id}/check`, {
            method: 'POST'
        });

        if (response.ok) {
            showToast('Enrollment check queued');
        } else {
            throw new Error('Failed');
        }
    } catch (error) {
        showToast('Failed to queue check', 'error');
    }
}

export async function checkSelected() {
    if (selectedMembers.size === 0) return;
    if (!confirm(`Queue enrollment checks for ${selectedMembers.size} selected members?`)) return;

    let count = 0;
    for (const id of selectedMembers) {
        try {
            await fetchWithAuth(`${API_URL}/members/${id}/check`, { method: 'POST' });
            count++;
        } catch (e) { console.error(e); }
    }

    showToast(`Queued ${count} enrollment checks`);
    selectedMembers.clear();
    updateSelectedCount();
    renderTable();
}

export async function addNoteToMember(memberId) {
    const noteInput = document.getElementById('newNoteInput');
    const note = noteInput.value.trim();
    if (!note) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/members/${memberId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note })
        });

        if (response.ok) {
            showToast('Note added');
            // Reload details
            showMemberDetail(memberId);
        } else {
            throw new Error('Failed to add note');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Upload Logic (Moved from upload.js to avoid circular dependencies)
export async function uploadCSV(evt) {
    const fileInput = document.getElementById('csvInput');
    if (!fileInput || fileInput.files.length === 0) {
        showToast('Please select a file first', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const btn = document.querySelector('#importModal .bg-indigo-600');
    let originalText = null;
    if (btn) {
        originalText = btn.innerText;
        btn.innerText = 'Importing...';
        btn.disabled = true;
    }

    try {
        const res = await fetchWithAuth(`${API_URL}/members/upload`, {
            method: 'POST',
            body: formData
        });

        let payload = {};
        try { payload = await res.json(); } catch (e) { /* ignore json parse errors */ }

        if (res.ok) {
            showToast(payload.message || 'Import successful', 'success');
            const modal = document.getElementById('importModal');
            if (modal) modal.classList.add('hidden');
            // Refresh members list
            await loadMembers();
        } else {
            showToast(payload.message || 'Import failed', 'error');
        }
    } catch (error) {
        console.error('Upload failed', error);
        showToast('Upload failed', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText || 'Import Members';
        }
        if (fileInput) fileInput.value = '';
        const fn = document.getElementById('fileName');
        if (fn) fn.innerText = 'No file selected';
    }
}

export function initUploadListeners() {
    const fileInput = document.getElementById('csvInput');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                const fn = document.getElementById('fileName');
                if (fn) fn.innerText = e.target.files[0].name;
            }
        });
    }

    const dropZone = document.getElementById('dropZone');
    if (dropZone && fileInput) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('bg-indigo-50');
        });
        dropZone.addEventListener('dragleave', (e) => {
            dropZone.classList.remove('bg-indigo-50');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-indigo-50');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                // Use DataTransfer to set files on input if supported
                try {
                    fileInput.files = files; // may be readonly in some browsers
                } catch (err) { /* ignore */ }
                const fn = document.getElementById('fileName');
                if (fn) fn.innerText = files[0].name;
            }
        });
    }
}


// Bulk Status Update Logic
export function openBulkStatusModal() {
    if (selectedMembers.size === 0) {
        showToast('Please select members first', 'error');
        return;
    }

    document.getElementById('bulkStatusCount').textContent = selectedMembers.size;
    document.getElementById('bulkActionsDropdown').classList.add('hidden');
    document.getElementById('bulkStatusModal').classList.remove('hidden');
}

export async function submitBulkStatusUpdate() {
    const status = document.getElementById('bulkStatusSelect').value;
    const memberIds = Array.from(selectedMembers);

    try {
        const response = await fetchWithAuth(`${API_URL}/members/bulk/status?status=${status}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(memberIds)
        });

        if (!response.ok) throw new Error('Failed to update status');

        const result = await response.json();
        showToast(result.message);

        document.getElementById('bulkStatusModal').classList.add('hidden');
        selectedMembers.clear();
        updateSelectedCount();
        await loadMembers(); // Reload to show changes

    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
    }
}

// Resignation Logic
export function openResignModal(memberId, memberName) {
    document.getElementById('resignMemberId').value = memberId;
    document.getElementById('resignMemberName').textContent = memberName;
    document.getElementById('resignMemberModal').classList.remove('hidden');
}

export async function submitResignMember() {
    const memberId = document.getElementById('resignMemberId').value;

    try {
        const response = await fetchWithAuth(`${API_URL}/members/${memberId}/resign`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to resign member');

        showToast('Member resigned successfully');
        document.getElementById('resignMemberModal').classList.add('hidden');

        // If we are in detail view, close it or reload it
        if (currentMemberId == memberId) {
            document.getElementById('memberDetailModal').classList.add('hidden');
        }

        await loadMembers();

    } catch (error) {
        console.error('Error resigning member:', error);
        showToast('Failed to resign member', 'error');
    }
}

// Expose functions to window for HTML access
window.openBulkStatusModal = openBulkStatusModal;
window.submitBulkStatusUpdate = submitBulkStatusUpdate;
window.openResignModal = openResignModal;
// Annual Reminders Logic
export async function openAnnualReminders() {
    document.getElementById('annualRemindersModal').classList.remove('hidden');
    const list = document.getElementById('remindersList');
    list.innerHTML = '<div class="text-center py-8 text-slate-400">Loading...</div>';

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    document.getElementById('currentMonthName').textContent = monthNames.at(new Date().getMonth());

    try {
        const response = await fetchWithAuth(`${API_URL}/members/reminders/annual`);
        const members = await response.json();

        if (members.length === 0) {
            list.innerHTML = '<div class="text-center py-8 text-slate-500">No members due for reminders this month.</div>';
            return;
        }

        list.innerHTML = members.map(m => `
            <div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                <div>
                    <div class="font-semibold text-slate-900">${escapeHTML(m.first_name)} ${escapeHTML(m.last_name)}</div>
                    <div class="text-xs text-slate-500">Joined: ${escapeHTML(new Date(m.join_date).toLocaleDateString())}</div>
                </div>
                <div class="flex gap-2">
                    <a href="mailto:${escapeHTML(m.email)}" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">Email</a>
                    <button onclick="window.showMemberDetail(${escapeHTML(m.id)}); document.getElementById('annualRemindersModal').classList.add('hidden')" class="text-xs bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded hover:bg-slate-50">View</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading reminders:', error);
        list.innerHTML = '<div class="text-center py-8 text-red-500">Failed to load reminders.</div>';
    }
}

window.openAnnualReminders = openAnnualReminders;