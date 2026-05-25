import { API_URL, fetchWithAuth, showToast } from './utils.js';

export function openExportWizard() {
    document.getElementById('exportWizardModal').classList.remove('hidden');
}

export function toggleAllExportColumns() {
    const checkboxes = document.querySelectorAll('.export-col');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

export async function executeExport() {
    const columns = Array.from(document.querySelectorAll('.export-col:checked')).map(cb => cb.value);

    if (columns.length === 0) {
        showToast('Please select at least one column', 'error');
        return;
    }

    const filters = {
        status: document.getElementById('statusFilter').value,
        state: document.getElementById('stateFilter').value,
        search: document.getElementById('searchInput').value.trim()
    };

    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.state) params.append('state', filters.state);
    if (filters.search) params.append('search', filters.search);

    columns.forEach(col => params.append('columns', col));

    const url = `${API_URL}/members/export?${params.toString()}`;

    try {
        const response = await fetchWithAuth(url);

        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'aec_crm_export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();

            document.getElementById('exportWizardModal').classList.add('hidden');
            showToast('Export started');
        } else {
            const err = await response.json();
            throw new Error(err.detail || 'Export failed');
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to export: ' + err.message, 'error');
    }
}

export async function exportSelected(selectedMembers) {
    showToast('Export selected functionality not yet implemented.');
}

export async function exportAll(filters) {
    // Legacy function, redirect to wizard or keep simple?
    // Let's redirect to wizard for better UX
    openExportWizard();
}
