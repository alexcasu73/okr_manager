import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, ProgressBar, Tooltip as UITooltip } from './UIComponents';
import { ICONS, STATUS_COLORS, STATUS_LABELS } from '../constants';
import { okrAPI, Objective, KeyResult, HealthMetrics } from '../api/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { User } from '../types';
import {
  Loader2, Target, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Calendar, ArrowRight, Users, Building2, User as UserIcon,
  Gauge, TrendingDown, Zap
} from 'lucide-react';

interface DashboardProps {
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadObjectivesRef = useRef<() => void>(() => {});

  useEffect(() => {
    loadObjectives();
  }, []);

  // Listen for SSE real-time notifications
  useEffect(() => {
    const handleSSE = () => {
      loadObjectivesRef.current();
    };
    window.addEventListener('sse-notification', handleSSE);
    return () => window.removeEventListener('sse-notification', handleSSE);
  }, []);

  const loadObjectives = async () => {
    setIsLoading(true);
    try {
      const data = await okrAPI.getObjectives();
      setObjectives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  };

  // Update ref so SSE callback can call loadObjectives
  loadObjectivesRef.current = loadObjectives;

  // Computed statistics
  const stats = useMemo(() => {
    const total = objectives.length;
    const avgProgress = total > 0
      ? Math.round(objectives.reduce((acc, obj) => acc + obj.progress, 0) / total)
      : 0;
    const draft = objectives.filter(o => o.approvalStatus === 'draft').length;
    const pendingReview = objectives.filter(o => o.approvalStatus === 'pending_review').length;
    const approved = objectives.filter(o => o.approvalStatus === 'approved').length;
    const active = objectives.filter(o => o.approvalStatus === 'active').length;
    const completed = objectives.filter(o => o.approvalStatus === 'completed').length;

    return { total, avgProgress, draft, pendingReview, approved, active, completed };
  }, [objectives]);

  // Status distribution for pie chart (based on approvalStatus)
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    objectives.forEach(obj => {
      const status = obj.approvalStatus || 'draft';
      counts[status] = (counts[status] || 0) + 1;
    });

    return [
      { name: 'Bozza', value: counts['draft'] || 0, color: '#9CA3AF' },
      { name: 'In Revisione', value: counts['pending_review'] || 0, color: '#F59E0B' },
      { name: 'Approvato', value: counts['approved'] || 0, color: '#8B5CF6' },
      { name: 'Attivo', value: counts['active'] || 0, color: '#10B981' },
    ].filter(item => item.value > 0);
  }, [objectives]);

  // Level distribution
  const levelDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    objectives.forEach(obj => {
      counts[obj.level] = (counts[obj.level] || 0) + 1;
    });

    return [
      { name: 'Azienda', value: counts['company'] || 0, icon: Building2, color: 'bg-purple-100 text-purple-600' },
      { name: 'Team', value: counts['team'] || 0, icon: Users, color: 'bg-green-100 text-green-600' },
      { name: 'Individuale', value: counts['individual'] || 0, icon: UserIcon, color: 'bg-orange-100 text-orange-600' },
    ];
  }, [objectives]);

  // Upcoming deadlines (next 14 days)
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    return objectives
      .filter(obj => {
        if (!obj.dueDate || obj.progress >= 100) return false;
        const dueDate = new Date(obj.dueDate);
        return dueDate >= now && dueDate <= twoWeeksFromNow;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [objectives]);

  // Critical Key Results (low progress or off-track)
  const criticalKeyResults = useMemo(() => {
    const allKRs: (KeyResult & { objectiveTitle: string })[] = [];

    objectives.forEach(obj => {
      if (obj.progress >= 100) return;

      obj.keyResults.forEach(kr => {
        const progress = kr.targetValue > kr.startValue
          ? ((kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100
          : 0;

        // KR is critical if progress < 30%
        if (progress < 30) {
          allKRs.push({
            ...kr,
            objectiveTitle: obj.title
          });
        }
      });
    });

    return allKRs.slice(0, 5);
  }, [objectives]);

  // Recently updated objectives
  const recentlyUpdated = useMemo(() => {
    return [...objectives]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [objectives]);

  // OKRs that need monitoring (based on health metrics)
  const needsAttention = useMemo(() => {
    return objectives
      .filter(obj => {
        if (obj.progress >= 100) return false;
        const metrics = obj.healthMetrics;
        if (!metrics) return false;
        return metrics.riskLevel === 'medium' ||
          metrics.riskLevel === 'high' ||
          metrics.riskLevel === 'critical';
      })
      .sort((a, b) => {
        // Sort by risk level (critical > high > medium)
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const riskA = a.healthMetrics?.riskLevel || 'low';
        const riskB = b.healthMetrics?.riskLevel || 'low';
        return riskOrder[riskA] - riskOrder[riskB];
      })
      .slice(0, 5);
  }, [objectives]);

  // Pace statistics
  const paceStats = useMemo(() => {
    const withMetrics = objectives.filter(obj =>
      obj.healthMetrics && obj.progress < 100 && obj.approvalStatus === 'active'
    );

    if (withMetrics.length === 0) return { avgPaceRatio: 1, onPaceCount: 0, behindCount: 0 };

    // Use ?? instead of || to correctly handle paceRatio = 0
    const avgPaceRatio = withMetrics.reduce((sum, obj) =>
      sum + (obj.healthMetrics?.paceRatio ?? 1), 0) / withMetrics.length;

    const onPaceCount = withMetrics.filter(obj => obj.healthMetrics?.isOnPace).length;
    const behindCount = withMetrics.length - onPaceCount;

    return { avgPaceRatio: Math.round(avgPaceRatio * 100) / 100, onPaceCount, behindCount };
  }, [objectives]);

  // Helper functions
  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getKRProgress = (kr: KeyResult) => {
    if (kr.targetValue === kr.startValue) return kr.currentValue >= kr.targetValue ? 100 : 0;
    return Math.min(Math.max(((kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100, 0), 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Using STATUS_LABELS from constants for consistency

  const riskLevelConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof AlertTriangle }> = {
    low: { label: 'Basso', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
    medium: { label: 'Medio', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle },
    high: { label: 'Alto', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: AlertTriangle },
    critical: { label: 'Critico', color: 'text-red-600', bgColor: 'bg-red-100', icon: TrendingDown }
  };

  const getPaceColor = (paceRatio: number) => {
    if (paceRatio >= 1.0) return 'text-green-600';
    if (paceRatio >= 0.8) return 'text-green-500';
    if (paceRatio >= 0.6) return 'text-yellow-500';
    if (paceRatio >= 0.4) return 'text-orange-500';
    return 'text-red-500';
  };

  const getPaceLabel = (paceRatio: number) => {
    if (paceRatio >= 1.1) return 'In anticipo';
    if (paceRatio >= 0.9) return 'In linea';
    if (paceRatio >= 0.7) return 'Leggero ritardo';
    if (paceRatio >= 0.5) return 'In ritardo';
    return 'Critico';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        {error}
        <button onClick={loadObjectives} className="ml-2 underline">Riprova</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {currentUser.role === 'admin' ? 'Panoramica aziendale' : `Benvenuto, ${currentUser.name}`}
          </p>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-4 py-2 rounded-xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700/50">
          {stats.total} Obiettivi attivi
        </span>
      </div>

      {/* Stats Cards - responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <Card className="relative overflow-hidden cursor-help">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">Obiettivi Totali</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{stats.draft} in bozza</p>
            </div>
            <div className="p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden cursor-help">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 flex-1 mr-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">Progresso Medio</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.avgProgress}%</h3>
              <ProgressBar value={stats.avgProgress} height="h-1.5" color={getProgressColor(stats.avgProgress)} />
            </div>
            <div className="p-2 sm:p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden cursor-help">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">Ritmo Medio</p>
              <h3 className={`text-2xl sm:text-3xl font-bold ${getPaceColor(paceStats.avgPaceRatio)}`}>
                {Math.round(paceStats.avgPaceRatio * 100)}%
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{paceStats.onPaceCount} in linea</p>
            </div>
            <div className="p-2 sm:p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden cursor-help">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">Completati</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.completed}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% del totale</p>
            </div>
            <div className="p-2 sm:p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid - fills remaining space */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr" style={{ minHeight: 'calc(100vh - 320px)' }}>
        {/* Distribuzione per Stato */}
        <Card title="Distribuzione per Stato" className="flex flex-col overflow-hidden">
          {stats.total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm">
              —
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 relative min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Totale</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
                {statusDistribution.map((status) => (
                  <div key={status.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                      <span className="text-slate-600 dark:text-slate-400 truncate">{status.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Scadenze Imminenti */}
        <Card title="Scadenze Imminenti" className="flex flex-col overflow-hidden" action={
          <span className="text-xs text-slate-400">14 giorni</span>
        }>
          {upcomingDeadlines.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Nessuna scadenza
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {upcomingDeadlines.map((obj) => {
                const daysLeft = getDaysUntilDue(obj.dueDate);
                const isUrgent = daysLeft <= 3;

                return (
                  <div key={obj.id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      <Calendar className={`w-4 h-4 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{obj.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(obj.dueDate)}</p>
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? 'Domani' : `${daysLeft}g`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Obiettivi per Livello */}
        <Card title="Obiettivi per Livello" className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3">
            {levelDistribution.map((level) => (
              <div key={level.name} className="flex items-center gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${level.color}`}>
                  <level.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{level.name}</span>
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{level.value}</span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar
                      value={stats.total > 0 ? (level.value / stats.total) * 100 : 0}
                      height="h-1.5"
                      color="bg-gray-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* OKR sotto monitoraggio */}
        <Card title="OKR sotto monitoraggio" className="flex flex-col overflow-hidden" action={
          <span className="text-xs text-orange-500 font-medium">
            {needsAttention.length > 0 ? `${needsAttention.length} da verificare` : ''}
          </span>
        }>
          {needsAttention.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mb-2 text-green-400" />
              Tutto in linea
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {needsAttention.map((obj) => {
                const metrics = obj.healthMetrics!;
                const riskConfig = riskLevelConfig[metrics.riskLevel];
                const RiskIcon = riskConfig.icon;

                return (
                  <div key={obj.id} className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${riskConfig.bgColor}`}>
                        <RiskIcon className={`w-4 h-4 ${riskConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{obj.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-lg ${riskConfig.bgColor} ${riskConfig.color}`}>
                            {riskConfig.label}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{obj.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Aggiornati di Recente - spans 2 columns on md */}
        <Card title="Aggiornati di Recente" className="md:col-span-2 lg:col-span-1 flex flex-col overflow-hidden">
          {recentlyUpdated.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm">
              —
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3">
              {recentlyUpdated.map((obj) => {
                const approvalStatus = obj.approvalStatus || 'draft';
                const bgColorMap: Record<string, string> = {
                  'draft': 'bg-slate-100',
                  'pending_review': 'bg-amber-100',
                  'approved': 'bg-purple-100',
                  'active': 'bg-green-100'
                };
                const textColorMap: Record<string, string> = {
                  'draft': 'text-slate-600',
                  'pending_review': 'text-amber-600',
                  'approved': 'text-purple-600',
                  'active': 'text-green-600'
                };
                return (
                  <div key={obj.id} className="group">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${bgColorMap[approvalStatus] || 'bg-blue-100'}`}>
                        <Target className={`w-4 h-4 ${textColorMap[approvalStatus] || 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{obj.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-lg ${STATUS_COLORS[approvalStatus] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[approvalStatus] || approvalStatus}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{obj.period}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">{obj.progress}%</span>
                      </div>
                    </div>
                    <div className="mt-2 ml-11">
                      <ProgressBar value={obj.progress} height="h-1.5" color={getProgressColor(obj.progress)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;
