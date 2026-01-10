import React, { useState, useEffect } from 'react';
import { Button } from './UIComponents';
import { ICONS } from '../constants';
import { okrAPI, CreateObjectiveData, UserBasic, ParentKeyResult, OKRLevel, subscriptionAPI, SubscriptionInfo, CanCreateOKRResult, teamAPI, Team } from '../api/client';
import { Loader2, AlertCircle, Trash2, User, GitBranch, Crown, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CreateOKRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Called after successful creation to refresh list
}

interface KeyResultFormData {
  description: string;
  metricType: 'percentage' | 'number' | 'currency' | 'boolean';
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
}

const emptyKeyResult: KeyResultFormData = {
  description: '',
  metricType: 'number',
  startValue: 0,
  targetValue: 100,
  currentValue: 0,
  unit: ''
};

// Allowed levels based on user role
const ALLOWED_LEVELS: Record<string, OKRLevel[]> = {
  admin: ['company', 'team', 'individual'],
  lead: ['team', 'individual'],
  user: ['individual']
};

const LEVEL_LABELS: Record<OKRLevel, string> = {
  company: 'Azienda',
  department: 'Dipartimento',
  team: 'Team',
  individual: 'Individuale'
};

const CreateOKRModal: React.FC<CreateOKRModalProps> = ({ isOpen, onClose, onSave }) => {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role || 'user';
  const allowedLevels = ALLOWED_LEVELS[userRole] || ALLOWED_LEVELS.user;
  const defaultLevel = allowedLevels[0];

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserBasic[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [availableParents, setAvailableParents] = useState<ParentKeyResult[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [canCreateOKRResult, setCanCreateOKRResult] = useState<CanCreateOKRResult | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: defaultLevel,
    period: 'Q1 2026',
    dueDate: '',
    ownerId: '',
    teamId: '' as string,
    parentKeyResultId: '' as string,
    keyResults: [{ ...emptyKeyResult }] as KeyResultFormData[]
  });

  // Load users, teams, and subscription info when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadTeams();
      // Load subscription info for KR limits
      subscriptionAPI.getInfo()
        .then(info => setSubscriptionInfo(info))
        .catch(err => console.error('Failed to load subscription info:', err));
      // Check if user can create an OKR
      subscriptionAPI.canCreateOKR()
        .then(result => {
          setCanCreateOKRResult(result);
          if (!result.allowed && result.error) {
            setError(result.error);
          }
        })
        .catch(err => console.error('Failed to check OKR limit:', err));
    }
  }, [isOpen]);

  // Load available parents when level changes
  useEffect(() => {
    if (isOpen && formData.level !== 'company') {
      loadAvailableParents(formData.level);
    } else {
      setAvailableParents([]);
      setFormData(prev => ({ ...prev, parentKeyResultId: '' }));
    }
  }, [isOpen, formData.level]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const userList = await okrAPI.getUsers();
      setUsers(userList);
      // Default to current user
      if (currentUser && !formData.ownerId) {
        setFormData(prev => ({ ...prev, ownerId: currentUser.id }));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const teamList = await teamAPI.getTeams();
      setTeams(teamList);
      // If only one team, auto-select it
      if (teamList.length === 1) {
        setFormData(prev => ({ ...prev, teamId: teamList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const loadAvailableParents = async (level: OKRLevel) => {
    setIsLoadingParents(true);
    try {
      const parents = await okrAPI.getAvailableParents(level);
      setAvailableParents(parents);
    } catch (err) {
      console.error('Failed to load available parents:', err);
      setAvailableParents([]);
    } finally {
      setIsLoadingParents(false);
    }
  };

  if (!isOpen) return null;

  // Check if KR limit is reached (for free tier)
  // Default to 2 KRs if subscription info not loaded yet (assume free tier)
  const isPremium = subscriptionInfo?.tier === 'premium';
  const krLimit = isPremium ? null : (subscriptionInfo?.limits?.krsPerOkr ?? 2);
  const isKRLimitReached = !isPremium && formData.keyResults.length >= (krLimit ?? 2);

  const handleAddKR = () => {
    // Check limit directly with current state
    const currentKRCount = formData.keyResults.length;
    const maxKRs = isPremium ? Infinity : (subscriptionInfo?.limits?.krsPerOkr ?? 2);

    if (currentKRCount >= maxKRs) {
      setError(`Hai raggiunto il limite di ${maxKRs} Key Results per OKR nel piano Free. Passa a Premium per aggiungerne altri.`);
      return;
    }
    setError(null); // Clear any previous error
    setFormData(prev => ({
      ...prev,
      keyResults: [...prev.keyResults, { ...emptyKeyResult }]
    }));
  };

  const handleRemoveKR = (index: number) => {
    if (formData.keyResults.length > 1) {
      const newKRs = formData.keyResults.filter((_, i) => i !== index);
      setFormData({ ...formData, keyResults: newKRs });
    }
  };

  const handleKRChange = (index: number, field: keyof KeyResultFormData, value: string | number) => {
    const newKRs = [...formData.keyResults];
    // Parse numeric fields to remove leading zeros
    const numericFields = ['startValue', 'targetValue', 'currentValue'];
    if (numericFields.includes(field)) {
      const numValue = value === '' ? 0 : parseFloat(String(value)) || 0;
      newKRs[index] = { ...newKRs[index], [field]: numValue };
    } else if (field === 'metricType' && value === 'boolean') {
      // When switching to boolean, set default values
      newKRs[index] = { ...newKRs[index], metricType: 'boolean', startValue: 0, targetValue: 1, currentValue: 0, unit: '' };
    } else {
      newKRs[index] = { ...newKRs[index], [field]: value };
    }
    setFormData({ ...formData, keyResults: newKRs });
  };

  const resetForm = () => {
    setStep(1);
    setError(null);
    setAvailableParents([]);
    setCanCreateOKRResult(null);
    setFormData({
      title: '',
      description: '',
      level: defaultLevel,
      period: 'Q1 2026',
      dueDate: '',
      ownerId: currentUser?.id || '',
      teamId: teams.length === 1 ? teams[0].id : '',
      parentKeyResultId: '',
      keyResults: [{ ...emptyKeyResult }]
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check OKR limit
    if (canCreateOKRResult && !canCreateOKRResult.allowed) {
      setError(canCreateOKRResult.error || 'Hai raggiunto il limite di OKR per il tuo ruolo nel piano Free.');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      setError('Il titolo dell\'obiettivo è obbligatorio');
      return;
    }

    // Team is required for team and individual levels
    if ((formData.level === 'team' || formData.level === 'individual') && !formData.teamId) {
      setError('Seleziona un team per questo OKR');
      return;
    }

    // Parent KR is required for team and individual levels
    if (formData.level === 'team' && !formData.parentKeyResultId) {
      setError('Per gli OKR di livello Team è obbligatorio selezionare un Key Result di un OKR Azienda');
      return;
    }
    if (formData.level === 'individual' && !formData.parentKeyResultId) {
      setError('Per gli OKR di livello Individuale è obbligatorio selezionare un Key Result di un OKR Team');
      return;
    }

    const validKRs = formData.keyResults.filter(kr => kr.description.trim());
    if (validKRs.length === 0) {
      setError('Aggiungi almeno un Key Result');
      return;
    }

    // Check KR limit for free tier
    if (!isPremium && validKRs.length > (krLimit ?? 2)) {
      setError(`Puoi creare massimo ${krLimit ?? 2} Key Results per OKR nel piano Free. Passa a Premium per aggiungerne altri.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const objectiveData: CreateObjectiveData = {
        title: formData.title,
        description: formData.description || undefined,
        level: formData.level,
        period: formData.period,
        dueDate: formData.dueDate || undefined,
        ownerId: formData.ownerId || undefined,
        teamId: formData.teamId || undefined,
        parentKeyResultId: formData.parentKeyResultId || undefined,
        keyResults: validKRs.map(kr => ({
          description: kr.description,
          metricType: kr.metricType,
          startValue: Number(kr.startValue),
          targetValue: Number(kr.targetValue),
          currentValue: Number(kr.currentValue)
        }))
      };

      await okrAPI.createObjective(objectiveData);
      resetForm();
      onSave(); // Refresh the list
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione dell\'OKR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl dark:shadow-none dark:ring-1 dark:ring-slate-700">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
            {step === 1 ? 'Nuovo Obiettivo' : 'Key Results'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-slate-300 [&>svg]:w-4 [&>svg]:h-4" disabled={isSubmitting}>
            {ICONS.Error}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Titolo Obiettivo *</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="es. Aumentare la brand awareness"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Descrivi l'obiettivo in dettaglio..."
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Livello</label>
                   <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:12px_12px] bg-[position:right_10px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value as OKRLevel, parentKeyResultId: ''})}
                      disabled={isSubmitting}
                   >
                     {allowedLevels.map(level => (
                       <option key={level} value={level}>{LEVEL_LABELS[level]}</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Periodo</label>
                   <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:12px_12px] bg-[position:right_10px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                      value={formData.period}
                      onChange={e => setFormData({...formData, period: e.target.value})}
                      disabled={isSubmitting}
                   >
                     <option value="Q1 2026">Q1 2026</option>
                     <option value="Q2 2026">Q2 2026</option>
                     <option value="Q3 2026">Q3 2026</option>
                     <option value="Q4 2026">Q4 2026</option>
                     <option value="Annual 2026">Annuale 2026</option>
                   </select>
                </div>
              </div>

              {/* Parent OKR Selector - required for team and individual levels */}
              {formData.level !== 'company' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Key Result Parent *
                    <span className="font-normal text-slate-500 dark:text-slate-400 ml-1">
                      (da OKR {formData.level === 'team' ? 'Azienda' : 'Team'})
                    </span>
                  </label>
                  <div className="relative">
                    <GitBranch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:12px_12px] bg-[position:right_10px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                      value={formData.parentKeyResultId}
                      onChange={e => setFormData({...formData, parentKeyResultId: e.target.value})}
                      disabled={isSubmitting || isLoadingParents}
                      required
                    >
                      <option value="">Seleziona Key Result parent...</option>
                      {isLoadingParents ? (
                        <option disabled>Caricamento...</option>
                      ) : (
                        availableParents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            [{LEVEL_LABELS[parent.objectiveLevel]}] {parent.objectiveTitle} → {parent.description}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {availableParents.length === 0 && !isLoadingParents && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                      {formData.level === 'team'
                        ? 'Devi prima creare un OKR Azienda con almeno un Key Result'
                        : 'Devi prima creare un OKR Team con almeno un Key Result'}
                    </p>
                  )}
                </div>
              )}

              {/* Team Selector - required for team and individual levels */}
              {(formData.level === 'team' || formData.level === 'individual') && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Team *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:12px_12px] bg-[position:right_10px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                      value={formData.teamId}
                      onChange={e => setFormData({...formData, teamId: e.target.value})}
                      disabled={isSubmitting || isLoadingTeams}
                      required
                    >
                      <option value="">Seleziona team...</option>
                      {isLoadingTeams ? (
                        <option disabled>Caricamento...</option>
                      ) : (
                        teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {teams.length === 0 && !isLoadingTeams && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                      Devi far parte di almeno un team per creare OKR
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assegnato a *</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {/* User can only assign to themselves, Lead/Admin can assign to anyone */}
                    {userRole === 'user' ? (
                      <div className="w-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                        {currentUser?.name || 'Tu'}
                      </div>
                    ) : (
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:12px_12px] bg-[position:right_10px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                        value={formData.ownerId}
                        onChange={e => setFormData({...formData, ownerId: e.target.value})}
                        disabled={isSubmitting || isLoadingUsers}
                      >
                        {isLoadingUsers ? (
                          <option>Caricamento...</option>
                        ) : users.length === 0 ? (
                          <option value={currentUser?.id || ''}>
                            {currentUser?.name || 'Utente corrente'}
                          </option>
                        ) : (
                          users.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name} {u.id === currentUser?.id ? '(tu)' : ''}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Scadenza</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Key Results</h3>
                   {krLimit !== null && (
                     <span className="text-[10px] text-slate-400 dark:text-slate-500">
                       ({formData.keyResults.length}/{krLimit})
                     </span>
                   )}
                 </div>
                 <button
                   type="button"
                   onClick={handleAddKR}
                   className={`text-[10px] font-medium flex items-center gap-1 ${
                     isKRLimitReached
                       ? 'text-slate-400 dark:text-slate-500'
                       : 'text-blue-600 hover:text-blue-700'
                   }`}
                   disabled={isSubmitting}
                 >
                   <span className="[&>svg]:w-3 [&>svg]:h-3">{ICONS.Plus}</span> Aggiungi KR
                 </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Definisci i risultati chiave misurabili
              </p>

              {formData.keyResults.map((kr, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg space-y-2 relative">
                   <div className="flex items-start gap-2">
                     <div className="flex-1">
                       <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Descrizione *</label>
                       <input
                         type="text"
                         placeholder="es. Generare 50 nuovi lead qualificati"
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                         value={kr.description}
                         onChange={e => handleKRChange(idx, 'description', e.target.value)}
                         disabled={isSubmitting}
                       />
                     </div>
                     {formData.keyResults.length > 1 && (
                       <button
                         type="button"
                         onClick={() => handleRemoveKR(idx)}
                         className="mt-5 p-1 text-gray-400 hover:text-red-500 transition-colors"
                         disabled={isSubmitting}
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     )}
                   </div>

                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo Metrica</label>
                       <select
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 pl-2.5 pr-7 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-[length:10px_10px] bg-[position:right_8px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                         value={kr.metricType}
                         onChange={e => handleKRChange(idx, 'metricType', e.target.value)}
                         disabled={isSubmitting}
                       >
                         <option value="number">Numero</option>
                         <option value="percentage">Percentuale (%)</option>
                         <option value="currency">Valuta</option>
                         <option value="boolean">Si/No</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Unità</label>
                       <input
                         type="text"
                         placeholder={kr.metricType === 'boolean' ? '-' : 'es. leads, €'}
                         className={`w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none ${kr.metricType === 'boolean' ? 'opacity-50 cursor-not-allowed' : ''}`}
                         value={kr.metricType === 'boolean' ? '' : kr.unit}
                         onChange={e => handleKRChange(idx, 'unit', e.target.value)}
                         disabled={isSubmitting || kr.metricType === 'boolean'}
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-3 gap-2">
                     <div>
                       <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Iniziale</label>
                       {kr.metricType === 'boolean' ? (
                         <div className="w-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-700 dark:text-slate-300 px-2.5 py-1.5 text-xs">
                           No
                         </div>
                       ) : (
                         <input
                           type="text"
                           inputMode="decimal"
                           className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                           value={kr.startValue}
                           onChange={e => handleKRChange(idx, 'startValue', e.target.value.replace(/^0+(?=\d)/, ''))}
                           disabled={isSubmitting}
                         />
                       )}
                     </div>
                     <div>
                       <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Attuale</label>
                       {kr.metricType === 'boolean' ? (
                         <select
                           className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                           value={kr.currentValue}
                           onChange={e => handleKRChange(idx, 'currentValue', e.target.value)}
                           disabled={isSubmitting}
                         >
                           <option value={0}>No</option>
                           <option value={1}>Sì</option>
                         </select>
                       ) : (
                         <input
                           type="text"
                           inputMode="decimal"
                           className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                           value={kr.currentValue}
                           onChange={e => handleKRChange(idx, 'currentValue', e.target.value.replace(/^0+(?=\d)/, ''))}
                           disabled={isSubmitting}
                         />
                       )}
                     </div>
                     <div>
                       <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Target *</label>
                       {kr.metricType === 'boolean' ? (
                         <div className="w-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-700 dark:text-slate-300 px-2.5 py-1.5 text-xs">
                           Sì
                         </div>
                       ) : (
                         <input
                           type="text"
                           inputMode="decimal"
                           className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                           value={kr.targetValue}
                           onChange={e => handleKRChange(idx, 'targetValue', e.target.value.replace(/^0+(?=\d)/, ''))}
                           disabled={isSubmitting}
                         />
                       )}
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
             {step === 2 && (
               <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} disabled={isSubmitting}>
                 Indietro
               </Button>
             )}
             {step === 1 ? (
               <Button
                 type="button"
                 size="sm"
                 onClick={() => {
                   // Check OKR limit before proceeding
                   if (canCreateOKRResult && !canCreateOKRResult.allowed) {
                     setError(canCreateOKRResult.error || 'Hai raggiunto il limite di OKR per il tuo ruolo nel piano Free.');
                     return;
                   }
                   setStep(2);
                 }}
               >
                 Avanti
               </Button>
             ) : (
               <Button
                 type="submit"
                 size="sm"
                 disabled={isSubmitting}
                 onClick={() => {
                   // Check OKR limit before submitting
                   if (canCreateOKRResult && !canCreateOKRResult.allowed) {
                     setError(canCreateOKRResult.error || 'Hai raggiunto il limite di OKR per il tuo ruolo nel piano Free.');
                   }
                 }}
               >
                 {isSubmitting ? (
                   <span className="flex items-center gap-1.5">
                     <Loader2 className="w-3 h-3 animate-spin" />
                     Creazione...
                   </span>
                 ) : (
                   'Crea OKR'
                 )}
               </Button>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOKRModal;
