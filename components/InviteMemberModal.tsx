import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, Shield, User, Loader2, AlertCircle, Search, UserPlus } from 'lucide-react';
import { teamAPI, SearchUser } from '../api/client';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'admin' | 'member') => Promise<void>;
  onAddMember?: (userId: string, role: 'admin' | 'member') => Promise<void>;
  teamId: string;
  teamName: string;
}

type Mode = 'invite' | 'add';

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  onAddMember,
  teamId,
  teamName
}) => {
  const [mode, setMode] = useState<Mode>('add');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);

  // Debounced search
  useEffect(() => {
    if (!isOpen || mode !== 'add') return;

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await teamAPI.searchUsers(teamId, searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, teamId, isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'invite') {
      if (!email) {
        setError('Please enter an email address');
        return;
      }
      if (!email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
      setIsLoading(true);
      try {
        await onInvite(email, role);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send invitation');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!selectedUser) {
        setError('Please select a user to add');
        return;
      }
      if (!onAddMember) {
        setError('Add member functionality not available');
        return;
      }
      setIsLoading(true);
      try {
        await onAddMember(selectedUser.id, role);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add member');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setError(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setMode('add');
    onClose();
  };

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Member</h2>
            <p className="text-sm text-gray-500">Add someone to {teamName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => { setMode('add'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-colors ${
              mode === 'add'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Existing User
          </button>
          <button
            type="button"
            onClick={() => { setMode('invite'); setError(null); setSelectedUser(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-colors ${
              mode === 'invite'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Invite by Email
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'add' ? (
            /* Search User */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search User
              </label>
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{selectedUser.name}</p>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="p-1.5 hover:bg-blue-100 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                  )}

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                        >
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border p-4 text-center text-gray-500">
                      No users found. Try inviting by email.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Email Input */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('member')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                  role === 'member'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className={`w-5 h-5 ${role === 'member' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`font-medium ${role === 'member' ? 'text-blue-900' : 'text-gray-900'}`}>
                    Member
                  </p>
                  <p className="text-xs text-gray-500">Can view and edit</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                  role === 'admin'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Shield className={`w-5 h-5 ${role === 'admin' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`font-medium ${role === 'admin' ? 'text-blue-900' : 'text-gray-900'}`}>
                    Admin
                  </p>
                  <p className="text-xs text-gray-500">Can manage team</p>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (mode === 'add' && !selectedUser)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'add' ? 'Adding...' : 'Sending...'}
                </>
              ) : (
                <>
                  {mode === 'add' ? <UserPlus className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                  {mode === 'add' ? 'Add Member' : 'Send Invitation'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal;
