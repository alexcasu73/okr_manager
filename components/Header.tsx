import React from 'react';
import { ICONS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  onSelectOKR?: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSelectOKR }) => {
  const { user, logout, isLoading } = useAuth();

  // Always show header with at least logout option
  const handleLogout = () => {
    console.log('Logout clicked');
    // Clear token directly as fallback
    localStorage.clear();
    logout();
    // Force page reload to login
    window.location.replace('/');
  };

  if (!user && !isLoading) {
    // Show minimal header with logout for broken session
    return (
      <header className="flex items-center justify-end mb-8">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </header>
    );
  }

  if (!user) return null;

  return (
    <header className="flex items-center justify-end mb-4 gap-3">
      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <button className="relative bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm dark:shadow-gray-900/20 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors hidden sm:block">
          <span className="[&>svg]:w-4 [&>svg]:h-4">{ICONS.Statistics}</span>
        </button>
        <div className="hidden sm:block">
          <NotificationCenter onSelectOKR={onSelectOKR} />
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

        {/* Profile */}
        <div className="flex items-center gap-2 pl-1.5 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm dark:shadow-gray-900/20">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff`}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
          />
          <div className="flex flex-col">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none mb-0.5">{user.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="ml-1 p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
