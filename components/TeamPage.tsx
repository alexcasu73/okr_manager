import React, { useState, useEffect } from 'react';
import { teamAPI, Team, TeamMember, TeamInvitation, SearchUser } from '../api/client';
import { useAuth } from '../context/AuthContext';
import InviteMemberModal from './InviteMemberModal';
import CreateTeamModal from './CreateTeamModal';
import {
  Users,
  Plus,
  Mail,
  Crown,
  Shield,
  User,
  MoreVertical,
  Trash2,
  UserMinus,
  Clock,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const TeamPage: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Load teams on mount
  useEffect(() => {
    loadTeams();
    loadPendingInvitations();
  }, []);

  // Load members when team is selected
  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id);
      loadTeamInvitations(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      const data = await teamAPI.getTeams();
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (err) {
      setError('Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const data = await teamAPI.getTeamMembers(teamId);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const loadTeamInvitations = async (teamId: string) => {
    try {
      const data = await teamAPI.getTeamInvitations(teamId);
      setInvitations(data);
    } catch (err) {
      // User might not have permission
      setInvitations([]);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const data = await teamAPI.getMyPendingInvitations();
      setPendingInvitations(data);
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
    }
  };

  const handleCreateTeam = async (data: { name: string; description?: string }) => {
    try {
      const newTeam = await teamAPI.createTeam(data);
      setTeams([newTeam, ...teams]);
      setSelectedTeam(newTeam);
      setIsCreateTeamModalOpen(false);
    } catch (err) {
      throw err;
    }
  };

  const handleInviteMember = async (email: string, role: 'admin' | 'member') => {
    if (!selectedTeam) return;
    try {
      const invitation = await teamAPI.createInvitation(selectedTeam.id, { email, role });
      setInvitations([invitation, ...invitations]);
      setIsInviteModalOpen(false);
    } catch (err) {
      throw err;
    }
  };

  const handleAddMember = async (userId: string, role: 'admin' | 'member') => {
    if (!selectedTeam) return;
    try {
      await teamAPI.addMember(selectedTeam.id, userId, role);
      // Reload members to get fresh data
      const updatedMembers = await teamAPI.getTeamMembers(selectedTeam.id);
      setMembers(updatedMembers);
      setIsInviteModalOpen(false);
    } catch (err) {
      throw err;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;
    try {
      await teamAPI.removeMember(selectedTeam.id, memberId);
      setMembers(members.filter(m => m.id !== memberId));
      setActionMenuOpen(null);
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await teamAPI.cancelInvitation(invitationId);
      setInvitations(invitations.filter(i => i.id !== invitationId));
    } catch (err) {
      setError('Failed to cancel invitation');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      await teamAPI.resendInvitation(invitationId);
      setError(null);
      // Show success message briefly
      const successMsg = 'Invitation resent successfully!';
      setError(successMsg);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleAcceptInvitation = async (token: string) => {
    try {
      const result = await teamAPI.acceptInvitation(token);
      setPendingInvitations(pendingInvitations.filter(i => !i.inviteLink?.includes(token)));
      // Reload teams and select the newly joined team
      const updatedTeams = await teamAPI.getTeams();
      setTeams(updatedTeams);
      // Select the team that was just joined
      const joinedTeam = updatedTeams.find(t => t.id === result.teamId);
      if (joinedTeam) {
        setSelectedTeam(joinedTeam);
        // Load members for the new team
        const teamMembers = await teamAPI.getTeamMembers(joinedTeam.id);
        setMembers(teamMembers);
      }
    } catch (err) {
      setError('Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (token: string) => {
    try {
      await teamAPI.declineInvitation(token);
      setPendingInvitations(pendingInvitations.filter(i => !i.inviteLink?.includes(token)));
    } catch (err) {
      setError('Failed to decline invitation');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Check by user ID or email for compatibility
  const currentUserMember = members.find(m =>
    m.userId === user?.id || m.odIduser === user?.id || m.email === user?.email
  );
  const currentUserRole = currentUserMember?.role;
  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Invitations
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white rounded-xl p-3">
                <div>
                  <p className="font-medium text-gray-900">{inv.teamName}</p>
                  <p className="text-sm text-gray-500">Invited by {inv.invitedByName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvitation(inv.inviteLink?.split('/').pop() || '')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(inv.inviteLink?.split('/').pop() || '')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-5 h-5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your team members and invitations</p>
        </div>
        <button
          onClick={() => setIsCreateTeamModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No teams yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first team to start collaborating</p>
          <button
            onClick={() => setIsCreateTeamModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Team Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/20">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Teams</h3>
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      selectedTeam?.id === team.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{team.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{team.memberCount} members</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-3 space-y-6">
            {selectedTeam && (
              <>
                {/* Team Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20">
                  <div className="flex items-center justify-between min-h-[44px]">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTeam.name}</h2>
                      {selectedTeam.description && (
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{selectedTeam.description}</p>
                      )}
                    </div>
                    {canManageTeam ? (
                      <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        Add Member
                      </button>
                    ) : (
                      <div className="w-[140px]" />
                    )}
                  </div>
                </div>

                {/* Members List */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Members ({members.length})
                  </h3>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(member.role)}`}>
                            {getRoleIcon(member.role)}
                            {member.role}
                          </span>
                          {canManageTeam && member.role !== 'owner' && (
                            <div className="relative">
                              <button
                                onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                                className="p-2 hover:bg-gray-200 rounded-lg"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-500" />
                              </button>
                              {actionMenuOpen === member.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border z-10">
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-xl"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                    Remove from team
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Invitations */}
                {canManageTeam && invitations.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Pending Invitations ({invitations.length})
                    </h3>
                    <div className="space-y-3">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-100"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Mail className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{invitation.email}</p>
                              <p className="text-sm text-gray-500">
                                Invited as {invitation.role} by {invitation.invitedByName}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={resendingId === invitation.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm disabled:opacity-50"
                            >
                              {resendingId === invitation.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              Resend
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInviteMember}
        onAddMember={handleAddMember}
        teamId={selectedTeam?.id || ''}
        teamName={selectedTeam?.name || ''}
      />

      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onCreate={handleCreateTeam}
      />
    </div>
  );
};

export default TeamPage;
