import {
    loadMembers, filterMembers, changePage, changeItemsPerPage, toggleSelectAll, sortBy,
    checkSelected, showMemberDetail, checkMember, addNoteToMember, toggleMemberSelection,
    enableEditMode, saveMemberChanges, updateStatusFilterDisplay, setStatusPreset, clearStatusFilters,
    uploadCSV, initUploadListeners
} from './modules/members.js';
import { loadDashboardStats, loadElectorateStats } from './modules/stats.js';
import { loadTags, createTag, deleteTag, showAddTagToMember, addTagToMember, removeTagFromMember, toggleTagFilter, setTagOperator, clearTagFilters } from './modules/tags.js';
import { exportAll, exportSelected, openExportWizard, toggleAllExportColumns, executeExport } from './modules/export.js';
import { showToast } from './modules/utils.js';

// Expose functions to window for HTML event handlers
window.filterMembers = filterMembers;
window.changePage = changePage;
window.changeItemsPerPage = changeItemsPerPage;
window.toggleSelectAll = toggleSelectAll;
window.sortBy = sortBy;
window.checkSelected = checkSelected;
window.showMemberDetail = showMemberDetail;
window.checkMember = checkMember;
window.addNoteToMember = addNoteToMember;
window.toggleMemberSelection = toggleMemberSelection;
window.enableEditMode = enableEditMode;
window.saveMemberChanges = saveMemberChanges;
window.updateStatusFilterDisplay = updateStatusFilterDisplay;
window.setStatusPreset = setStatusPreset;
window.clearStatusFilters = clearStatusFilters;

window.deleteTag = deleteTag;
window.showAddTagToMember = showAddTagToMember;
window.toggleTagFilter = toggleTagFilter;
window.setTagOperator = setTagOperator;
window.clearTagFilters = clearTagFilters;
window.addTagToMember = async (mid, tid) => {
    if (await addTagToMember(mid, tid)) showMemberDetail(mid);
};
window.removeTagFromMember = async (mid, tid) => {
    if (await removeTagFromMember(mid, tid)) showMemberDetail(mid);
};
window.exportAll = openExportWizard; // Redirect direct call to wizard
window.openExportWizard = openExportWizard;
window.toggleAllExportColumns = toggleAllExportColumns;
window.executeExport = executeExport;

// Upload (import) handlers
window.uploadCSV = uploadCSV;

// Tag Manager
import { openTagManager, submitAddTagToMember } from './modules/tags.js';
window.openTagManager = openTagManager;
window.submitAddTagToMember = submitAddTagToMember;

// Reports
window.openReports = async () => {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.remove('hidden');
        await Promise.all([
            loadDashboardStats(),
            loadElectorateStats()
        ]);
    }
};

// Duplicate Check
window.checkForDuplicates = () => {
    clearStatusFilters();
    const cb = document.querySelector(`.status-checkbox[value="Duplicate"]`);
    if (cb) {
        cb.checked = true;
        updateStatusFilterDisplay();
        showToast('Showing potential duplicates');
    }
};
window.exportSelected = exportSelected;

// Load parties
async function loadParties() {
    try {
        const response = await fetch('/members/parties', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            window.parties = await response.json();
        }
    } catch (e) { console.error("Failed to load parties", e); }
}

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            showToast(`Debug: Signed in as ${user.email}`, 'info');
            const token = await user.getIdToken();
            localStorage.setItem('authToken', token);

            // Load initial data
            await loadParties();
            loadMembers();
            loadTags();
            loadDashboardStats();
            loadElectorateStats();

            // Update UI with user info
            const emailEl = document.getElementById('currentUserEmail');
            if (emailEl) emailEl.textContent = user.email;

        } else {
            console.log("No user found, redirecting...");
            setTimeout(() => {
                if (!firebase.auth().currentUser) {
                    window.location.href = '/login';
                }
            }, 1000);
        }
    });

    // Event Listeners
    document.getElementById('searchInput').addEventListener('input', filterMembers);
    document.getElementById('stateFilter').addEventListener('change', filterMembers);
    // Status filter is now handled by onclick/onchange in HTML

    const createTagForm = document.getElementById('createTagForm');
    if (createTagForm) {
        createTagForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createTag();
        });
    }

    // Initialize upload modal listeners (file input, drag/drop)
    try { initUploadListeners(); } catch (e) { console.warn('Upload listeners init failed', e); }
});

// Navigation
window.setActiveView = function (view) {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    const navLink = document.getElementById(`nav-${view}`);
    if (navLink) navLink.classList.add('active');

    // Update page title
    const titles = {
        'dashboard': { title: 'Dashboard', subtitle: 'Overview of member enrollment verification' },
        'members': { title: 'All Members', subtitle: 'Complete member directory' },
        'verified': { title: 'Verified Members', subtitle: 'Successfully verified enrollments' },
        'pending': { title: 'Pending Verification', subtitle: 'Members awaiting enrollment check' },
        'failed': { title: 'Failed Verifications', subtitle: 'Members with verification issues' },
        'captcha': { title: 'Captcha Issues', subtitle: 'Members requiring retry due to captcha' },
        'partial': { title: 'Partial Matches', subtitle: 'Members requiring manual verification' },
        'duplicates': { title: 'Duplicate Members', subtitle: 'Potential duplicate records' }
    };

    if (titles[view]) {
        document.getElementById('page-title').textContent = titles[view].title;
        document.getElementById('page-subtitle').textContent = titles[view].subtitle;
    }

    // Update filters based on view
    const searchInput = document.getElementById('searchInput');
    const stateFilter = document.getElementById('stateFilter');

    if (searchInput) searchInput.value = '';
    if (stateFilter) stateFilter.value = 'all';

    clearStatusFilters();

    // Helper to select status
    const selectStatus = (val) => {
        const cb = document.querySelector(`.status-checkbox[value="${val}"]`);
        if (cb) cb.checked = true;
    };

    switch (view) {
        case 'verified':
            selectStatus('Verified');
            break;
        case 'pending':
            selectStatus('Unchecked');
            break;
        case 'failed':
            selectStatus('Fail');
            break;
        case 'captcha':
            selectStatus('Captcha');
            break;
        case 'partial':
            selectStatus('Partial');
            break;
        case 'duplicates':
            selectStatus('Duplicate');
            break;
    }

    updateStatusFilterDisplay();
};
