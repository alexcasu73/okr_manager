import React, { useState, useEffect } from 'react';
import { superadminAPI, Azienda, SuperadminStats, CreateAziendaData, Superadmin, CreateSuperadminData } from '../api/client';
import { Building2, Users, Target, Crown, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Eye, X, Check, AlertTriangle, Shield, UserCog } from 'lucide-react';

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const SuperadminPage: React.FC = () => {
  const [stats, setStats] = useState<SuperadminStats | null>(null);
  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedAzienda, setExpandedAzienda] = useState<Azienda | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAziendaData>({
    email: '',
    password: '',
    name: '',
    subscriptionTier: 'free',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Superadmin management
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [showCreateSuperadminModal, setShowCreateSuperadminModal] = useState(false);
  const [createSuperadminForm, setCreateSuperadminForm] = useState<CreateSuperadminData>({
    email: '',
    password: '',
    name: '',
  });
  const [createSuperadminLoading, setCreateSuperadminLoading] = useState(false);
  const [createSuperadminError, setCreateSuperadminError] = useState<string | null>(null);
  const [deleteSuperadminConfirm, setDeleteSuperadminConfirm] = useState<string | null>(null);
  const [deleteSuperadminLoading, setDeleteSuperadminLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'aziende' | 'superadmins'>('aziende');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, aziendeData, superadminsData] = await Promise.all([
        superadminAPI.getStats(),
        superadminAPI.getAziende(),
        superadminAPI.getSuperadmins(),
      ]);
      setStats(statsData);
      setAziende(aziendeData);
      setSuperadmins(superadminsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedAzienda(null);
    } else {
      try {
        const details = await superadminAPI.getAzienda(id);
        setExpandedAzienda(details);
        setExpandedId(id);
      } catch (err) {
        console.error('Error loading azienda details:', err);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await superadminAPI.createAzienda(createForm);
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', name: '', subscriptionTier: 'free' });
      loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Errore nella creazione');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (azienda: Azienda) => {
    try {
      await superadminAPI.setStatus(azienda.id, !azienda.is_active);
      loadData();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleToggleTier = async (azienda: Azienda) => {
    try {
      const newTier = azienda.subscription_tier === 'free' ? 'premium' : 'free';
      await superadminAPI.changeSubscription(azienda.id, newTier);
      loadData();
    } catch (err) {
      console.error('Error changing tier:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await superadminAPI.deleteAzienda(id);
      setDeleteConfirm(null);
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedAzienda(null);
      }
      loadData();
    } catch (err) {
      console.error('Error deleting:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Superadmin handlers
  const handleCreateSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSuperadminLoading(true);
    setCreateSuperadminError(null);
    try {
      await superadminAPI.createSuperadmin(createSuperadminForm);
      setShowCreateSuperadminModal(false);
      setCreateSuperadminForm({ email: '', password: '', name: '' });
      loadData();
    } catch (err) {
      setCreateSuperadminError(err instanceof Error ? err.message : 'Errore nella creazione');
    } finally {
      setCreateSuperadminLoading(false);
    }
  };

  const handleDeleteSuperadmin = async (id: string) => {
    setDeleteSuperadminLoading(true);
    try {
      await superadminAPI.deleteSuperadmin(id);
      setDeleteSuperadminConfirm(null);
      loadData();
    } catch (err) {
      console.error('Error deleting superadmin:', err);
      setCreateSuperadminError(err instanceof Error ? err.message : 'Errore nella eliminazione');
    } finally {
      setDeleteSuperadminLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pannello Superadmin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestisci aziende e altri superadmin della piattaforma
          </p>
        </div>
        <button
          onClick={() => activeTab === 'aziende' ? setShowCreateModal(true) : setShowCreateSuperadminModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'aziende' ? 'Nuova Azienda' : 'Nuovo Superadmin'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalAziende}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aziende</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.activeAziende}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Attive</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.premiumAziende}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Premium</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalUsers}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Utenti</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalOkrs}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">OKR</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalSuperadmins}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Superadmin</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('aziende')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'aziende'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Aziende
        </button>
        <button
          onClick={() => setActiveTab('superadmins')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'superadmins'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          Superadmin
        </button>
      </div>

      {/* Aziende List */}
      {activeTab === 'aziende' && (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Lista Aziende</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {aziende.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Nessuna azienda presente. Crea la prima azienda per iniziare.
            </div>
          ) : (
            aziende.map((azienda) => (
              <div key={azienda.id}>
                <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${azienda.is_active ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <Building2 className={`w-5 h-5 ${azienda.is_active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${azienda.is_active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                            {azienda.name}
                          </p>
                          {azienda.subscription_tier === 'premium' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                              <Crown className="w-3 h-3" /> Premium
                            </span>
                          )}
                          {!azienda.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                              Disabilitata
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{azienda.email}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{azienda.users_count} utenti</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleTier(azienda)}
                        title={azienda.subscription_tier === 'free' ? 'Passa a Premium' : 'Passa a Free'}
                        className={`p-2 rounded-lg transition-colors ${
                          azienda.subscription_tier === 'premium'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(azienda)}
                        title={azienda.is_active ? 'Disabilita' : 'Abilita'}
                        className={`p-2 rounded-lg transition-colors ${
                          azienda.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {azienda.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleExpand(azienda.id)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Dettagli"
                      >
                        {expandedId === azienda.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(azienda.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === azienda.id && expandedAzienda && (
                  <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-700/30">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                        Utenti ({expandedAzienda.users?.length || 0})
                      </h4>
                      {expandedAzienda.users && expandedAzienda.users.length > 0 ? (
                        <div className="space-y-2">
                          {expandedAzienda.users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                user.role === 'admin'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                  : user.role === 'lead'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Nessun utente</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        <p>OKR totali: {expandedAzienda.okr_count || 0}</p>
                        <p>Creata: {new Date(expandedAzienda.created_at).toLocaleDateString('it-IT')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {/* Superadmins List */}
      {activeTab === 'superadmins' && (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Lista Superadmin</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {superadmins.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Nessun superadmin presente.
            </div>
          ) : (
            superadmins.map((superadmin) => (
              <div key={superadmin.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                      <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {superadmin.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{superadmin.email}</p>
                    </div>
                    <div className="hidden md:block text-sm text-slate-500 dark:text-slate-400">
                      Creato: {new Date(superadmin.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setDeleteSuperadminConfirm(superadmin.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuova Azienda">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Azienda
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome azienda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@azienda.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Password (min. 8 caratteri)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Piano
            </label>
            <select
              value={createForm.subscriptionTier}
              onChange={(e) => setCreateForm({ ...createForm, subscriptionTier: e.target.value as 'free' | 'premium' })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
            >
              {createLoading ? 'Creazione...' : 'Crea Azienda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Conferma Eliminazione"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">
              Questa azione eliminerà permanentemente l'azienda, tutti i suoi utenti e tutti i loro OKR.
            </p>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Sei sicuro di voler procedere? Questa operazione non può essere annullata.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteLoading}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors"
            >
              {deleteLoading ? 'Eliminazione...' : 'Elimina'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Superadmin Modal */}
      <Modal isOpen={showCreateSuperadminModal} onClose={() => setShowCreateSuperadminModal(false)} title="Nuovo Superadmin">
        <form onSubmit={handleCreateSuperadmin} className="space-y-4">
          {createSuperadminError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {createSuperadminError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={createSuperadminForm.name}
              onChange={(e) => setCreateSuperadminForm({ ...createSuperadminForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome superadmin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={createSuperadminForm.email}
              onChange={(e) => setCreateSuperadminForm({ ...createSuperadminForm, email: e.target.value })}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={createSuperadminForm.password}
              onChange={(e) => setCreateSuperadminForm({ ...createSuperadminForm, password: e.target.value })}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Password (min. 8 caratteri)"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateSuperadminModal(false)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createSuperadminLoading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
            >
              {createSuperadminLoading ? 'Creazione...' : 'Crea Superadmin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Superadmin Confirmation Modal */}
      <Modal
        isOpen={deleteSuperadminConfirm !== null}
        onClose={() => setDeleteSuperadminConfirm(null)}
        title="Conferma Eliminazione Superadmin"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">
              Questa azione eliminerà permanentemente questo superadmin.
            </p>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Sei sicuro di voler procedere? Questa operazione non può essere annullata.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setDeleteSuperadminConfirm(null)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={() => deleteSuperadminConfirm && handleDeleteSuperadmin(deleteSuperadminConfirm)}
              disabled={deleteSuperadminLoading}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors"
            >
              {deleteSuperadminLoading ? 'Eliminazione...' : 'Elimina'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperadminPage;
