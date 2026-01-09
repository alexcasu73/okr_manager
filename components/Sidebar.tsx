import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { subscriptionAPI } from '../api/client';
import { Moon, Sun, X, ChevronLeft, ChevronRight, Crown } from 'lucide-react';

interface NavItemProps {
  item: {
    id: string;
    label: string;
    icon: React.ReactNode;
    suffix?: React.ReactNode;
  };
  active?: boolean;
  onClick: (id: string) => void;
  collapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, active, onClick, collapsed }) => (
  <button
    onClick={() => onClick(item.id)}
    title={collapsed ? item.label : undefined}
    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200
      ${collapsed ? 'justify-center' : ''}
      ${active
        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
  >
    <span className={`${active ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'} [&>svg]:w-[18px] [&>svg]:h-[18px]`}>
      {item.icon}
    </span>
    {!collapsed && (
      <span className="font-medium text-sm flex items-center gap-2">
        {item.label}
        {item.suffix}
      </span>
    )}
  </button>
);

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [isPremium, setIsPremium] = useState(false);

  // Fetch subscription info for azienda users
  useEffect(() => {
    if (user?.role === 'azienda') {
      subscriptionAPI.getInfo()
        .then(info => setIsPremium(info.tier === 'premium'))
        .catch(() => setIsPremium(false));
    }
  }, [user?.role]);

  const handleLogout = () => {
    localStorage.clear();
    logout();
    window.location.replace('/');
  };

  // Menu items based on role
  // Superadmin e Azienda non hanno menu principale (usano solo bottomItems)
  const menuItems = (user?.role === 'superadmin' || user?.role === 'azienda') ? [] : [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard },
    { id: 'okrs', label: 'Objectives', icon: ICONS.Target },
    { id: 'team', label: 'My Team', icon: ICONS.Team },
  ];

  const bottomItems = [
    // Analytics - not visible to superadmin or azienda
    ...(user?.role !== 'superadmin' && user?.role !== 'azienda' ? [{ id: 'reports', label: 'Analytics', icon: ICONS.Analytics }] : []),
    // Superadmin panel - only visible to superadmin role
    ...(user?.role === 'superadmin' ? [{ id: 'superadmin', label: 'Gestione Aziende', icon: ICONS.Admin }] : []),
    // Gestione Utenti - only visible to azienda role (multi-tenant owner)
    ...(user?.role === 'azienda' ? [{ id: 'admin', label: 'Gestione Utenti', icon: ICONS.Admin }] : []),
    // Billing - hidden (all companies are premium by default)
    // ...(user?.role === 'azienda' ? [{ id: 'billing', label: 'Subscription', icon: ICONS.Billing, suffix: isPremium ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : undefined }] : []),
    { id: 'profile', label: 'Profilo', icon: ICONS.Settings },
  ];

  const handleNavClick = (id: string) => {
    onChangeView(id as ViewMode);
    // Close mobile menu when navigating
    if (onClose) onClose();
  };

  // Full sidebar content for mobile and expanded desktop
  const sidebarContent = (collapsed: boolean) => (
    <>
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 mb-6 px-1`}>
        {collapsed ? (
          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-2 rounded-xl">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-2 rounded-xl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">OKR Manager</h1>
            </div>
            {/* Close button for mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>


      <div className="mb-2">
        {!collapsed && (
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3.5 mb-3">Menu</p>
        )}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={currentView === item.id}
              onClick={handleNavClick}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>

      <div className="mt-6 mb-auto">
        {!collapsed && (
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3.5 mb-3">Support</p>
        )}
        <nav className="space-y-1">
          {bottomItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={currentView === item.id}
              onClick={handleNavClick}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        title={collapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
        className={`flex items-center gap-3 px-3.5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors mb-2 text-sm font-medium ${collapsed ? 'justify-center' : ''}`}
      >
        {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
      </button>

      <button
        onClick={handleLogout}
        title={collapsed ? 'Logout' : undefined}
        className={`flex items-center gap-3 px-3.5 py-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-medium ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="[&>svg]:w-[18px] [&>svg]:h-[18px]">{ICONS.Logout}</span>
        {!collapsed && <span>Logout</span>}
      </button>
    </>
  );

  return (
    <>
      {/* Desktop/Tablet Sidebar - visible from md breakpoint */}
      <div
        className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-white dark:bg-slate-900 flex-col p-5 border-r border-slate-100 dark:border-slate-800 fixed left-0 top-0 z-10 hidden md:flex transition-all duration-300 overflow-y-auto`}
      >
        {sidebarContent(isCollapsed)}
      </div>

      {/* Collapse toggle button - floating on sidebar edge */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={`hidden md:flex items-center justify-center fixed top-7 ${isCollapsed ? 'left-[68px]' : 'left-[244px]'} z-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300`}
          title={isCollapsed ? 'Espandi menu' : 'Comprimi menu'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />
          {/* Sidebar - always expanded on mobile */}
          <div className="w-64 h-screen bg-white dark:bg-slate-900 flex flex-col p-5 fixed left-0 top-0 z-50 md:hidden transition-colors duration-300 overflow-y-auto">
            {sidebarContent(false)}
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;
