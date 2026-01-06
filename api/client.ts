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
    const response = await fetchAPI<{ user: LoginResponse['user'] }>('/auth/me');
    return response.user;
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

  async uploadProfilePicture(profilePicture: string): Promise<{ success: boolean; profilePicture: string }> {
    return fetchAPI('/auth/profile-picture', {
      method: 'PUT',
      body: JSON.stringify({ profilePicture }),
    });
  },

  async deleteProfilePicture(): Promise<{ success: boolean }> {
    return fetchAPI('/auth/profile-picture', {
      method: 'DELETE',
    });
  },

  async deleteAccount(password: string): Promise<{ message: string }> {
    return fetchAPI('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },
};

// === OKR API ===

export interface HealthMetrics {
  paceRatio: number;          // actual progress / expected progress (1.0 = on pace)
  expectedProgress: number;   // where we should be based on time elapsed
  progressGap: number;        // expected - actual (positive = behind)
  daysRemaining: number | null;
  daysElapsed: number;
  totalDays: number;
  percentTimeElapsed: number;
  isOnPace: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string | null;
}

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

export type OKRLevel = 'company' | 'department' | 'team' | 'individual';
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'active';

export interface Objective {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName?: string;
  level: OKRLevel;
  period: string;
  status: 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'draft' | 'approved';
  progress: number;
  keyResults: KeyResult[];
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
  healthMetrics?: HealthMetrics;
  // Hierarchy fields
  parentObjectiveId?: string | null;
  parentObjectiveTitle?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  childrenCount?: number;
  children?: Objective[];
  ancestors?: { id: string; title: string; level: OKRLevel }[];
  // Approval workflow
  approvalStatus?: ApprovalStatus;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
}

export interface ParentObjective {
  id: string;
  title: string;
  level: OKRLevel;
  period: string;
  status: string;
  progress: number;
  ownerName: string;
}

export interface ApprovalHistoryItem {
  id: string;
  objectiveId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'activated';
  performedBy: string;
  performedByName: string;
  comment: string | null;
  createdAt: string;
}

export interface Contributor {
  id: string;
  userId: string;
  name: string;
  email: string;
  profilePicture?: string | null;
  role: 'contributor' | 'reviewer' | 'supporter';
  addedAt: string;
}

export interface ObjectiveFilters {
  level?: string;
  period?: string;
  status?: string;
  mine?: boolean;
  parentObjectiveId?: string;
  approvalStatus?: ApprovalStatus;
}

export interface CreateObjectiveData {
  title: string;
  description?: string;
  level: OKRLevel;
  period: string;
  dueDate?: string;
  ownerId?: string;
  status?: 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'draft';
  keyResults?: Omit<KeyResult, 'id' | 'status' | 'confidence'>[];
  // Hierarchy fields
  parentObjectiveId?: string | null;
  teamId?: string | null;
}

export interface UserBasic {
  id: string;
  name: string;
  email: string;
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

  // Get users for assignment (accessible to lead and admin)
  async getUsers(): Promise<UserBasic[]> {
    return fetchAPI<UserBasic[]>('/okr/assignable-users');
  },

  // === HIERARCHY ===

  // Get full hierarchy tree
  async getHierarchy(period?: string): Promise<Objective[]> {
    const params = period ? `?period=${encodeURIComponent(period)}` : '';
    return fetchAPI<Objective[]>(`/okr/hierarchy${params}`);
  },

  // Get available parent objectives for a given level
  async getAvailableParents(level: OKRLevel, excludeId?: string): Promise<ParentObjective[]> {
    const params = new URLSearchParams({ level });
    if (excludeId) params.set('excludeId', excludeId);
    return fetchAPI<ParentObjective[]>(`/okr/available-parents?${params}`);
  },

  // Get children of an objective
  async getObjectiveChildren(objectiveId: string): Promise<Objective[]> {
    return fetchAPI<Objective[]>(`/okr/objectives/${objectiveId}/children`);
  },

  // Get objective with ancestors (breadcrumb)
  async getObjectiveWithAncestors(objectiveId: string): Promise<Objective & { ancestors: { id: string; title: string; level: OKRLevel }[] }> {
    return fetchAPI(`/okr/objectives/${objectiveId}/ancestors`);
  },

  // === APPROVAL WORKFLOW ===

  // Get objectives pending approval (for admins)
  async getPendingApprovals(): Promise<Objective[]> {
    return fetchAPI<Objective[]>('/okr/pending-approvals');
  },

  // Submit objective for review (owner action)
  async submitForReview(objectiveId: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/submit-for-review`, {
      method: 'POST',
    });
  },

  // Approve objective (admin action)
  async approveObjective(objectiveId: string, comment?: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // Reject objective (admin action)
  async rejectObjective(objectiveId: string, comment: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // Activate approved objective (owner/admin action)
  async activateObjective(objectiveId: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/activate`, {
      method: 'POST',
    });
  },

  // Pause an active objective
  async pauseObjective(objectiveId: string, comment?: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/pause`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // Resume a paused objective
  async resumeObjective(objectiveId: string, comment?: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/resume`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // Stop an objective permanently
  async stopObjective(objectiveId: string, comment?: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // Archive a stopped objective
  async archiveObjective(objectiveId: string, comment?: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  async revertToDraft(objectiveId: string, comment?: string): Promise<Objective> {
    return fetchAPI<Objective>(`/okr/objectives/${objectiveId}/revert-to-draft`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  // Get approval history
  async getApprovalHistory(objectiveId: string): Promise<ApprovalHistoryItem[]> {
    return fetchAPI<ApprovalHistoryItem[]>(`/okr/objectives/${objectiveId}/approval-history`);
  },

  // === CONTRIBUTORS ===

  // Get my contributions (OKRs where I'm a contributor)
  async getMyContributions(): Promise<Objective[]> {
    return fetchAPI<Objective[]>('/okr/my-contributions');
  },

  // Get contributors for an objective
  async getContributors(objectiveId: string): Promise<Contributor[]> {
    return fetchAPI<Contributor[]>(`/okr/objectives/${objectiveId}/contributors`);
  },

  // Add contributor to objective
  async addContributor(objectiveId: string, userId: string, role: string = 'contributor'): Promise<Contributor> {
    return fetchAPI<Contributor>(`/okr/objectives/${objectiveId}/contributors`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  // Remove contributor from objective
  async removeContributor(objectiveId: string, contributorId: string): Promise<void> {
    return fetchAPI<void>(`/okr/objectives/${objectiveId}/contributors/${contributorId}`, {
      method: 'DELETE',
    });
  },

  // Update contributor role
  async updateContributorRole(contributorId: string, role: string): Promise<Contributor> {
    return fetchAPI<Contributor>(`/okr/contributors/${contributorId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
};

// === TEAM API ===

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  odIduser: string;  // user_id from backend (legacy name)
  userId?: string;   // alias for odIduser
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  avatar: string;
}

export interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName?: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string;
  invitedByName?: string;
  expiresAt: string;
  createdAt: string;
  inviteLink?: string;
}

export const teamAPI = {
  // Teams
  async getTeams(): Promise<Team[]> {
    return fetchAPI<Team[]>('/teams');
  },

  async getTeam(id: string): Promise<Team> {
    return fetchAPI<Team>(`/teams/${id}`);
  },

  async createTeam(data: { name: string; description?: string }): Promise<Team> {
    return fetchAPI<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTeam(id: string, data: { name?: string; description?: string }): Promise<Team> {
    return fetchAPI<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTeam(id: string): Promise<void> {
    return fetchAPI<void>(`/teams/${id}`, {
      method: 'DELETE',
    });
  },

  // Members
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return fetchAPI<TeamMember[]>(`/teams/${teamId}/members`);
  },

  async updateMemberRole(teamId: string, memberId: string, role: 'admin' | 'member'): Promise<void> {
    return fetchAPI<void>(`/teams/${teamId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async removeMember(teamId: string, memberId: string): Promise<void> {
    return fetchAPI<void>(`/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  async searchUsers(teamId: string, query: string): Promise<SearchUser[]> {
    return fetchAPI<SearchUser[]>(`/teams/${teamId}/users/search?q=${encodeURIComponent(query)}`);
  },

  async addMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<TeamMember> {
    return fetchAPI<TeamMember>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  // Invitations
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    return fetchAPI<TeamInvitation[]>(`/teams/${teamId}/invitations`);
  },

  async createInvitation(teamId: string, data: { email: string; role?: 'admin' | 'member' }): Promise<TeamInvitation> {
    return fetchAPI<TeamInvitation>(`/teams/${teamId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    return fetchAPI<void>(`/teams/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  },

  async resendInvitation(invitationId: string): Promise<{ success: boolean; email: string }> {
    return fetchAPI<{ success: boolean; email: string }>(`/teams/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  },

  async getMyPendingInvitations(): Promise<TeamInvitation[]> {
    return fetchAPI<TeamInvitation[]>('/teams/invitations/pending');
  },

  async acceptInvitation(token: string): Promise<{ success: boolean; teamId: string }> {
    return fetchAPI<{ success: boolean; teamId: string }>(`/teams/invitations/${token}/accept`, {
      method: 'POST',
    });
  },

  async declineInvitation(token: string): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>(`/teams/invitations/${token}/decline`, {
      method: 'POST',
    });
  },

  // Public endpoints (no auth required)
  async getInvitationDetails(token: string): Promise<{
    id: string;
    email: string;
    teamName: string;
    teamId: string;
    inviterName: string;
    role: string;
    expiresAt: string;
  }> {
    return fetchAPI(`/teams/invitations/${token}/details`);
  },

  async registerFromInvitation(token: string, data: { name: string; password: string }): Promise<{
    success: boolean;
    token: string;
    user: { id: string; email: string; name: string; role: string };
    teamId: string;
    teamName: string;
  }> {
    return fetchAPI(`/teams/invitations/${token}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// === HEALTH CHECK ===

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchAPI('/health');
}

// === ADMIN API (User Management) ===

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profile_picture?: string;
  subscription_tier: 'free' | 'premium';
  subscription_ends_at?: string;
  email_verified: boolean;
  created_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'lead' | 'admin';
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
}

export const adminAPI = {
  // List all users
  async getUsers(options?: { role?: string; subscription_tier?: string; limit?: number; offset?: number }): Promise<AdminUser[]> {
    const params = new URLSearchParams();
    if (options?.role) params.set('role', options.role);
    if (options?.subscription_tier) params.set('subscription_tier', options.subscription_tier);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const query = params.toString() ? `?${params}` : '';
    return fetchAPI<AdminUser[]>(`/users${query}`);
  },

  // Get single user
  async getUser(id: string): Promise<AdminUser> {
    return fetchAPI<AdminUser>(`/users/${id}`);
  },

  // Create user
  async createUser(data: CreateUserData): Promise<AdminUser> {
    return fetchAPI<AdminUser>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update user
  async updateUser(id: string, data: UpdateUserData): Promise<AdminUser> {
    return fetchAPI<AdminUser>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete user
  async deleteUser(id: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Reset user password
  async resetPassword(id: string, password?: string): Promise<{ message: string; temporaryPassword?: string }> {
    return fetchAPI<{ message: string; temporaryPassword?: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  // Toggle subscription
  async toggleSubscription(id: string): Promise<AdminUser> {
    return fetchAPI<AdminUser>(`/users/${id}/toggle-subscription`, {
      method: 'POST',
    });
  },

  // Get user's data count (for deletion warning)
  async getUserDataCount(id: string): Promise<{
    objectivesCount: number;
    keyResultsCount: number;
    teamsOwnedCount: number;
    teamMembershipsCount: number;
    hasData: boolean;
  }> {
    return fetchAPI(`/okr/admin/users/${id}/data-count`);
  },

  // Reassign all OKRs from one user to another
  async reassignUserOKRs(fromUserId: string, toUserId: string): Promise<{
    success: boolean;
    reassignedObjectives: number;
    reassignedTeams: number;
  }> {
    return fetchAPI(`/okr/admin/users/${fromUserId}/reassign-okrs`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId: toUserId }),
    });
  },
};
