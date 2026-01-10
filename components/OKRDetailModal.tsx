import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './UIComponents';
import { okrAPI, Objective, KeyResult, UserBasic, ApprovalHistoryItem, Contributor } from '../api/client';
import {
  Loader2, AlertCircle, X, Edit2, Save, Trash2,
  Target, Calendar, User, TrendingUp, ChevronDown, ChevronUp, Plus,
  GitBranch, ChevronRight, ExternalLink, Send, CheckCircle, XCircle, Play, Clock, History,
  Users, UserPlus, UserMinus, Search, Pause, Square, Archive, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { STATUS_COLORS } from '../constants';

// Allowed OKR levels based on user role
type OKRLevel = 'company' | 'team' | 'individual';
const ALLOWED_LEVELS: Record<string, OKRLevel[]> = {
  admin: ['company', 'team', 'individual'],
  lead: ['team', 'individual'],
  user: ['individual']
};

const LEVEL_LABELS: Record<OKRLevel, string> = {
  company: 'Azienda',
  team: 'Team',
  individual: 'Individuale'
};

interface OKRDetailModalProps {
  isOpen: boolean;
  objectiveId: string | null;
  onClose: () => void;
  onUpdate: () => void; // Called after update to refresh list
  onDelete: () => void; // Called after delete
  onSelectOKR?: (id: string) => void; // Navigate to child/parent OKR
}

const OKRDetailModal: React.FC<OKRDetailModalProps> = ({
  isOpen,
  objectiveId,
  onClose,
  onUpdate,
  onDelete,
  onSelectOKR
}) => {
  const { user: currentUser } = useAuth();
  const [objective, setObjective] = useState<Objective | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedKR, setExpandedKR] = useState<string | null>(null);
  const [users, setUsers] = useState<UserBasic[]>([]);
  const [childrenOKRs, setChildrenOKRs] = useState<Objective[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [isLoadingApproval, setIsLoadingApproval] = useState(false);
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteKRModal, setShowDeleteKRModal] = useState<string | null>(null);
  const [editingKR, setEditingKR] = useState<string | null>(null);
  const [editKRForm, setEditKRForm] = useState({ description: '', metricType: 'number' as string, targetValue: 0, startValue: 0, unit: '' });
  const [showRemoveContributorModal, setShowRemoveContributorModal] = useState<string | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoadingContributors, setIsLoadingContributors] = useState(false);
  const [showAddContributor, setShowAddContributor] = useState(false);
  const [contributorSearch, setContributorSearch] = useState('');
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
      setChildrenOKRs([]);
      setApprovalHistory([]);
      setShowApprovalHistory(false);
      setRejectComment('');
      setShowRejectModal(false);
      setShowDeleteModal(false);
      setShowDeleteKRModal(null);
      setEditingKR(null);
      setEditKRForm({ description: '', metricType: 'number', targetValue: 0, startValue: 0, unit: '' });
      setShowRemoveContributorModal(null);
      setContributors([]);
      setShowAddContributor(false);
      setContributorSearch('');
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
      loadChildren();
      loadContributors();
    }
  }, [isOpen, objectiveId]);

  const loadChildren = async () => {
    if (!objectiveId) return;
    setIsLoadingChildren(true);
    try {
      const children = await okrAPI.getObjectiveChildren(objectiveId);
      if (isMounted.current) {
        setChildrenOKRs(children);
      }
    } catch (err) {
      console.error('Failed to load children:', err);
    } finally {
      if (isMounted.current) {
        setIsLoadingChildren(false);
      }
    }
  };

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

  const loadApprovalHistory = async () => {
    if (!objectiveId) return;
    setIsLoadingApproval(true);
    try {
      const history = await okrAPI.getApprovalHistory(objectiveId);
      if (isMounted.current) {
        setApprovalHistory(history);
      }
    } catch (err) {
      console.error('Failed to load approval history:', err);
    } finally {
      if (isMounted.current) {
        setIsLoadingApproval(false);
      }
    }
  };

  const handleSubmitForReview = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.submitForReview(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      // Dispatch event to refresh notifications for approvers
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'invio per approvazione');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleApprove = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.approveObjective(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      // Dispatch event to refresh notifications
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'approvazione');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleReject = async () => {
    if (!objectiveId || isSaving || !rejectComment.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.rejectObjective(objectiveId, rejectComment);
      if (isMounted.current) {
        setShowRejectModal(false);
        setRejectComment('');
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nel rifiuto');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleActivate = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.activateObjective(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'attivazione');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handlePause = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.pauseObjective(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nella pausa');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleResume = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.resumeObjective(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nel ripristino');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleStop = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.stopObjective(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'arresto');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleReopen = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.reopenObjective(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nella riapertura');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleArchive = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.archiveObjective(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'archiviazione');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleRevertToDraft = async () => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.revertToDraft(objectiveId);
      if (isMounted.current) {
        await loadObjective();
        await loadApprovalHistory();
      }
      onUpdate();
      window.dispatchEvent(new CustomEvent('okr-updated'));
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nel ripristino a bozza');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const loadContributors = async () => {
    if (!objectiveId) return;
    setIsLoadingContributors(true);
    try {
      const contribs = await okrAPI.getContributors(objectiveId);
      if (isMounted.current) {
        setContributors(contribs);
      }
    } catch (err) {
      console.error('Failed to load contributors:', err);
    } finally {
      if (isMounted.current) {
        setIsLoadingContributors(false);
      }
    }
  };

  const handleAddContributor = async (userId: string) => {
    if (!objectiveId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.addContributor(objectiveId, userId);
      if (isMounted.current) {
        await loadContributors();
        setShowAddContributor(false);
        setContributorSearch('');
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta del contributore');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleRemoveContributor = (contributorId: string) => {
    if (!objectiveId || isSaving) return;
    setShowRemoveContributorModal(contributorId);
  };

  const confirmRemoveContributor = async () => {
    if (!objectiveId || !showRemoveContributorModal || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.removeContributor(objectiveId, showRemoveContributorModal);
      if (isMounted.current) {
        setShowRemoveContributorModal(null);
        await loadContributors();
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nella rimozione del contributore');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  // Filter users for contributor search (exclude owner and existing contributors)
  const filteredUsers = users.filter(u => {
    if (objective && u.id === objective.ownerId) return false;
    if (contributors.some(c => c.userId === u.id)) return false;
    if (!contributorSearch) return true;
    const search = contributorSearch.toLowerCase();
    return u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search);
  });

  const handleSaveObjective = async () => {
    if (!objectiveId || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      const updateData = {
        title: editForm.title,
        description: editForm.description || undefined,
        level: editForm.level,
        period: editForm.period,
        dueDate: editForm.dueDate || undefined,
        ownerId: editForm.ownerId
      };
      await okrAPI.updateObjective(objectiveId, updateData);
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

  const handleDeleteKR = (krId: string) => {
    if (isSaving) return;
    setShowDeleteKRModal(krId);
  };

  const confirmDeleteKR = async () => {
    if (!showDeleteKRModal || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.deleteKeyResult(showDeleteKRModal);
      if (isMounted.current) {
        setShowDeleteKRModal(null);
        await loadObjective();
      }
      onUpdate();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione del Key Result');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleStartEditKR = (kr: KeyResult) => {
    setEditingKR(kr.id);
    setEditKRForm({
      description: kr.description,
      metricType: kr.metricType,
      targetValue: kr.targetValue,
      startValue: kr.startValue,
      unit: kr.unit
    });
  };

  const handleCancelEditKR = () => {
    setEditingKR(null);
    setEditKRForm({ description: '', metricType: 'number', targetValue: 0, startValue: 0, unit: '' });
  };

  const handleSaveEditKR = async () => {
    if (!editingKR || isSaving || !editKRForm.description.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.updateKeyResult(editingKR, {
        description: editKRForm.description,
        metricType: editKRForm.metricType,
        targetValue: editKRForm.targetValue,
        startValue: editKRForm.startValue,
        unit: editKRForm.unit
      });
      if (isMounted.current) {
        setEditingKR(null);
        setEditKRForm({ description: '', metricType: 'number', targetValue: 0, startValue: 0, unit: '' });
        await loadObjective();
      }
      onUpdate();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Errore nella modifica del Key Result');
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

  const handleDeleteObjective = () => {
    if (!objectiveId || isSaving) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteObjective = async () => {
    if (!objectiveId || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await okrAPI.deleteObjective(objectiveId);
      // Only update state if still mounted
      if (isMounted.current) {
        setIsSaving(false);
        setShowDeleteModal(false);
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

  // statusLabels ora usa i valori di approvalStatus per uniformità
  const statusLabels: Record<string, string> = {
    draft: 'Bozza',
    pending_review: 'In revisione',
    approved: 'Approvato',
    active: 'Attivo',
    paused: 'In pausa',
    stopped: 'Fermato',
    archived: 'Archiviato'
  };

  const approvalStatusLabels: Record<string, string> = {
    draft: 'Bozza',
    pending_review: 'In revisione',
    approved: 'Approvato',
    active: 'Attivo',
    paused: 'In pausa',
    stopped: 'Fermato',
    archived: 'Archiviato'
  };

  const approvalStatusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    stopped: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  };

  const approvalActionLabels: Record<string, string> = {
    submitted: 'Inviato per revisione',
    approved: 'Approvato',
    rejected: 'Rifiutato',
    activated: 'Attivato',
    paused: 'Messo in pausa',
    resumed: 'Ripreso',
    stopped: 'Fermato',
    archived: 'Archiviato',
    reverted_to_draft: 'Rimesso in bozza'
  };

  const isOwner = currentUser?.id === objective?.ownerId;
  const isAdmin = currentUser?.role === 'admin';
  const isContributor = contributors.some(c => c.userId === currentUser?.id);
  // Contributors have the same permissions as the owner (except delete)
  const hasPermission = isOwner || isAdmin || isContributor;

  // OKR is only editable in draft state
  const isLocked = objective ? objective.approvalStatus !== 'draft' : false;
  const isEditable = hasPermission && !isLocked;
  // Only owner/admin can delete (not contributors). Only draft or archived can be deleted.
  const isArchived = objective?.approvalStatus === 'archived';
  const isDraft = objective?.approvalStatus === 'draft';
  const canDelete = (isOwner || isAdmin) && (isDraft || isArchived);
  // Can update KR currentValue only when active (not paused/stopped/archived)
  const valueUpdateStates = ['active'];
  const canUpdateValue = hasPermission && objective ? valueUpdateStates.includes(objective.approvalStatus || '') : false;

  const calculateKRProgress = (kr: KeyResult) => {
    const range = kr.targetValue - kr.startValue;
    if (range === 0) return kr.currentValue >= kr.targetValue ? 100 : 0;
    return Math.min(Math.max(((kr.currentValue - kr.startValue) / range) * 100, 0), 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl dark:shadow-none dark:ring-1 dark:ring-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">
            {isEditing ? 'Modifica Obiettivo' : 'Dettaglio Obiettivo'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && objective && isEditable && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 transition-colors"
                title="Modifica"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            {!isEditing && objective && canDelete && (
              <button
                onClick={handleDeleteObjective}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 transition-colors"
                title="Elimina"
                disabled={isSaving}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm mb-4">
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titolo *</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editForm.title}
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione</label>
                    <textarea
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      rows={3}
                      value={editForm.description}
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Owner selection - Admin can always change, Lead can change for individual OKRs */}
                  {(currentUser?.role === 'admin' || (currentUser?.role === 'lead' && editForm.level === 'individual')) && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assegnato a</label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 pl-4 pr-10 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                        value={editForm.ownerId}
                        onChange={e => setEditForm({...editForm, ownerId: e.target.value})}
                        disabled={isSaving}
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} {u.id === currentUser?.id ? '(tu)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Livello</label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 pl-4 pr-12 py-2.5 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                        value={editForm.level}
                        onChange={e => setEditForm({...editForm, level: e.target.value as typeof editForm.level})}
                        disabled={isSaving}
                      >
                        {(ALLOWED_LEVELS[currentUser?.role || 'user'] || ALLOWED_LEVELS.user).map(level => (
                          <option key={level} value={level}>{LEVEL_LABELS[level]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stato Approvazione</label>
                      <div className={`w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 px-4 py-2.5`}>
                        {statusLabels[objective?.approvalStatus || 'draft'] || 'Bozza'}
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">(gestito dal workflow)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Periodo</label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 pl-4 pr-12 py-2.5 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Scadenza</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none"
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
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{objective.title}</h3>
                    {objective.description && (
                      <p className="text-slate-500 dark:text-slate-400 mt-2">{objective.description}</p>
                    )}
                  </div>

                  {/* Parent KR Breadcrumb */}
                  {objective.parentKeyResultId && objective.parentKeyResultDescription && (
                    <div className="flex flex-col gap-1 text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl mb-2">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-slate-600 dark:text-slate-400">Collegato al Key Result:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{objective.parentKeyResultDescription}</span>
                      </div>
                      {objective.parentObjectiveTitle && (
                        <div className="flex items-center gap-2 ml-6">
                          <span className="text-slate-500 dark:text-slate-400 text-xs">dell'OKR:</span>
                          {onSelectOKR ? (
                            <button
                              onClick={() => onSelectOKR(objective.parentObjectiveId!)}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1 text-xs"
                            >
                              {objective.parentObjectiveTitle}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{objective.parentObjectiveTitle}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Target className="w-4 h-4" />
                      <span>{levelLabels[objective.level] || objective.level}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>{objective.period}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <User className="w-4 h-4" />
                      <span>{objective.ownerName || 'Non assegnato'}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[objective.approvalStatus || 'draft'] || 'bg-gray-100 text-slate-600 dark:text-slate-400'}`}>
                      {statusLabels[objective.approvalStatus || 'draft'] || objective.approvalStatus}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progresso Complessivo</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{objective.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${objective.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Approval Workflow Section */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Stato Approvazione:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${approvalStatusColors[objective.approvalStatus || 'draft']}`}>
                          {approvalStatusLabels[objective.approvalStatus || 'draft']}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setShowApprovalHistory(!showApprovalHistory);
                          if (!showApprovalHistory && approvalHistory.length === 0) {
                            loadApprovalHistory();
                          }
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <History className="w-4 h-4" />
                        Storico
                      </button>
                    </div>

                    {/* Approval info */}
                    {objective.approvalStatus === 'approved' && objective.approvedByName && (
                      <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Approvato da <span className="font-medium text-slate-900 dark:text-slate-100">{objective.approvedByName}</span>
                        {objective.approvedAt && (
                          <span className="text-slate-400">
                            il {new Date(objective.approvedAt).toLocaleDateString('it-IT')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Approval Actions */}
                    <div className="flex flex-wrap gap-2">
                      {/* Owner can submit for review if draft */}
                      {isOwner && objective.approvalStatus === 'draft' && (
                        <Button
                          size="sm"
                          onClick={handleSubmitForReview}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                          Invia per Approvazione
                        </Button>
                      )}

                      {/* Admin can approve/reject if pending_review */}
                      {isAdmin && objective.approvalStatus === 'pending_review' && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleApprove}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                            Approva
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowRejectModal(true)}
                            disabled={isSaving}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rifiuta
                          </Button>
                        </>
                      )}

                      {/* Only Admin can activate if approved */}
                      {objective.approvalStatus === 'approved' && (
                        <>
                          {isAdmin && (
                            <Button
                              size="sm"
                              onClick={handleActivate}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                              Attiva
                            </Button>
                          )}
                          {hasPermission && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={handleRevertToDraft}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                              Modifica
                            </Button>
                          )}
                        </>
                      )}


                      {/* Only Admin can pause/stop if active */}
                      {isAdmin && objective.approvalStatus === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handlePause}
                            disabled={isSaving}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/30"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4 mr-1" />}
                            Pausa
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleStop}
                            disabled={isSaving}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 mr-1" />}
                            Ferma
                          </Button>
                        </>
                      )}

                      {/* Only Admin can resume/stop if paused */}
                      {isAdmin && objective.approvalStatus === 'paused' && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleResume}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                            Riprendi
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleStop}
                            disabled={isSaving}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 mr-1" />}
                            Ferma
                          </Button>
                        </>
                      )}

                      {/* Owner/Admin/Contributor can archive if stopped */}
                      {hasPermission && objective.approvalStatus === 'stopped' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleArchive}
                          disabled={isSaving}
                          className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4 mr-1" />}
                          Archivia
                        </Button>
                      )}

                      {/* Only Admin can reopen closed or failed objectives */}
                      {isAdmin && (objective.approvalStatus === 'closed' || objective.approvalStatus === 'failed') && (
                        <Button
                          size="sm"
                          onClick={handleReopen}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                          Riapri
                        </Button>
                      )}

                      {/* Status info for pending */}
                      {objective.approvalStatus === 'pending_review' && !isAdmin && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                          <Clock className="w-4 h-4" />
                          In attesa di approvazione da parte di un amministratore
                        </div>
                      )}
                    </div>

                    {/* Approval History */}
                    {showApprovalHistory && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <History className="w-4 h-4" />
                          Storico Approvazioni
                        </h5>
                        {isLoadingApproval ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          </div>
                        ) : approvalHistory.length === 0 ? (
                          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                            Nessuna attività registrata
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {approvalHistory.map((item) => (
                              <div key={item.id} className="flex items-start gap-3 text-sm">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                  item.action === 'approved' ? 'bg-green-500' :
                                  item.action === 'rejected' ? 'bg-red-500' :
                                  item.action === 'activated' || item.action === 'resumed' ? 'bg-blue-500' :
                                  item.action === 'paused' ? 'bg-orange-500' :
                                  item.action === 'stopped' ? 'bg-red-500' :
                                  item.action === 'archived' ? 'bg-gray-500' :
                                  'bg-amber-500'
                                }`} />
                                <div className="flex-1">
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{item.performedByName}</span>
                                  <span className="text-slate-500 dark:text-slate-400"> {approvalActionLabels[item.action] || item.action}</span>
                                  {item.comment && (
                                    <p className="text-slate-500 dark:text-slate-400 italic mt-0.5">"{item.comment}"</p>
                                  )}
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                    {new Date(item.createdAt).toLocaleString('it-IT')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reject Modal */}
              {showRejectModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                      Rifiuta Obiettivo
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Indica il motivo del rifiuto. L'obiettivo tornerà in stato bozza e il proprietario potrà modificarlo.
                    </p>
                    <textarea
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      rows={3}
                      placeholder="Motivo del rifiuto..."
                      value={rejectComment}
                      onChange={e => setRejectComment(e.target.value)}
                      disabled={isSaving}
                    />
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="ghost" onClick={() => setShowRejectModal(false)} disabled={isSaving}>
                        Annulla
                      </Button>
                      <Button
                        onClick={handleReject}
                        disabled={isSaving || !rejectComment.trim()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rifiuta'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Objective Confirmation Modal */}
              {showDeleteModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Elimina Obiettivo
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                      Sei sicuro di voler eliminare questo obiettivo? Questa azione non può essere annullata e tutti i Key Results associati verranno eliminati.
                    </p>
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={isSaving}>
                        Annulla
                      </Button>
                      <Button
                        onClick={confirmDeleteObjective}
                        disabled={isSaving}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isSaving ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Eliminazione...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            Elimina
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Key Result Confirmation Modal */}
              {showDeleteKRModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Elimina Key Result
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                      Sei sicuro di voler eliminare questo Key Result? Questa azione non può essere annullata.
                    </p>
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setShowDeleteKRModal(null)} disabled={isSaving}>
                        Annulla
                      </Button>
                      <Button
                        onClick={confirmDeleteKR}
                        disabled={isSaving}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isSaving ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Eliminazione...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            Elimina
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Remove Contributor Confirmation Modal */}
              {showRemoveContributorModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <UserMinus className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Rimuovi Contributore
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                      Sei sicuro di voler rimuovere questo contributore dall'obiettivo?
                    </p>
                    <div className="flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setShowRemoveContributorModal(null)} disabled={isSaving}>
                        Annulla
                      </Button>
                      <Button
                        onClick={confirmRemoveContributor}
                        disabled={isSaving}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isSaving ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Rimozione...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <UserMinus className="w-4 h-4" />
                            Rimuovi
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Results Section */}
              {!isEditing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Key Results
                    </h4>
                    {!isAddingKR && isEditable && (
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
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 space-y-4">
                      <h5 className="font-medium text-slate-900 dark:text-slate-100">Nuovo Key Result</h5>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Descrizione *
                        </label>
                        <input
                          type="text"
                          placeholder="Es: Aumentare il fatturato mensile"
                          className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={newKR.description}
                          onChange={e => setNewKR({...newKR, description: e.target.value})}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tipo Metrica
                          </label>
                          <select
                            className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 pl-4 pr-12 py-2 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                            value={newKR.metricType}
                            onChange={e => {
                              const newType = e.target.value as typeof newKR.metricType;
                              if (newType === 'boolean') {
                                setNewKR({...newKR, metricType: newType, startValue: 0, targetValue: 1, currentValue: 0, unit: ''});
                              } else {
                                setNewKR({...newKR, metricType: newType});
                              }
                            }}
                            disabled={isSaving}
                          >
                            <option value="number">Numero</option>
                            <option value="percentage">Percentuale</option>
                            <option value="currency">Valuta</option>
                            <option value="boolean">Sì/No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Unità di misura
                          </label>
                          <input
                            type="text"
                            placeholder={newKR.metricType === 'boolean' ? '-' : 'Es: €, %, unità'}
                            className={`w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none ${newKR.metricType === 'boolean' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={newKR.metricType === 'boolean' ? '' : newKR.unit}
                            onChange={e => setNewKR({...newKR, unit: e.target.value})}
                            disabled={isSaving || newKR.metricType === 'boolean'}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Valore Iniziale
                          </label>
                          {newKR.metricType === 'boolean' ? (
                            <div className="w-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-700 dark:text-slate-300 px-4 py-2">
                              No
                            </div>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={newKR.startValue}
                              onChange={e => setNewKR({...newKR, startValue: parseFloat(e.target.value.replace(/^0+(?=\d)/, '')) || 0})}
                              disabled={isSaving}
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Valore Target *
                          </label>
                          {newKR.metricType === 'boolean' ? (
                            <div className="w-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-700 dark:text-slate-300 px-4 py-2">
                              Sì
                            </div>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={newKR.targetValue}
                              onChange={e => setNewKR({...newKR, targetValue: parseFloat(e.target.value.replace(/^0+(?=\d)/, '')) || 0})}
                              disabled={isSaving}
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Valore Attuale
                          </label>
                          {newKR.metricType === 'boolean' ? (
                            <select
                              className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={newKR.currentValue}
                              onChange={e => setNewKR({...newKR, currentValue: parseFloat(e.target.value) || 0})}
                              disabled={isSaving}
                            >
                              <option value={0}>No</option>
                              <option value={1}>Sì</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                              value={newKR.currentValue}
                              onChange={e => setNewKR({...newKR, currentValue: parseFloat(e.target.value.replace(/^0+(?=\d)/, '')) || 0})}
                              disabled={isSaving}
                            />
                          )}
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
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                      <p className="text-slate-400 dark:text-slate-500 mb-3">Nessun Key Result definito</p>
                      {isEditable && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAddingKR(true)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Aggiungi il primo Key Result
                        </Button>
                      )}
                    </div>
                  ) : objective.keyResults.length > 0 ? (
                    <div className="space-y-3">
                      {objective.keyResults.map((kr) => {
                        const progress = calculateKRProgress(kr);
                        const isExpanded = expandedKR === kr.id;

                        return (
                          <div key={kr.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl overflow-hidden">
                            <button
                              className="group w-full p-4 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-600/80 transition-colors"
                              onClick={() => setExpandedKR(isExpanded ? null : kr.id)}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-slate-100">{kr.description}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex-1 max-w-xs bg-slate-200 dark:bg-slate-500/50 group-hover:bg-slate-300 dark:group-hover:bg-slate-500/70 rounded-full h-2 transition-colors">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        progress >= 100 ? 'bg-green-500' :
                                        progress >= 70 ? 'bg-blue-500' :
                                        progress >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                    {kr.metricType === 'boolean'
                                      ? (kr.currentValue === 1 ? 'Sì' : 'No')
                                      : `${kr.currentValue} / ${kr.targetValue} ${kr.unit || ''}`}
                                  </span>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-600 pt-4">
                                {editingKR === kr.id ? (
                                  /* Edit KR Form */
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editKRForm.description}
                                        onChange={e => setEditKRForm({...editKRForm, description: e.target.value})}
                                        disabled={isSaving}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo Metrica</label>
                                        <select
                                          className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 pl-4 pr-12 py-2 outline-none appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]"
                                          value={editKRForm.metricType}
                                          onChange={e => {
                                            const newType = e.target.value;
                                            if (newType === 'boolean') {
                                              setEditKRForm({...editKRForm, metricType: newType, startValue: 0, targetValue: 1, unit: ''});
                                            } else {
                                              setEditKRForm({...editKRForm, metricType: newType});
                                            }
                                          }}
                                          disabled={isSaving}
                                        >
                                          <option value="number">Numero</option>
                                          <option value="percentage">Percentuale</option>
                                          <option value="currency">Valuta</option>
                                          <option value="boolean">Sì/No</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unità</label>
                                        <input
                                          type="text"
                                          placeholder={editKRForm.metricType === 'boolean' ? '-' : ''}
                                          className={`w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none ${editKRForm.metricType === 'boolean' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          value={editKRForm.metricType === 'boolean' ? '' : editKRForm.unit}
                                          onChange={e => setEditKRForm({...editKRForm, unit: e.target.value})}
                                          disabled={isSaving || editKRForm.metricType === 'boolean'}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valore Iniziale</label>
                                        {editKRForm.metricType === 'boolean' ? (
                                          <div className="w-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-700 dark:text-slate-300 px-4 py-2">
                                            No
                                          </div>
                                        ) : (
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editKRForm.startValue}
                                            onChange={e => setEditKRForm({...editKRForm, startValue: parseFloat(e.target.value.replace(/^0+(?=\d)/, '')) || 0})}
                                            disabled={isSaving}
                                          />
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valore Target</label>
                                        {editKRForm.metricType === 'boolean' ? (
                                          <div className="w-full bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-700 dark:text-slate-300 px-4 py-2">
                                            Sì
                                          </div>
                                        ) : (
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editKRForm.targetValue}
                                            onChange={e => setEditKRForm({...editKRForm, targetValue: parseFloat(e.target.value.replace(/^0+(?=\d)/, '')) || 0})}
                                            disabled={isSaving}
                                          />
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="ghost" onClick={handleCancelEditKR} disabled={isSaving}>
                                        Annulla
                                      </Button>
                                      <Button onClick={handleSaveEditKR} disabled={isSaving || !editKRForm.description.trim()}>
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Display KR */
                                  <>
                                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                                      <div>
                                        <span className="text-slate-500 dark:text-slate-400">Valore Iniziale</span>
                                        <p className="font-medium text-slate-900 dark:text-slate-100">
                                          {kr.metricType === 'boolean' ? (kr.startValue === 1 ? 'Sì' : 'No') : `${kr.startValue} ${kr.unit || ''}`}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 dark:text-slate-400">Valore Target</span>
                                        <p className="font-medium text-slate-900 dark:text-slate-100">
                                          {kr.metricType === 'boolean' ? (kr.targetValue === 1 ? 'Sì' : 'No') : `${kr.targetValue} ${kr.unit || ''}`}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 dark:text-slate-400">Tipo Metrica</span>
                                        <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                                          {kr.metricType === 'boolean' ? 'Sì/No' : kr.metricType}
                                        </p>
                                      </div>
                                    </div>

                                    {canUpdateValue && (
                                      <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Aggiorna Valore Attuale
                                          </label>
                                          {kr.metricType === 'boolean' ? (
                                            <select
                                              className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                              value={krUpdates[kr.id] !== undefined ? krUpdates[kr.id] : kr.currentValue}
                                              onChange={e => setKrUpdates({ ...krUpdates, [kr.id]: parseFloat(e.target.value) })}
                                              disabled={isSaving}
                                            >
                                              <option value={0}>No</option>
                                              <option value={1}>Sì</option>
                                            </select>
                                          ) : (
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              className="w-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl text-slate-900 dark:text-slate-100 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                              value={krUpdates[kr.id] !== undefined ? krUpdates[kr.id] : kr.currentValue}
                                              onChange={e => {
                                                const val = e.target.value;
                                                if (val === '' || val === '-') {
                                                  setKrUpdates({ ...krUpdates, [kr.id]: val as any });
                                                } else {
                                                  const num = parseFloat(val);
                                                  if (!isNaN(num)) {
                                                    setKrUpdates({ ...krUpdates, [kr.id]: num });
                                                  }
                                                }
                                              }}
                                              onBlur={e => {
                                                const val = e.target.value;
                                                if (val === '' || val === '-') {
                                                  setKrUpdates({ ...krUpdates, [kr.id]: 0 });
                                                }
                                              }}
                                              disabled={isSaving}
                                            />
                                          )}
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
                                    )}
                                    {isEditable && (
                                      <div className="flex justify-end mt-3 gap-2">
                                        <button
                                          onClick={() => handleStartEditKR(kr)}
                                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                          title="Modifica Key Result"
                                          disabled={isSaving}
                                        >
                                          <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteKR(kr.id)}
                                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                          title="Elimina Key Result"
                                          disabled={isSaving}
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Children OKRs Section */}
              {!isEditing && (childrenOKRs.length > 0 || isLoadingChildren) && (
                <div className="space-y-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    OKR Collegati ({childrenOKRs.length})
                  </h4>

                  {isLoadingChildren ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {childrenOKRs.map((child) => (
                        <div
                          key={child.id}
                          className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">
                                  {levelLabels[child.level] || child.level}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[child.approvalStatus || 'draft'] || 'bg-gray-100 text-slate-600'}`}>
                                  {statusLabels[child.approvalStatus || 'draft'] || child.approvalStatus}
                                </span>
                              </div>
                              <h5 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                {child.title}
                              </h5>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${child.progress}%` }}
                                  />
                                </div>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {child.progress}%
                                </span>
                              </div>
                            </div>
                            {onSelectOKR && (
                              <button
                                onClick={() => onSelectOKR(child.id)}
                                className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Visualizza dettagli"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contributors Section */}
              {!isEditing && (
                <div className="space-y-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Contributori ({contributors.length})
                    </h4>
                    {(isOwner || isAdmin) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowAddContributor(!showAddContributor)}
                        disabled={isSaving}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Aggiungi
                      </Button>
                    )}
                  </div>

                  {/* Add Contributor Form */}
                  {showAddContributor && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-slate-900 dark:text-slate-100">Aggiungi Contributore</h5>
                        <button
                          onClick={() => {
                            setShowAddContributor(false);
                            setContributorSearch('');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          title="Chiudi"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cerca utente per nome o email..."
                          className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={contributorSearch}
                          onChange={e => setContributorSearch(e.target.value)}
                          disabled={isSaving}
                        />
                      </div>
                      {filteredUsers.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
                          {contributorSearch ? 'Nessun utente trovato' : 'Digita per cercare utenti'}
                        </p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredUsers.slice(0, 10).map(user => (
                            <button
                              key={user.id}
                              onClick={() => handleAddContributor(user.id)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors text-left"
                              disabled={isSaving}
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                              </div>
                              <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contributors List */}
                  {isLoadingContributors ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : contributors.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 dark:text-slate-500 text-sm">Nessun contributore</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contributors.map(contributor => (
                        <div
                          key={contributor.id}
                          className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {contributor.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{contributor.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{contributor.email}</p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg">
                            {contributor.role === 'contributor' ? 'Contributore' : contributor.role}
                          </span>
                          {(isOwner || isAdmin) && (
                            <button
                              onClick={() => handleRemoveContributor(contributor.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Rimuovi contributore"
                              disabled={isSaving}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Obiettivo non trovato
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OKRDetailModal;
