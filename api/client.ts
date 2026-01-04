/**
 * API Client for OKR Manager
 * Handles communication with the backend server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Token management
let authToken: string | null = localStorage.getItem('authToken');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

// Generic fetch wrapper with auth
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// === AUTH API ===

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export const authAPI = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetchAPI<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.token);
    return response;
  },

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await fetchAPI<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(response.token);
    return response;
  },

  async logout() {
    setAuthToken(null);
  },

  async getMe() {
    return fetchAPI<LoginResponse['user']>('/auth/me');
  },

  async updateProfile(data: { name?: string; email?: string }) {
    return fetchAPI<LoginResponse['user']>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return fetchAPI('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async forgotPassword(email: string) {
    return fetchAPI('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string) {
    return fetchAPI('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
};

// === OKR API ===

export interface KeyResult {
  id: string;
  description: string;
  metricType: 'percentage' | 'number' | 'currency' | 'boolean';
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit?: string;
  status: 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'draft';
  confidence: 'high' | 'medium' | 'low';
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName?: string;
  level: 'company' | 'department' | 'team' | 'individual';
  period: string;
  status: 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'draft';
  progress: number;
  keyResults: KeyResult[];
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ObjectiveFilters {
  level?: string;
  period?: string;
  status?: string;
  mine?: boolean;
}

export interface CreateObjectiveData {
  title: string;
  description?: string;
  level: 'company' | 'department' | 'team' | 'individual';
  period: string;
  dueDate?: string;
  keyResults?: Omit<KeyResult, 'id' | 'status' | 'confidence'>[];
}

export interface Stats {
  totalObjectives: number;
  avgProgress: number;
  atRiskCount: number;
  completedCount: number;
}

export const okrAPI = {
  // Objectives
  async getObjectives(filters: ObjectiveFilters = {}): Promise<Objective[]> {
    const params = new URLSearchParams();
    if (filters.level) params.set('level', filters.level);
    if (filters.period) params.set('period', filters.period);
    if (filters.status) params.set('status', filters.status);
    if (filters.mine) params.set('mine', 'true');

    const query = params.toString() ? `?${params}` : '';
    return fetchAPI<Objective[]>(`/okr/objectives${query}`);
  },

  async getObjective(id: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${id}`);
  },

  async createObjective(data: CreateObjectiveData): Promise<Objective> {
    return fetchAPI<Objective>('/okr/objectives', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateObjective(id: string, data: Partial<CreateObjectiveData>): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteObjective(id: string): Promise<void> {
    return fetchAPI<void>(`/okr/objectives/${id}`, {
      method: 'DELETE',
    });
  },

  // Key Results
  async addKeyResult(objectiveId: string, data: Omit<KeyResult, 'id' | 'status' | 'confidence'>): Promise<KeyResult> {
    return fetchAPI<KeyResult>(`/okr/objectives/${objectiveId}/key-results`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateKeyResult(id: string, data: Partial<KeyResult>): Promise<KeyResult> {
    return fetchAPI<KeyResult>(`/okr/key-results/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteKeyResult(id: string): Promise<void> {
    return fetchAPI<void>(`/okr/key-results/${id}`, {
      method: 'DELETE',
    });
  },

  // Stats
  async getStats(): Promise<Stats> {
    return fetchAPI<Stats>('/okr/stats');
  },

  // Progress History
  async getProgressHistory(objectiveId: string) {
    return fetchAPI(`/okr/objectives/${objectiveId}/history`);
  },
};

// === HEALTH CHECK ===

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchAPI('/health');
}
