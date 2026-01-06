import React, { useState, useEffect } from 'react';
import { Button } from './UIComponents';
import { ICONS } from '../constants';
import { okrAPI, CreateObjectiveData, UserBasic, ParentObjective, OKRLevel } from '../api/client';
import { Loader2, AlertCircle, Trash2, User, GitBranch } from 'lucide-react';
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

const CreateOKRModal: React.FC<CreateOKRModalProps> = ({ isOpen, onClose, onSave }) => {
  const { user: currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserBasic[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [availableParents, setAvailableParents] = useState<ParentObjective[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'company' as OKRLevel,
    period: 'Q1 2026',
    dueDate: '',
    ownerId: '',
    parentObjectiveId: '' as string,
    keyResults: [{ ...emptyKeyResult }] as KeyResultFormData[]
  });

  // Load users when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Load available parents when level changes
  useEffect(() => {
    if (isOpen && formData.level !== 'company') {
      loadAvailableParents(formData.level);
    } else {
      setAvailableParents([]);
      setFormData(prev => ({ ...prev, parentObjectiveId: '' }));
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

  const handleAddKR = () => {
    setFormData({
      ...formData,
      keyResults: [...formData.keyResults, { ...emptyKeyResult }]
    });
  };

  const handleRemoveKR = (index: number) => {
    if (formData.keyResults.length > 1) {
      const newKRs = formData.keyResults.filter((_, i) => i !== index);
      setFormData({ ...formData, keyResults: newKRs });
    }
  };

  const handleKRChange = (index: number, field: keyof KeyResultFormData, value: string | number) => {
    const newKRs = [...formData.keyResults];
    newKRs[index] = { ...newKRs[index], [field]: value };
    setFormData({ ...formData, keyResults: newKRs });
  };

  const resetForm = () => {
    setStep(1);
    setError(null);
    setAvailableParents([]);
    setFormData({
      title: '',
      description: '',
      level: 'company',
      period: 'Q1 2026',
      dueDate: '',
      ownerId: currentUser?.id || '',
      parentObjectiveId: '',
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

    // Validation
    if (!formData.title.trim()) {
      setError('Il titolo dell\'obiettivo è obbligatorio');
      return;
    }

    // Parent OKR is required for team and individual levels
    if (formData.level === 'team' && !formData.parentObjectiveId) {
      setError('Per gli OKR di livello Team è obbligatorio selezionare un OKR Azienda come parent');
      return;
    }
    if (formData.level === 'individual' && !formData.parentObjectiveId) {
      setError('Per gli OKR di livello Individuale è obbligatorio selezionare un OKR Team come parent');
      return;
    }

    const validKRs = formData.keyResults.filter(kr => kr.description.trim());
    if (validKRs.length === 0) {
      setError('Aggiungi almeno un Key Result');
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
        parentObjectiveId: formData.parentObjectiveId || undefined,
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl dark:shadow-none dark:ring-1 dark:ring-slate-700">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {step === 1 ? 'Nuovo Obiettivo' : 'Key Results'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-slate-300 dark:text-slate-600" disabled={isSubmitting}>
            {ICONS.Error}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titolo Obiettivo *</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="es. Aumentare la brand awareness"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Descrivi l'obiettivo in dettaglio..."
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Livello</label>
                   <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pl-4 pr-12 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value as OKRLevel, parentObjectiveId: ''})}
                      disabled={isSubmitting}
                   >
                     <option value="company">Azienda</option>
                     <option value="team">Team</option>
                     <option value="individual">Individuale</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Periodo</label>
                   <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pl-4 pr-12 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    OKR Parent *
                    <span className="font-normal text-slate-500 dark:text-slate-400 ml-1">
                      ({formData.level === 'team' ? 'Azienda' : 'Team'})
                    </span>
                  </label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-12 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                      value={formData.parentObjectiveId}
                      onChange={e => setFormData({...formData, parentObjectiveId: e.target.value})}
                      disabled={isSubmitting || isLoadingParents}
                      required
                    >
                      <option value="">Seleziona OKR parent...</option>
                      {isLoadingParents ? (
                        <option disabled>Caricamento...</option>
                      ) : (
                        availableParents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            [{parent.level === 'company' ? 'Azienda' : 'Team'}] {parent.title} ({parent.period})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {availableParents.length === 0 && !isLoadingParents && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {formData.level === 'team'
                        ? 'Devi prima creare un OKR di livello Azienda per poter creare OKR di Team'
                        : 'Devi prima creare un OKR di livello Team per poter creare OKR Individuali'}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assegnato a *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-12 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
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
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Scadenza</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Key Results</h3>
                 <button
                   type="button"
                   onClick={handleAddKR}
                   className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                   disabled={isSubmitting}
                 >
                   {ICONS.Plus} Aggiungi KR
                 </button>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Definisci i risultati chiave misurabili per questo obiettivo
              </p>

              {formData.keyResults.map((kr, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl space-y-3 relative">
                   <div className="flex items-start gap-2">
                     <div className="flex-1">
                       <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrizione *</label>
                       <input
                         type="text"
                         placeholder="es. Generare 50 nuovi lead qualificati"
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                         value={kr.description}
                         onChange={e => handleKRChange(idx, 'description', e.target.value)}
                         disabled={isSubmitting}
                       />
                     </div>
                     {formData.keyResults.length > 1 && (
                       <button
                         type="button"
                         onClick={() => handleRemoveKR(idx)}
                         className="mt-6 p-2 text-gray-400 hover:text-red-500 transition-colors"
                         disabled={isSubmitting}
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo Metrica</label>
                       <select
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 pl-3 pr-10 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-[length:14px_14px] bg-[position:right_12px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
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
                       <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Unità (opzionale)</label>
                       <input
                         type="text"
                         placeholder="es. leads, €, utenti"
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                         value={kr.unit}
                         onChange={e => handleKRChange(idx, 'unit', e.target.value)}
                         disabled={isSubmitting}
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-3 gap-3">
                     <div>
                       <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valore Iniziale</label>
                       <input
                         type="number"
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                         value={kr.startValue}
                         onChange={e => handleKRChange(idx, 'startValue', e.target.value)}
                         disabled={isSubmitting}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valore Attuale</label>
                       <input
                         type="number"
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                         value={kr.currentValue}
                         onChange={e => handleKRChange(idx, 'currentValue', e.target.value)}
                         disabled={isSubmitting}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valore Target *</label>
                       <input
                         type="number"
                         className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                         value={kr.targetValue}
                         onChange={e => handleKRChange(idx, 'targetValue', e.target.value)}
                         disabled={isSubmitting}
                       />
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
             {step === 2 && (
               <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
                 Indietro
               </Button>
             )}
             {step === 1 ? (
               <Button type="button" onClick={() => setStep(2)}>
                 Avanti
               </Button>
             ) : (
               <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting ? (
                   <span className="flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin" />
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
