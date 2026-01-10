import React, { useState, useEffect } from 'react';
import { X, Users, Loader2, AlertCircle } from 'lucide-react';
import { okrAPI } from '../api/client';

interface LeadUser {
  id: string;
  name: string;
  email: string;
}

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string; leadId?: string }) => Promise<void>;
  userRole?: string;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  userRole
}) => {
  const isAdmin = userRole === 'admin';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState('');
  const [availableLeads, setAvailableLeads] = useState<LeadUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadAvailableLeads();
    }
  }, [isOpen, isAdmin]);

  const loadAvailableLeads = async () => {
    setIsLoadingLeads(true);
    try {
      // Get users who can be leads (role = 'lead')
      const users = await okrAPI.getUsers();
      console.log('All users from API:', users);
      const leads = users.filter(u => u.role === 'lead');
      console.log('Filtered leads:', leads);
      setAvailableLeads(leads);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Inserisci il nome del team');
      return;
    }

    // Only admin needs to select a lead
    if (isAdmin && !leadId) {
      setError('Seleziona un lead per il team');
      return;
    }

    setIsLoading(true);
    try {
      const data: { name: string; description?: string; leadId?: string } = {
        name: name.trim(),
        description: description.trim() || undefined
      };
      if (isAdmin && leadId) {
        data.leadId = leadId;
      }
      await onCreate(data);
      setName('');
      setDescription('');
      setLeadId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione del team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setLeadId('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Crea Team</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isAdmin ? 'Assegna un lead al nuovo team' : 'Crea un nuovo team di cui sarai il lead'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome Team *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Team Prodotto, Engineering"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              disabled={isLoading}
            />
          </div>

          {/* Lead Selection - only for admin */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Lead del Team *
              </label>
              {isLoadingLeads ? (
                <div className="flex items-center gap-2 py-3 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Caricamento lead...</span>
                </div>
              ) : availableLeads.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-400 py-2">
                  Nessun lead disponibile. Crea prima un utente con ruolo Lead.
                </p>
              ) : (
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100"
                  disabled={isLoading}
                >
                  <option value="">Seleziona un lead...</option>
                  {availableLeads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} ({lead.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descrizione (opzionale)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Di cosa si occupa questo team?"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading || (isAdmin && availableLeads.length === 0)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creazione...
                </>
              ) : (
                'Crea Team'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamModal;
