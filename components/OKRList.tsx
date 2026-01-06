import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, ProgressBar } from './UIComponents';
import { User } from '../types';
import { ICONS, STATUS_COLORS, PROGRESS_COLORS, STATUS_LABELS } from '../constants';
import { okrAPI, Objective } from '../api/client';
import { Loader2, RefreshCw } from 'lucide-react';

interface OKRListProps {
  onCreateClick: () => void;
  onSelectOKR: (id: string) => void;
  currentUser: User;
  refreshTrigger?: number; // Increment to trigger refresh
}

const OKRList: React.FC<OKRListProps> = ({ onCreateClick, onSelectOKR, currentUser, refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'company' | 'team' | 'individual' | 'archived'>('all');
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObjectives = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // 'archived' tab fetches all and filters client-side, level tabs filter by level
      const filters = (activeTab !== 'all' && activeTab !== 'archived') ? { level: activeTab } : {};
      const data = await okrAPI.getObjectives(filters);
      setObjectives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento degli obiettivi');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives, refreshTrigger]);

  const filteredObjectives = objectives.filter(obj => {
    // Backend already filters by owner/contributor, just handle archived tab here
    // In 'archived' tab, show only archived OKRs
    if (activeTab === 'archived') {
      return obj.approvalStatus === 'archived';
    }
    // In other tabs, exclude archived OKRs
    if (obj.approvalStatus === 'archived') {
      return false;
    }
    return true;
  });

  const tabLabels: Record<string, string> = {
    all: 'Tutti',
    company: 'Azienda',
    team: 'Team',
    individual: 'Individuali',
    archived: 'Archiviati'
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Obiettivi & Key Results</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {currentUser.role === 'admin'
              ? 'Visualizzazione di tutti gli obiettivi aziendali'
              : `Obiettivi di ${currentUser.name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchObjectives}
            disabled={isLoading}
            className="p-2.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Aggiorna"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={onCreateClick} icon={ICONS.Plus}>
            Crea OKR
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 pb-1">
        {(['all', 'company', 'team', 'individual', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative rounded-t-lg ${
              activeTab === tab ? 'text-black dark:text-slate-100 bg-slate-100 dark:bg-slate-800' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tabLabels[tab]}
            {activeTab === tab && (
              <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-black dark:bg-white rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
          {error}
          <button onClick={fetchObjectives} className="ml-2 underline">Riprova</button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {filteredObjectives.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Nessun obiettivo trovato per questa vista.</p>
              <button
                onClick={onCreateClick}
                className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
              >
                Crea il tuo primo OKR
              </button>
            </div>
          ) : (
            filteredObjectives.map((obj) => (
            <Card
              key={obj.id}
              className="transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => onSelectOKR(obj.id)}
            >
              <div className="flex flex-col md:flex-row gap-5">
                {/* Left Side: Objective Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${(STATUS_COLORS[obj.approvalStatus || 'draft'] || STATUS_COLORS['draft']).split(' ')[0].replace('100', '500')}`}></span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{obj.title}</h3>
                      <Badge className={`ml-2 ${STATUS_COLORS[obj.approvalStatus || 'draft'] || STATUS_COLORS['draft']}`}>
                        {STATUS_LABELS[obj.approvalStatus || 'draft'] || 'Bozza'}
                      </Badge>
                      <Badge className="capitalize">{obj.period}</Badge>
                    </div>
                    <button className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 dark:text-slate-600">
                      {ICONS.More}
                    </button>
                  </div>

                  <p className="text-gray-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    {obj.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mb-5">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg">{ICONS.Target}</span>
                      <span className="capitalize">{obj.level}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg font-medium text-gray-600 dark:text-slate-300">
                        {obj.ownerId === currentUser.id ? 'Tu' : (obj.ownerName || obj.ownerId)}
                      </span>
                    </div>
                    <div>Due: {obj.dueDate ? new Date(obj.dueDate).toLocaleDateString() : 'N/D'}</div>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{obj.progress}%</span>
                    <ProgressBar
                        value={obj.progress}
                        color={PROGRESS_COLORS[obj.approvalStatus || 'draft'] ? `bg-[${PROGRESS_COLORS[obj.approvalStatus || 'draft']}]` : 'bg-blue-500'}
                      />
                  </div>
                </div>

                {/* Right Side: Key Results */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-3">Key Results</h4>
                  <div className="space-y-3">
                    {obj.keyResults.map((kr) => {
                      const krProgress = kr.targetValue > 0 ? Math.round((kr.currentValue / kr.targetValue) * 100) : 0;
                      return (
                        <div key={kr.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 line-clamp-1">{kr.description}</p>
                            <span className="text-xs font-bold text-gray-600 dark:text-slate-300">
                              {krProgress}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${krProgress >= 70 ? 'bg-green-500' : krProgress >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`}
                                style={{ width: `${krProgress}%` }}
                              ></div>
                            </div>
                            <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                    {obj.keyResults.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 italic">No key results defined.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default OKRList;