import React, { useState, useEffect } from 'react';
import { Settings, Bell, Check } from 'lucide-react';

const NOTIFICATION_REFRESH_KEY = 'okr_notification_refresh_interval';

const SettingsPage: React.FC = () => {
  const [notificationInterval, setNotificationInterval] = useState<number>(() => {
    const saved = localStorage.getItem(NOTIFICATION_REFRESH_KEY);
    return saved ? parseInt(saved, 10) : 5;
  });
  const [saved, setSaved] = useState(false);

  const intervals = [
    { value: 1, label: '1 minuto' },
    { value: 5, label: '5 minuti' },
    { value: 10, label: '10 minuti' },
  ];

  const handleIntervalChange = (value: number) => {
    setNotificationInterval(value);
    localStorage.setItem(NOTIFICATION_REFRESH_KEY, value.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // Dispatch custom event so other components can listen
    window.dispatchEvent(new CustomEvent('notificationIntervalChanged', { detail: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestisci le impostazioni dell'applicazione</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 overflow-hidden">
        {/* Notification Settings */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notifiche</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Impostazioni per le notifiche</p>
            </div>
          </div>

          <div className="ml-12">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Intervallo di aggiornamento notifiche
            </label>
            <div className="flex gap-3">
              {intervals.map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => handleIntervalChange(interval.value)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    notificationInterval === interval.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Le notifiche verranno aggiornate ogni {notificationInterval} {notificationInterval === 1 ? 'minuto' : 'minuti'}
            </p>
          </div>
        </div>

        {/* More settings sections can be added here */}
      </div>

      {/* Save confirmation toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-4">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Impostazioni salvate</span>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
