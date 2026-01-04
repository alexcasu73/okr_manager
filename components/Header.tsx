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
    <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-xl w-full">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {ICONS.Search}
          </span>
          <input
            type="text"
            placeholder="Search objectives, key results..."
            className="w-full bg-white border-none py-3.5 pl-12 pr-4 rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 shadow-sm"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-0 md:ml-4">
        <button className="relative bg-white p-3 rounded-xl shadow-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
          {ICONS.Statistics}
        </button>
        <div className="hidden sm:block">
          <NotificationCenter onSelectOKR={onSelectOKR} />
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-2 bg-white p-2 rounded-2xl shadow-sm">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff`}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
          />
          <div className="flex flex-col">
            <p className="text-sm font-bold text-gray-900 leading-none mb-0.5">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
