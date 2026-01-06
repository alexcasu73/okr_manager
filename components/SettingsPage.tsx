import React from 'react';
import { Settings, Construction } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-12 text-center max-w-md">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Impostazioni</h2>
        <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
          <Construction className="w-4 h-4" />
          <span className="text-sm">In arrivo</span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Questa sezione sarà disponibile presto con opzioni per personalizzare
          il tuo profilo, notifiche, preferenze e altro.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
