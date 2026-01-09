import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Key,
  Shield,
  UserCheck,
  X,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  Target,
  UsersRound
} from 'lucide-react';
import { adminAPI, AdminUser, CreateUserData } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// Roles that each user type can assign
const ASSIGNABLE_ROLES: Record<string, Array<{ value: string; label: string }>> = {
  azienda: [
    { value: 'user', label: 'User' },
    { value: 'lead', label: 'Lead' },
    { value: 'admin', label: 'Admin' }
  ],
  admin: [
    { value: 'user', label: 'User' },
    { value: 'lead', label: 'Lead' },
    { value: 'admin', label: 'Admin' }
  ],
  lead: [
    { value: 'user', label: 'User' },
    { value: 'lead', label: 'Lead' }
  ],
  user: [
    { value: 'user', label: 'User' }
  ]
};

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const assignableRoles = ASSIGNABLE_ROLES[currentUser?.role || 'user'] || ASSIGNABLE_ROLES.user;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '',
    name: '',
    role: 'user'
  });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'user' });
  const [newPassword, setNewPassword] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal states
  const [userDataCount, setUserDataCount] = useState<{
    objectivesCount: number;
    keyResultsCount: number;
    teamsOwnedCount: number;
    teamMembershipsCount: number;
    hasData: boolean;
  } | null>(null);
  const [deleteLoadingData, setDeleteLoadingData] = useState(false);
  const [reassignToUserId, setReassignToUserId] = useState<string>('');
  const [reassignMode, setReassignMode] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState<{ objectives: number; teams: number } | null>(null);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getUsers({ role: roleFilter || undefined });
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento utenti');
    } finally {
      setLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await adminAPI.createUser(createForm);
      setShowCreateModal(false);
      setCreateForm({ email: '', name: '', role: 'user' });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Errore nella creazione utente');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit user
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await adminAPI.updateUser(selectedUser.id, editForm);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Errore nella modifica utente');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await adminAPI.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Errore nella cancellazione utente');
    } finally {
      setFormLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const result = await adminAPI.resetPassword(selectedUser.id, newPassword || undefined);
      if (result.temporaryPassword) {
        setTempPassword(result.temporaryPassword);
      } else {
        setShowResetPasswordModal(false);
        setSelectedUser(null);
        setNewPassword('');
      }
    } catch (err: any) {
      setFormError(err.message || 'Errore nel reset password');
    } finally {
      setFormLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setShowEditModal(true);
    setFormError(null);
  };

  // Open delete modal
  const openDeleteModal = async (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
    setFormError(null);
    setUserDataCount(null);
    setReassignMode(false);
    setReassignToUserId('');
    setReassignSuccess(null);

    // Fetch user's data count
    setDeleteLoadingData(true);
    try {
      const counts = await adminAPI.getUserDataCount(user.id);
      setUserDataCount(counts);
    } catch (err: any) {
      console.error('Error fetching user data count:', err);
    } finally {
      setDeleteLoadingData(false);
    }
  };

  // Handle reassign OKRs
  const handleReassignOKRs = async () => {
    if (!selectedUser || !reassignToUserId) return;
    setReassignLoading(true);
    setFormError(null);
    try {
      const result = await adminAPI.reassignUserOKRs(selectedUser.id, reassignToUserId);
      setReassignSuccess({ objectives: result.reassignedObjectives, teams: result.reassignedTeams });
      // Refresh data count
      const counts = await adminAPI.getUserDataCount(selectedUser.id);
      setUserDataCount(counts);
      setReassignMode(false);
    } catch (err: any) {
      setFormError(err.message || 'Errore nella riassegnazione');
    } finally {
      setReassignLoading(false);
    }
  };

  // Open reset password modal
  const openResetPasswordModal = (user: AdminUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setTempPassword(null);
    setShowResetPasswordModal(true);
    setFormError(null);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if current user is azienda (only azienda can manage users)
  if (currentUser?.role !== 'azienda') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-12 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Accesso Negato</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Solo le aziende possono accedere a questa sezione.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestione Utenti</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestisci gli utenti della piattaforma</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setFormError(null);
          }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuovo Utente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Tutti i ruoli</option>
            <option value="admin">Admin</option>
            <option value="lead">Lead</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400">Caricamento utenti...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Nessun utente trovato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">User</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Created</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                        {user.id === currentUser?.id && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Tu</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        user.role === 'admin'
                          ? 'border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40'
                          : user.role === 'lead'
                          ? 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40'
                          : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'lead' ? 'Lead' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        {user.id !== currentUser?.id ? (
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className="w-9 h-9" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuovo Utente">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              L'utente riceverà un'email per impostare la password
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ruolo</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'user' | 'lead' | 'admin' })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              {assignableRoles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crea
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifica Utente">
        <form onSubmit={handleEditUser} className="space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ruolo</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              disabled={selectedUser?.id === currentUser?.id}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            >
              {assignableRoles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            {selectedUser?.id === currentUser?.id && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Non puoi cambiare il tuo ruolo</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Salva
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Elimina Utente">
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}

          {/* Success message for reassignment */}
          {reassignSuccess && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Riassegnati {reassignSuccess.objectives} OKR e {reassignSuccess.teams} team
            </div>
          )}

          {/* Warning header */}
          <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Sei sicuro?</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Stai per eliminare <strong>{selectedUser?.name}</strong>. Questa azione non può essere annullata.
              </p>
            </div>
          </div>

          {/* Data count section */}
          {deleteLoadingData ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400 dark:text-slate-500" />
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Caricamento dati...</span>
            </div>
          ) : userDataCount && userDataCount.hasData ? (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Attenzione: questo utente ha dati associati che verranno eliminati!
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {userDataCount.objectivesCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <Target className="w-4 h-4" />
                    <span>{userDataCount.objectivesCount} OKR</span>
                  </div>
                )}
                {userDataCount.keyResultsCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <Check className="w-4 h-4" />
                    <span>{userDataCount.keyResultsCount} Key Results</span>
                  </div>
                )}
                {userDataCount.teamsOwnedCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <UsersRound className="w-4 h-4" />
                    <span>{userDataCount.teamsOwnedCount} Team (owner)</span>
                  </div>
                )}
                {userDataCount.teamMembershipsCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <Users className="w-4 h-4" />
                    <span>{userDataCount.teamMembershipsCount} Membership</span>
                  </div>
                )}
              </div>

              {/* Reassign option */}
              {!reassignMode ? (
                <button
                  onClick={() => setReassignMode(true)}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                >
                  <ArrowRight className="w-4 h-4" />
                  Riassegna OKR e Team ad un altro utente
                </button>
              ) : (
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <label className="block text-sm font-medium text-amber-800">
                    Seleziona utente di destinazione:
                  </label>
                  <select
                    value={reassignToUserId}
                    onChange={(e) => setReassignToUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                  >
                    <option value="">-- Seleziona utente --</option>
                    {users
                      .filter(u => u.id !== selectedUser?.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))
                    }
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReassignMode(false)}
                      className="flex-1 px-3 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 text-sm"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleReassignOKRs}
                      disabled={!reassignToUserId || reassignLoading}
                      className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                      {reassignLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Riassegna
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : userDataCount && !userDataCount.hasData ? (
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Questo utente non ha OKR o team associati. Puoi procedere con l'eliminazione.
              </p>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700"
            >
              Annulla
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={formLoading || deleteLoadingData}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {userDataCount?.hasData ? 'Elimina comunque' : 'Elimina'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetPasswordModal} onClose={() => { setShowResetPasswordModal(false); setTempPassword(null); }} title="Reset Password">
        {tempPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <p className="text-sm text-green-800 dark:text-green-300 mb-2">Password temporanea generata:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 font-mono text-sm text-slate-900 dark:text-slate-100">
                  {tempPassword}
                </code>
                <button
                  onClick={() => copyToClipboard(tempPassword)}
                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comunica questa password all'utente. Dovrà cambiarla al primo accesso.
            </p>
            <button
              onClick={() => { setShowResetPasswordModal(false); setTempPassword(null); }}
              className="w-full px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                {formError}
              </div>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Resetta la password per <strong>{selectedUser?.name}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nuova Password (opzionale)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Lascia vuoto per generare automaticamente"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserManagementPage;
