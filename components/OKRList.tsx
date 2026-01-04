import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, ProgressBar } from './UIComponents';
import { User } from '../types';
import { ICONS, STATUS_COLORS, PROGRESS_COLORS } from '../constants';
import { okrAPI, Objective } from '../api/client';
import { Loader2, RefreshCw } from 'lucide-react';

interface OKRListProps {
  onCreateClick: () => void;
  onSelectOKR: (id: string) => void;
  currentUser: User;
  refreshTrigger?: number; // Increment to trigger refresh
}

const OKRList: React.FC<OKRListProps> = ({ onCreateClick, onSelectOKR, currentUser, refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'company' | 'team' | 'individual'>('all');
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObjectives = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters = activeTab !== 'all' ? { level: activeTab } : {};
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
    // Filter by permissions (admin sees all, others see their own)
    if (currentUser.role !== 'admin' && obj.ownerId !== currentUser.id) {
      return false;
    }
    return true;
  });

  const tabLabels: Record<string, string> = {
    all: 'Tutti',
    company: 'Azienda',
    team: 'Team',
    individual: 'Individuali'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Obiettivi & Key Results</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentUser.role === 'admin'
              ? 'Visualizzazione di tutti gli obiettivi aziendali'
              : `Obiettivi di ${currentUser.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchObjectives}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {(['all', 'company', 'team', 'individual'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab ? 'text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabLabels[tab]}
            {activeTab === tab && (
              <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-black rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
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
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <div className="text-gray-400 mb-2">{ICONS.Target}</div>
              <p className="text-gray-500 font-medium">Nessun obiettivo trovato per questa vista.</p>
              <button
                onClick={onCreateClick}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
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
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Side: Objective Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[obj.status].split(' ')[0].replace('bg-', 'bg-').replace('100', '500')}`}></span>
                      <h3 className="text-lg font-bold text-gray-900">{obj.title}</h3>
                      <Badge className="ml-2 capitalize">{obj.period}</Badge>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      {ICONS.More}
                    </button>
                  </div>
                  
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                    {obj.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                    <div className="flex items-center gap-1">
                      <span className="bg-gray-100 p-1 rounded-full">{ICONS.Target}</span>
                      <span className="capitalize">{obj.level}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Owner display could be improved by looking up user details from ID */}
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-600">
                        {obj.ownerId === currentUser.id ? 'You' : obj.ownerId}
                      </span>
                    </div>
                    <div>Due: {new Date(obj.dueDate).toLocaleDateString()}</div>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-gray-900">{obj.progress}%</span>
                    <ProgressBar 
                        value={obj.progress} 
                        color={PROGRESS_COLORS[obj.status as keyof typeof PROGRESS_COLORS] ? `bg-[${PROGRESS_COLORS[obj.status as keyof typeof PROGRESS_COLORS]}]` : 'bg-blue-500'} 
                      />
                  </div>
                </div>

                {/* Right Side: Key Results */}
                <div className="flex-1 bg-gray-50 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Key Results</h4>
                  <div className="space-y-3">
                    {obj.keyResults.map((kr) => (
                      <div key={kr.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">{kr.description}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[kr.status]}`}>
                            {kr.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-gray-400 h-1.5 rounded-full" 
                              style={{ width: `${(kr.currentValue / kr.targetValue) * 100}%` }}
                            ></div>
                          </div>
                          <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                        </div>
                      </div>
                    ))}
                    {obj.keyResults.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No key results defined.</p>
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