import { API_URL, fetchWithAuth, showToast, escapeHTML } from './utils.js';

let selectedTagIds = new Set();
let tagOperator = 'AND';

export function getSelectedTagIds() { return Array.from(selectedTagIds); }
export function getTagOperator() { return tagOperator; }

export function openTagManager() {
    const modal = document.getElementById('tagManagerModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadTags();
    }
}

export async function loadTags() {
    try {
        const response = await fetchWithAuth(`${API_URL}/tags`);
        const tags = await response.json();

        // Update Tag Management List (if visible)
        const container = document.getElementById('tagsContainer');
        if (container) {
            container.innerHTML = tags.map(tag => `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
                    <div class="flex items-center gap-3">
                        <span class="w-3 h-3 rounded-full" style="background-color: ${escapeHTML(tag.color)}"></span>
                        <span class="font-medium text-slate-700">${escapeHTML(tag.name)}</span>
                        ${tag.description ? `<span class="text-xs text-slate-400">(${escapeHTML(tag.description)})</span>` : ''}
                    </div>
                    <button onclick="deleteTag(${escapeHTML(tag.id)})" class="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `).join('');
        }

        // Update Tag Filter Dropdown
        const filterList = document.getElementById('tagFilterList');
        if (filterList) {
            filterList.innerHTML = tags.map(tag => `
                <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                    <input type="checkbox" class="checkbox-custom tag-filter-cb" value="${escapeHTML(tag.id)}" 
                        ${selectedTagIds.has(tag.id) ? 'checked' : ''}
                        onchange="toggleTagFilter(${escapeHTML(tag.id)})">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${escapeHTML(tag.color)}"></span>
                    <span class="text-sm text-slate-700">${escapeHTML(tag.name)}</span>
                </label>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

export function toggleTagFilter(tagId) {
    if (selectedTagIds.has(tagId)) {
        selectedTagIds.delete(tagId);
    } else {
        selectedTagIds.add(tagId);
    }
    updateTagFilterUI();
    // Trigger member filter update
    if (window.filterMembers) window.filterMembers();
}

export function setTagOperator(op) {
    tagOperator = op;
    updateTagFilterUI();
    if (window.filterMembers) window.filterMembers();
}

export function clearTagFilters() {
    selectedTagIds.clear();
    updateTagFilterUI();
    // Uncheck all boxes
    document.querySelectorAll('.tag-filter-cb').forEach(cb => cb.checked = false);
    if (window.filterMembers) window.filterMembers();
}

function updateTagFilterUI() {
    // Update count badge
    const countEl = document.getElementById('tagFilterCount');
    if (countEl) {
        if (selectedTagIds.size > 0) {
            countEl.textContent = selectedTagIds.size;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    }

    // Update operator buttons
    const btnAnd = document.getElementById('tagOpAND');
    const btnOr = document.getElementById('tagOpOR');

    if (btnAnd && btnOr) {
        if (tagOperator === 'AND') {
            btnAnd.className = 'px-2 py-0.5 text-xs font-bold rounded bg-white shadow-sm text-indigo-600';
            btnOr.className = 'px-2 py-0.5 text-xs font-bold rounded text-slate-500 hover:text-slate-700';
        } else {
            btnAnd.className = 'px-2 py-0.5 text-xs font-bold rounded text-slate-500 hover:text-slate-700';
            btnOr.className = 'px-2 py-0.5 text-xs font-bold rounded bg-white shadow-sm text-indigo-600';
        }
    }
}

export async function createTag() {
    const name = document.getElementById('tagName').value;
    const color = document.getElementById('tagColor').value;
    const description = document.getElementById('tagDescription').value;

    const data = { name, color, description };

    try {
        const response = await fetchWithAuth(`${API_URL}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('Tag created successfully');
            document.getElementById('createTagForm').reset();
            loadTags();
        } else {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to create tag');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

export async function deleteTag(tagId) {
    if (!confirm('Delete this tag? It will be removed from all members.')) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/tags/${tagId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Tag deleted');
            loadTags();
        } else {
            throw new Error('Failed to delete tag');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

export function showAddTagToMember(memberId) {
    const modal = document.getElementById('addTagToMemberModal');
    if (!modal) return;

    // Store memberId in a hidden field or data attribute
    document.getElementById('addTagMemberId').value = memberId;

    // Fetch tags and populate select
    fetchWithAuth(`${API_URL}/tags`)
        .then(res => res.json())
        .then(tags => {
            const select = document.getElementById('tagSelect');
            if (select) {
                select.innerHTML = tags.map(t => `<option value="${escapeHTML(t.id)}">${escapeHTML(t.name)}</option>`).join('');
            }
            modal.classList.remove('hidden');
        })
        .catch(err => showToast('Failed to load tags', 'error'));
}

export async function submitAddTagToMember() {
    const memberId = document.getElementById('addTagMemberId').value;
    const tagId = document.getElementById('tagSelect').value;

    if (!memberId || !tagId) return;

    const success = await addTagToMember(memberId, tagId);
    if (success) {
        document.getElementById('addTagToMemberModal').classList.add('hidden');
        // Refresh member details if open
        if (window.showMemberDetail) window.showMemberDetail(parseInt(memberId));
    }
}

export async function addTagToMember(memberId, tagId) {
    try {
        const response = await fetchWithAuth(`${API_URL}/members/${memberId}/tags/${tagId}`, {
            method: 'POST'
        });

        if (response.ok) {
            showToast('Tag added');
            // Reload member details
            return true;
        } else {
            throw new Error('Failed to add tag');
        }
    } catch (error) {
        showToast(error.message, 'error');
        return false;
    }
}

export async function removeTagFromMember(memberId, tagId) {
    try {
        const response = await fetchWithAuth(`${API_URL}/members/${memberId}/tags/${tagId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Tag removed');
            return true;
        } else {
            throw new Error('Failed to remove tag');
        }
    } catch (error) {
        showToast(error.message, 'error');
        return false;
    }
}
