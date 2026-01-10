import React from 'react';
import { Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestisci le impostazioni dell'applicazione</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl mb-4">
            <Settings className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Nessuna impostazione disponibile al momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
