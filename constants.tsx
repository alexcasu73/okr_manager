import React from 'react';
import {
  LayoutDashboard,
  Target,
  Users,
  User,
  PieChart,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  MoreHorizontal,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Shield,
  CreditCard
} from 'lucide-react';

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Performance: <TrendingUp size={20} />,
  Statistics: <FileText size={20} />, // Using FileText as a proxy for statistics list
  Analytics: <PieChart size={20} />,
  Target: <Target size={20} />,
  Team: <Users size={20} />,
  Settings: <Settings size={20} />,
  Logout: <LogOut size={20} />,
  Bell: <Bell size={20} />,
  Search: <Search size={20} />,
  Plus: <Plus size={20} />,
  More: <MoreHorizontal size={20} />,
  TrendingUp: <TrendingUp size={20} />,
  Warning: <AlertTriangle size={16} />,
  Check: <CheckCircle2 size={16} />,
  Error: <XCircle size={16} />,
  Admin: <Shield size={20} />,
  Billing: <CreditCard size={20} />,
  User: <User size={20} />,
};

// Colori per ApprovalStatus (flusso di approvazione)
export const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  'pending_review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'approved': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  'active': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  'paused': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  'stopped': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'archived': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  'closed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'failed': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  // Fallback per vecchi valori
  'on-track': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  'at-risk': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'off-track': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'completed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
};

export const PROGRESS_COLORS: Record<string, string> = {
  'draft': '#9CA3AF',
  'pending_review': '#F59E0B',
  'approved': '#8B5CF6',
  'active': '#10B981',
  'paused': '#F97316',
  'stopped': '#EF4444',
  'archived': '#6B7280',
  'closed': '#3B82F6',
  'failed': '#EF4444',
  // Fallback per vecchi valori
  'on-track': '#10B981',
  'at-risk': '#F59E0B',
  'off-track': '#EF4444',
  'completed': '#3B82F6',
};

export const STATUS_LABELS: Record<string, string> = {
  'draft': 'Bozza',
  'pending_review': 'In Revisione',
  'approved': 'Approvato',
  'active': 'Attivo',
  'paused': 'In Pausa',
  'stopped': 'Fermato',
  'archived': 'Archiviato',
  'closed': 'Chiuso',
  'failed': 'Fallito',
};
