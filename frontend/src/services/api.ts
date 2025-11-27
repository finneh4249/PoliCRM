import { $idToken } from '../stores/authStore';

const API_BASE = '';

// Helper to get auth headers
async function getHeaders(): Promise<HeadersInit> {
    const token = $idToken.get();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// Generic API call wrapper
async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `API error: ${response.status}`);
    }

    return response.json();
}

// Members API
export const membersApi = {
    getAll: async (params?: {
        search?: string;
        status?: string[];
        state?: string;
        tags?: number[];
        tag_operator?: 'AND' | 'OR';
        skip?: number;
        limit?: number;
        sort_by?: string;
        sort_order?: 'asc' | 'desc';
    }) => {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value)) {
                        value.forEach(v => queryParams.append(key, String(v)));
                    } else {
                        queryParams.append(key, String(value));
                    }
                }
            });
        }
        // Backend returns array directly
        return apiCall<any[]>(`/members?${queryParams}`);
    },

    getById: (id: number) => apiCall<any>(`/members/${id}`),

    create: (data: any) => apiCall<any>('/members', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    update: (id: number, data: any) => apiCall<any>(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    delete: (id: number) => apiCall<void>(`/members/${id}`, {
        method: 'DELETE'
    }),

    checkSelected: (ids: number[]) => apiCall<any>('/members/check-selected', {
        method: 'POST',
        body: JSON.stringify({ member_ids: ids })
    }),

    bulkUpdateStatus: (ids: number[], status: string) => apiCall<any>('/members/bulk-update-status', {
        method: 'POST',
        body: JSON.stringify({ member_ids: ids, status })
    }),

    resign: (id: number) => apiCall<any>(`/members/${id}/resign`, {
        method: 'POST'
    }),

    exportCSV: (params: any) => {
        const queryParams = new URLSearchParams(params);
        window.location.href = `/members/export?${queryParams}`;
    }
};

// Tags API
export const tagsApi = {
    getAll: () => apiCall<any[]>('/tags'),

    create: (data: { name: string; color: string; description?: string }) =>
        apiCall<any>('/tags', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    update: (id: number, data: Partial<{ name: string; color: string; description?: string }>) =>
        apiCall<any>(`/tags/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    delete: (id: number) => apiCall<void>(`/tags/${id}`, {
        method: 'DELETE'
    }),

    addToMember: (memberId: number, tagId: number) =>
        apiCall<any>(`/members/${memberId}/tags`, {
            method: 'POST',
            body: JSON.stringify({ tag_id: tagId })
        }),

    removeFromMember: (memberId: number, tagId: number) =>
        apiCall<void>(`/members/${memberId}/tags/${tagId}`, {
            method: 'DELETE'
        })
};

// Stats API
export const statsApi = {
    getDashboard: () => apiCall<any>('/stats/dashboard'),

    getByState: () => apiCall<any>('/stats/by-state'),

    getByElectorate: () => apiCall<any>('/stats/by-electorate')
};

// Analytics API
export const analyticsApi = {
    getSummary: () => apiCall<any>('/analytics/summary'),

    getGrowthTrend: (days: number = 90) =>
        apiCall<any>(`/analytics/growth-trend?days=${days}`),

    getElectorateBreakdown: () => apiCall<any>('/analytics/electorate-breakdown')
};

// System API
export const systemApi = {
    getQueueStatus: () => apiCall<any>('/system/queue')
};

// Import/Export API
export const importApi = {
    uploadCSV: async (file: File, mappings: any) => {
        const token = $idToken.get();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mappings', JSON.stringify(mappings));

        const response = await fetch('/members/import', {
            method: 'POST',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Import failed');
        }

        return response.json();
    }
};

export default {
    members: membersApi,
    tags: tagsApi,
    stats: statsApi,
    analytics: analyticsApi,
    import: importApi
};
