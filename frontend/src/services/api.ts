import { $idToken } from "../stores/authStore";

const API_BASE = "/api";

// Helper to get auth headers
async function getHeaders(): Promise<HeadersInit> {
  const token = $idToken.get();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Generic API call wrapper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
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
    tag_operator?: "AND" | "OR";
    skip?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            value.forEach((v) => queryParams.append(key, String(v)));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    // Backend now returns { members: [...], total: number, skip: number, limit: number }
    return apiCall<{ members: any[]; total: number; skip: number; limit: number }>(`/members?${queryParams}`);
  },

  getById: (id: number) => apiCall<any>(`/members/${id}`),

  create: (data: any) =>
    apiCall<any>("/members", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    apiCall<any>(`/members/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiCall<void>(`/members/${id}`, {
      method: "DELETE",
    }),

  checkSelected: (ids: number[]) =>
    apiCall<any>("/members/check-selected", {
      method: "POST",
      body: JSON.stringify({ member_ids: ids }),
    }),

  bulkUpdateStatus: (ids: number[], status: string) =>
    apiCall<any>("/members/bulk-update-status", {
      method: "POST",
      body: JSON.stringify({ member_ids: ids, status }),
    }),

  resign: (id: number) =>
    apiCall<any>(`/members/${id}/resign`, {
      method: "POST",
    }),

  exportCSV: async (params: any) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          value.forEach((v) => queryParams.append(key, String(v)));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}/members/export?${queryParams}`, {
      headers: headers as HeadersInit,
    });

    if (!response.ok) {
      throw new Error("Export failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Try to get filename from content-disposition
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  resetStatus: (id: number) =>
    apiCall<{ message: string }>(`/members/${id}/reset-status`, {
      method: "POST",
    }),
};

// Tags API
export const tagsApi = {
  getAll: () => apiCall<any[]>("/tags"),

  create: (data: { name: string; color: string; description?: string }) =>
    apiCall<any>("/tags", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: Partial<{ name: string; color: string; description?: string }>,
  ) =>
    apiCall<any>(`/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiCall<void>(`/tags/${id}`, {
      method: "DELETE",
    }),

  addToMember: (memberId: number, tagId: number) =>
    apiCall<any>(`/members/${memberId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag_id: tagId }),
    }),

  removeFromMember: (memberId: number, tagId: number) =>
    apiCall<void>(`/members/${memberId}/tags/${tagId}`, {
      method: "DELETE",
    }),
};

// Stats API
export const statsApi = {
  getDashboard: () => apiCall<any>("/stats/dashboard"),

  getByState: () => apiCall<any>("/stats/by-state"),

  getByElectorate: () => apiCall<any>("/stats/by-electorate"),
  
  getActivity: (limit: number = 10) => apiCall<any[]>(`/stats/activity?limit=${limit}`),
};

// Analytics API
export const analyticsApi = {
  getSummary: () => apiCall<any>("/analytics/summary"),

  getGrowthTrend: (days: number = 90) =>
    apiCall<any>(`/analytics/growth-trend?days=${days}`),

  getElectorateBreakdown: () => apiCall<any>("/analytics/electorate-breakdown"),
};

// System API
export const systemApi = {
  getQueueStatus: () => apiCall<any>("/system/queue"),
};

// Import/Export API
export const importApi = {
  uploadCSV: async (file: File, mappings: any) => {
    const token = $idToken.get();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mappings", JSON.stringify(mappings));

    const response = await fetch("/api/members/import", {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Import failed");
    }

    return response.json();
  },
};

export default {
  members: membersApi,
  tags: tagsApi,
  stats: statsApi,
  analytics: analyticsApi,
  import: importApi,
};

// ERA (Electoral Roll Access) API
export const eraApi = {
  // File management
  getUploads: () => apiCall<any[]>("/era/uploads"),
  
  getStats: () => apiCall<{
    total_records: number;
    total_uploads: number;
    by_state: Record<string, number>;
    top_divisions: { division: string; count: number }[];
    total_matches: number;
    verified_matches: number;
  }>("/era/stats"),

  uploadFile: async (file: File) => {
    const token = $idToken.get();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/era/upload", {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("ERA upload failed");
    }

    return response.json();
  },

  deleteUpload: (uploadId: number) =>
    apiCall<any>(`/era/uploads/${uploadId}`, { method: "DELETE" }),

  // Files on disk (for resume)
  getFiles: () =>
    apiCall<{ filename: string; size_mb: number; path: string }[]>("/era/files"),

  parseFromDisk: (filename: string, clearExisting: boolean = false) =>
    apiCall<any>(`/era/parse-from-disk?filename=${encodeURIComponent(filename)}&clear_existing=${clearExisting}`, {
      method: "POST",
    }),

  // Search
  search: (params: {
    surname: string;
    given_names?: string;
    locality?: string;
    postcode?: string;
    threshold?: number;
    limit?: number;
  }) =>
    apiCall<any[]>("/era/search", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // Member matching
  matchMember: (memberId: number, threshold?: number) =>
    apiCall<any>(`/era/match-member/${memberId}?threshold=${threshold || 80}`, {
      method: "POST",
    }),

  batchMatch: (memberIds: number[], threshold?: number) =>
    apiCall<any>("/era/batch-match", {
      method: "POST",
      body: JSON.stringify({ member_ids: memberIds, threshold: threshold || 80 }),
    }),

  // Recruitment targeting
  getHousehold: (memberId: number) =>
    apiCall<{
      address: string;
      locality: string;
      postcode: string;
      federal_division: string;
      members: {
        era_record_id: number;
        given_names: string;
        surname: string;
        gender: string;
        date_of_birth?: string;
        is_existing_member: boolean;
      }[];
      total_at_address: number;
    }>(`/era/household/${memberId}`),

  getRelatedSurnames: (memberId: number, sameLocality: boolean = true, limit: number = 50) =>
    apiCall<any[]>(`/era/related-surnames/${memberId}?same_locality=${sameLocality}&limit=${limit}`),

  getRecruitmentTargets: (params?: {
    federal_division?: string;
    locality?: string;
    include_same_address?: boolean;
    include_same_surname?: boolean;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    return apiCall<any[]>(`/era/recruitment-targets?${queryParams}`);
  },

  // Browsing
  browse: (params?: {
    federal_division?: string;
    locality?: string;
    postcode?: string;
    surname_starts_with?: string;
    skip?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") queryParams.append(key, String(value));
      });
    }
    return apiCall<{
      total: number;
      skip: number;
      limit: number;
      records: any[];
    }>(`/era/browse?${queryParams}`);
  },

  getDivisions: () =>
    apiCall<{ division: string; count: number }[]>("/era/divisions"),

  getLocalities: (federalDivision?: string) => {
    const params = federalDivision ? `?federal_division=${federalDivision}` : "";
    return apiCall<{ locality: string; postcode: string; count: number }[]>(`/era/localities${params}`);
  },

  // Household Analytics
  getHouseholdStats: () =>
    apiCall<{
      total_households_with_members: number;
      total_electors_in_member_households: number;
      total_members_matched: number;
      average_conversion_rate: number;
      tier_breakdown: Record<string, number>;
    }>("/era/household-stats"),

  getTopHouseholds: (limit: number = 20, minElectors: number = 2) =>
    apiCall<{
      address: string;
      locality: string;
      postcode: string;
      federal_division: string;
      total_electors: number;
      member_count: number;
      conversion_rate: number;
      member_names: string[];
    }[]>(`/era/top-households?limit=${limit}&min_electors=${minElectors}`),

  getVolunteerCandidates: (minRate: number = 75, limit: number = 50) =>
    apiCall<{
      member_id: number;
      member_name: string;
      email: string;
      phone: string;
      household_address: string;
      household_conversion_rate: number;
      household_size: number;
      members_converted: number;
      federal_division: string;
    }[]>(`/era/volunteer-candidates?min_rate=${minRate}&limit=${limit}`),
};
