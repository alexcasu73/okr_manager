import React, { useState, useEffect } from 'react';
import { teamAPI, Team, TeamMember, TeamInvitation, SearchUser } from '../api/client';
import { useAuth } from '../context/AuthContext';
import InviteMemberModal from './InviteMemberModal';
import CreateTeamModal from './CreateTeamModal';
import EditTeamModal from './EditTeamModal';
import {
  Users,
  Plus,
  Mail,
  Crown,
  Shield,
  Edit,
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

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

  const handleUpdateTeam = async (data: { name: string; description?: string }) => {
    if (!teamToEdit) return;
    try {
      const updatedTeam = await teamAPI.updateTeam(teamToEdit.id, data);

      // Update team in list
      setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t));

      // Update selected team if it's the one being edited
      if (selectedTeam?.id === updatedTeam.id) {
        setSelectedTeam(updatedTeam);
      }

      setIsEditModalOpen(false);
      setTeamToEdit(null);
    } catch (err) {
      throw err;
    }
  };

  const openEditModal = (team: Team) => {
    setTeamToEdit(team);
    setIsEditModalOpen(true);
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

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    setIsDeleting(true);
    try {
      await teamAPI.deleteTeam(teamToDelete.id);

      // Remove team from list
      const updatedTeams = teams.filter(t => t.id !== teamToDelete.id);
      setTeams(updatedTeams);

      // If deleted team was selected, select another team
      if (selectedTeam?.id === teamToDelete.id) {
        setSelectedTeam(updatedTeams.length > 0 ? updatedTeams[0] : null);
      }

      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirmation = (team: Team) => {
    setTeamToDelete(team);
    setIsDeleteModalOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-3 h-3 text-blue-500" />;
      default:
        return <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
      case 'admin':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Pending Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex-shrink-0">
          <h3 className="font-semibold text-xs text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Inviti in sospeso
          </h3>
          <div className="space-y-1.5">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg p-2">
                <div>
                  <p className="font-medium text-xs text-slate-900 dark:text-slate-100">{inv.teamName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Invitato da {inv.invitedByName}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAcceptInvitation(inv.inviteLink?.split('/').pop() || '')}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Accetta
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(inv.inviteLink?.split('/').pop() || '')}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-[10px] hover:bg-slate-300 dark:hover:bg-slate-500"
                  >
                    <XCircle className="w-3 h-3" />
                    Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-2.5 flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-400 hover:text-red-600 dark:hover:text-red-300" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Team</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Gestisci membri e inviti</p>
        </div>
        <button
          onClick={() => setIsCreateTeamModalOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuovo Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Nessun team</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Crea il tuo primo team</p>
            <button
              onClick={() => setIsCreateTeamModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuovo Team
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-3 overflow-hidden">
          {/* Team Selector */}
          <div className="lg:col-span-1 min-h-0 overflow-hidden">
            <div className="h-full bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 flex flex-col">
              <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-2">I tuoi Team</h3>
              <div className="flex-1 overflow-y-auto space-y-1">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${selectedTeam?.id === team.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent'
                      }`}
                  >
                    <p className="font-medium text-xs text-slate-900 dark:text-slate-100">{team.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{team.memberCount} membri</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-3 min-h-0 overflow-hidden flex flex-col gap-3">
            {selectedTeam && (
              <>
                {/* Team Header */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedTeam.name}</h2>
                      {selectedTeam.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedTeam.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageTeam && (
                        <>
                          <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Aggiungi
                          </button>
                          <button
                            onClick={() => openEditModal(selectedTeam)}
                            className="flex items-center gap-1 bg-slate-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-xs"
                            title="Modifica team"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {currentUserRole === 'owner' && (
                        <button
                          onClick={() => openDeleteConfirmation(selectedTeam)}
                          className="flex items-center gap-1 bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs"
                          title="Elimina team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Members List */}
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 flex flex-col overflow-hidden">
                  <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5 flex-shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    Membri ({members.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-1.5">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-xs text-slate-900 dark:text-slate-100">{member.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${getRoleBadgeColor(member.role)}`}>
                            <span className="[&>svg]:w-3 [&>svg]:h-3">{getRoleIcon(member.role)}</span>
                            {member.role}
                          </span>
                          {canManageTeam && member.role !== 'owner' && (
                            <div className="relative">
                              <button
                                onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                              >
                                <MoreVertical className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </button>
                              {actionMenuOpen === member.id && (
                                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-xs"
                                  >
                                    <UserMinus className="w-3 h-3" />
                                    Rimuovi
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
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 flex-shrink-0 max-h-[200px] overflow-y-auto">
                    <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Inviti in attesa ({invitations.length})
                    </h3>
                    <div className="space-y-1.5">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center">
                              <Mail className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <p className="font-medium text-xs text-slate-900 dark:text-slate-100">{invitation.email}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {invitation.role} - da {invitation.invitedByName}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={resendingId === invitation.id}
                              className="flex items-center gap-1 px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-[10px] disabled:opacity-50"
                            >
                              {resendingId === invitation.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="flex items-center gap-1 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-[10px]"
                            >
                              <Trash2 className="w-3 h-3" />
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

      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateTeam}
        currentName={teamToEdit?.name || ''}
        currentDescription={teamToEdit?.description}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setIsDeleteModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-none dark:ring-1 dark:ring-slate-700 w-full max-w-sm mx-4 p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Eliminare Team?</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Azione irreversibile</p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-4">
              <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                Eliminare <strong>{teamToDelete.name}</strong>?
              </p>
              <ul className="list-disc list-inside text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5">
                <li>{teamToDelete.memberCount} membri</li>
                <li>Tutti gli inviti</li>
                <li>Tutti i dati</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs"
                disabled={isDeleting}
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Elimina
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
