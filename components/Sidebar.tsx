import React from 'react';
import { ICONS } from '../constants';
import { ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';

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
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 mb-1
      ${active 
        ? 'bg-black text-white shadow-lg shadow-gray-200' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
  >
    <span className={active ? 'text-white' : 'text-gray-500'}>
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
    <div className="w-64 min-h-screen bg-white flex flex-col p-6 border-r border-gray-100 fixed left-0 top-0 z-10 hidden lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="bg-black text-white p-1.5 rounded-lg">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">OKR Manager</h1>
      </div>

      <div className="mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase px-4 mb-4">Menu</p>
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

      <div className="mt-8 mb-auto">
        <p className="text-xs font-medium text-gray-400 uppercase px-4 mb-4">Support</p>
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

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-2 text-sm font-medium"
      >
        {ICONS.Logout}
        <span>Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;