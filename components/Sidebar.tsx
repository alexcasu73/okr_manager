import React from 'react';
import { ICONS } from '../constants';
import { ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface NavItemProps {
  item: {
    id: string;
    label: string;
    icon: React.ReactNode;
  };
  active?: boolean;
  onClick: (id: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, active, onClick }) => (
  <button
    onClick={() => onClick(item.id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1
      ${active
        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
  >
    <span className={active ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}>
      {item.icon}
    </span>
    <span className="font-medium text-sm">{item.label}</span>
  </button>
);

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const handleLogout = () => {
    localStorage.clear();
    logout();
    window.location.replace('/');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
    { id: 'okrs', label: 'Objectives', icon: ICONS.Target },
    { id: 'team', label: 'My Team', icon: ICONS.Team },
  ];

  const bottomItems = [
    { id: 'reports', label: 'Analytics', icon: ICONS.Analytics },
    // Admin menu - only visible to admins
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Gestione Utenti', icon: ICONS.Admin }] : []),
    { id: 'profile', label: 'Profilo', icon: ICONS.Settings },
  ];

  return (
    <div className="w-64 h-screen bg-white dark:bg-slate-900 flex flex-col p-5 border-r border-slate-100 dark:border-slate-800 fixed left-0 top-0 z-10 hidden lg:flex transition-colors duration-300 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-1.5 rounded-lg">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">OKR Manager</h1>
      </div>

      <div className="mb-2">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-3">Menu</p>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={currentView === item.id}
              onClick={(id) => onChangeView(id as ViewMode)}
            />
          ))}
        </nav>
      </div>

      <div className="mt-6 mb-auto">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 mb-3">Support</p>
        <nav className="space-y-1">
          {bottomItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={currentView === item.id}
              onClick={(id) => onChangeView(id as ViewMode)}
            />
          ))}
        </nav>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors mb-2 text-sm font-medium"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-medium"
      >
        {ICONS.Logout}
        <span>Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;