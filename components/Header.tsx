import React from 'react';
import { User } from '../types';
import { ICONS } from '../constants';

interface HeaderProps {
  user: User;
  allUsers: User[];
  onUserSwitch: (user: User) => void;
}

const Header: React.FC<HeaderProps> = ({ user, allUsers, onUserSwitch }) => {
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
        <button className="relative bg-white p-3 rounded-xl shadow-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
          {ICONS.Bell}
          <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

        {/* Profile & Switcher */}
        <div className="flex items-center gap-3 pl-2 bg-white p-2 rounded-2xl shadow-sm">
          <img 
            src={user.avatar} 
            alt={user.name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
          />
          <div className="flex flex-col">
            <p className="text-sm font-bold text-gray-900 leading-none mb-1">{user.name}</p>
            <select 
              className="text-xs text-gray-500 bg-transparent border-none outline-none cursor-pointer p-0"
              value={user.id}
              onChange={(e) => {
                const selected = allUsers.find(u => u.id === e.target.value);
                if (selected) onUserSwitch(selected);
              }}
            >
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.role === 'super-admin' ? 'View as Super Admin' : `View as ${u.role}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;