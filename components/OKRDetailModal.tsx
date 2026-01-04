import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './UIComponents';
import { okrAPI, Objective, KeyResult, UserBasic } from '../api/client';
import {
  Loader2, AlertCircle, X, Edit2, Save, Trash2,
  Target, Calendar, User, TrendingUp, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { STATUS_COLORS } from '../constants';

interface OKRDetailModalProps {
  isOpen: boolean;
  objectiveId: string | null;
  onClose: () => void;
  onUpdate: () => void; // Called after update to refresh list
  onDelete: () => void; // Called after delete
}

const OKRDetailModal: React.FC<OKRDetailModalProps> = ({
  isOpen,
  objectiveId,
  onClose,
  onUpdate,
  onDelete
}) => {
  const { user: currentUser } = useAuth();
  const [objective, setObjective] = useState<Objective | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedKR, setExpandedKR] = useState<string | null>(null);
  const [users, setUsers] = useState<UserBasic[]>([]);
  const isMounted = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setObjective(null);
      setIsLoading(false);
      setError(null);
      setIsEditing(false);
      setIsSaving(false);
      setExpandedKR(null);
      setKrUpdates({});
      setIsAddingKR(false);
      setNewKR({
        description: '',
        metricType: 'number',
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
        unit: ''
      });
    }
  }, [isOpen]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    level: 'team' as 'company' | 'department' | 'team' | 'individual',
    period: '',
    dueDate: '',
    ownerId: '',
    status: 'draft' as 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'draft'
  });

  // KR update state
  const [krUpdates, setKrUpdates] = useState<Record<string, number>>({});

  // New KR form state
  const [isAddingKR, setIsAddingKR] = useState(false);
  const [newKR, setNewKR] = useState({
    description: '',
    metricType: 'number' as 'percentage' | 'number' | 'currency' | 'boolean',
    startValue: 0,
    targetValue: 100,
    currentValue: 0,
    unit: ''
  });

  useEffect(() => {
    if (isOpen && objectiveId) {
      loadObjective();
      loadUsers();
    }
  }, [isOpen, objectiveId]);

  const loadObjective = async () => {
    if (!objectiveId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await okrAPI.getObjective(objectiveId);
      if (!isMounted.current) return;

      setObjective(data);
      setEditForm({
        title: data.title,
        description: data.description || '',
        level: data.level,
        period: data.period,
        dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
        ownerId: data.ownerId,
        status: data.status
      });
      // Initialize KR values
      const updates: Record<string, number> = {};
      data.keyResults.forEach(kr => {
        updates[kr.id] = kr.currentValue;
      });
      setKrUpdates(updates);
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const loadUsers = async () => {
    try {
      const userList = await okrAPI.getUsers();
      if (isMounted.current) {
        setUsers(userList);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleSaveObjective = async () => {
    if (!objectiveId || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.updateObjective(objectiveId, {
        title: editForm.title,
        description: editForm.description || undefined,
        level: editForm.level,
        period: editForm.period,
        dueDate: editForm.dueDate || undefined,
        status: editForm.status
      });
      if (isMounted.current) {
        setIsEditing(false);
        await loadObjective();
      }
      onUpdate();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleUpdateKR = async (krId: string) => {
    const newValue = krUpdates[krId];
    if (newValue === undefined || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.updateKeyResult(krId, { currentValue: newValue });
      if (isMounted.current) {
        await loadObjective();
      }
      onUpdate();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleAddKR = async () => {
    if (!objectiveId || isSaving || !newKR.description.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.addKeyResult(objectiveId, {
        description: newKR.description,
        metricType: newKR.metricType,
        startValue: newKR.startValue,
        targetValue: newKR.targetValue,
        currentValue: newKR.currentValue || newKR.startValue,
        unit: newKR.unit
      });
      if (isMounted.current) {
        setIsAddingKR(false);
        setNewKR({
          description: '',
          metricType: 'number',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
          unit: ''
        });
        await loadObjective();
      }
      onUpdate();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta del Key Result');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteObjective = async () => {
    if (!objectiveId || isSaving) return;

    if (!window.confirm('Sei sicuro di voler eliminare questo obiettivo? Questa azione non può essere annullata.')) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.deleteObjective(objectiveId);
      // Only update state if still mounted
      if (isMounted.current) {
        setIsSaving(false);
      }
      onDelete();
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione');
        setIsSaving(false);
      }
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError(null);
    setExpandedKR(null);
    onClose();
  };

  if (!isOpen) return null;

  const levelLabels: Record<string, string> = {
    company: 'Azienda',
    department: 'Dipartimento',
    team: 'Team',
    individual: 'Individuale'
  };

  const statusLabels: Record<string, string> = {
    draft: 'Bozza',
    'on-track': 'In linea',
    'at-risk': 'A rischio',
    'off-track': 'Fuori strada',
    completed: 'Completato'
  };

  const calculateKRProgress = (kr: KeyResult) => {
    const range = kr.targetValue - kr.startValue;
    if (range === 0) return kr.currentValue >= kr.targetValue ? 100 : 0;
    return Math.min(Math.max(((kr.currentValue - kr.startValue) / range) * 100, 0), 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Modifica Obiettivo' : 'Dettaglio Obiettivo'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && objective && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Modifica"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDeleteObjective}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Elimina"
                  disabled={isSaving}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : objective ? (
            <div className="space-y-6">
              {/* Objective Details */}
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editForm.title}
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                    <textarea
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      rows={3}
                      value={editForm.description}
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Livello</label>
                      <select
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                        value={editForm.level}
                        onChange={e => setEditForm({...editForm, level: e.target.value as typeof editForm.level})}
                        disabled={isSaving}
                      >
                        <option value="company">Azienda</option>
                        <option value="department">Dipartimento</option>
                        <option value="team">Team</option>
                        <option value="individual">Individuale</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                      <select
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                        value={editForm.status}
                        onChange={e => setEditForm({...editForm, status: e.target.value as typeof editForm.status})}
                        disabled={isSaving}
                      >
                        <option value="draft">Bozza</option>
                        <option value="on-track">In linea</option>
                        <option value="at-risk">A rischio</option>
                        <option value="off-track">Fuori strada</option>
                        <option value="completed">Completato</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                      <select
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                        value={editForm.period}
                        onChange={e => setEditForm({...editForm, period: e.target.value})}
                        disabled={isSaving}
                      >
                        <option value="Q1 2026">Q1 2026</option>
                        <option value="Q2 2026">Q2 2026</option>
                        <option value="Q3 2026">Q3 2026</option>
                        <option value="Q4 2026">Q4 2026</option>
                        <option value="Annual 2026">Annuale 2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
                      <input
                        type="date"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none"
                        value={editForm.dueDate}
                        onChange={e => setEditForm({...editForm, dueDate: e.target.value})}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      Annulla
                    </Button>
                    <Button onClick={handleSaveObjective} disabled={isSaving}>
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvataggio...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          Salva
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{objective.title}</h3>
                    {objective.description && (
                      <p className="text-gray-500 mt-2">{objective.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Target className="w-4 h-4" />
                      <span>{levelLabels[objective.level] || objective.level}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{objective.period}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <User className="w-4 h-4" />
                      <span>{objective.ownerName || 'Non assegnato'}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[objective.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[objective.status] || objective.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progresso Complessivo</span>
                      <span className="text-lg font-bold text-gray-900">{objective.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${objective.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Key Results Section */}
              {!isEditing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Key Results
                    </h4>
                    {!isAddingKR && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAddingKR(true)}
                        disabled={isSaving}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Aggiungi KR
                      </Button>
                    )}
                  </div>

                  {/* Add New KR Form */}
                  {isAddingKR && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-4">
                      <h5 className="font-medium text-gray-900">Nuovo Key Result</h5>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descrizione *
                        </label>
                        <input
                          type="text"
                          placeholder="Es: Aumentare il fatturato mensile"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={newKR.description}
                          onChange={e => setNewKR({...newKR, description: e.target.value})}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo Metrica
                          </label>
                          <select
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 outline-none"
                            value={newKR.metricType}
                            onChange={e => setNewKR({...newKR, metricType: e.target.value as typeof newKR.metricType})}
                            disabled={isSaving}
                          >
                            <option value="number">Numero</option>
                            <option value="percentage">Percentuale</option>
                            <option value="currency">Valuta</option>
                            <option value="boolean">Sì/No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unità di misura
                          </label>
                          <input
                            type="text"
                            placeholder="Es: €, %, unità"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newKR.unit}
                            onChange={e => setNewKR({...newKR, unit: e.target.value})}
                            disabled={isSaving}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valore Iniziale
                          </label>
                          <input
                            type="number"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newKR.startValue}
                            onChange={e => setNewKR({...newKR, startValue: parseFloat(e.target.value) || 0})}
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valore Target *
                          </label>
                          <input
                            type="number"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newKR.targetValue}
                            onChange={e => setNewKR({...newKR, targetValue: parseFloat(e.target.value) || 0})}
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valore Attuale
                          </label>
                          <input
                            type="number"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newKR.currentValue}
                            onChange={e => setNewKR({...newKR, currentValue: parseFloat(e.target.value) || 0})}
                            disabled={isSaving}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsAddingKR(false);
                            setNewKR({
                              description: '',
                              metricType: 'number',
                              startValue: 0,
                              targetValue: 100,
                              currentValue: 0,
                              unit: ''
                            });
                          }}
                          disabled={isSaving}
                        >
                          Annulla
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddKR}
                          disabled={isSaving || !newKR.description.trim()}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Aggiungi
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {objective.keyResults.length === 0 && !isAddingKR ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl">
                      <p className="text-gray-400 mb-3">Nessun Key Result definito</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAddingKR(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Aggiungi il primo Key Result
                      </Button>
                    </div>
                  ) : objective.keyResults.length > 0 ? (
                    <div className="space-y-3">
                      {objective.keyResults.map((kr) => {
                        const progress = calculateKRProgress(kr);
                        const isExpanded = expandedKR === kr.id;

                        return (
                          <div key={kr.id} className="bg-gray-50 rounded-2xl overflow-hidden">
                            <button
                              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                              onClick={() => setExpandedKR(isExpanded ? null : kr.id)}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{kr.description}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        progress >= 100 ? 'bg-green-500' :
                                        progress >= 70 ? 'bg-blue-500' :
                                        progress >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600 whitespace-nowrap">
                                    {kr.currentValue} / {kr.targetValue} {kr.unit}
                                  </span>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Valore Iniziale</span>
                                    <p className="font-medium">{kr.startValue} {kr.unit}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Valore Target</span>
                                    <p className="font-medium">{kr.targetValue} {kr.unit}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Tipo Metrica</span>
                                    <p className="font-medium capitalize">{kr.metricType}</p>
                                  </div>
                                </div>

                                <div className="flex items-end gap-3">
                                  <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Aggiorna Valore Attuale
                                    </label>
                                    <input
                                      type="number"
                                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={krUpdates[kr.id] ?? kr.currentValue}
                                      onChange={e => setKrUpdates({
                                        ...krUpdates,
                                        [kr.id]: parseFloat(e.target.value) || 0
                                      })}
                                      disabled={isSaving}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleUpdateKR(kr.id)}
                                    disabled={isSaving || krUpdates[kr.id] === kr.currentValue}
                                  >
                                    {isSaving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      'Aggiorna'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Obiettivo non trovato
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OKRDetailModal;
