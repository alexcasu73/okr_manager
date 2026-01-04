import React from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Users, 
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
  FileText
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
};

export const STATUS_COLORS = {
  'on-track': 'bg-green-100 text-green-700',
  'at-risk': 'bg-amber-100 text-amber-700',
  'off-track': 'bg-red-100 text-red-700',
  'completed': 'bg-blue-100 text-blue-700',
  'draft': 'bg-gray-100 text-gray-700',
};

export const PROGRESS_COLORS = {
  'on-track': '#10B981',
  'at-risk': '#F59E0B',
  'off-track': '#EF4444',
  'completed': '#3B82F6',
  'draft': '#9CA3AF',
};
