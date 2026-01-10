import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Clock, X, ChevronRight } from 'lucide-react';
import { okrAPI, Objective } from '../api/client';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  objectiveId: string;
  timestamp: Date;
}

interface NotificationCenterProps {
  onSelectOKR?: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onSelectOKR }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissedNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fetchNotificationsRef = useRef<() => void>(() => {});

  // Dismiss a single notification
  const dismissNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(notificationId);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
  };

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications function
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [objectives, pendingApprovals] = await Promise.all([
        okrAPI.getObjectives(),
        okrAPI.getPendingApprovals().catch(() => []) // Gracefully handle if user can't access
      ]);
      const generatedNotifications: Notification[] = [];

      // Add pending approval notifications
      pendingApprovals.forEach((obj: Objective) => {
        generatedNotifications.push({
          id: `${obj.id}-approval`,
          type: 'warning',
          title: 'Richiesta Approvazione',
          message: `"${obj.title}" richiede la tua approvazione`,
          objectiveId: obj.id,
          timestamp: new Date(),
        });
      });

      objectives.forEach((obj: Objective) => {
        // Check for critical OKRs (based on healthMetrics)
        if (obj.healthMetrics?.riskLevel === 'critical') {
          generatedNotifications.push({
            id: `${obj.id}-critical`,
            type: 'critical',
            title: 'OKR Critico',
            message: `"${obj.title}" richiede attenzione urgente`,
            objectiveId: obj.id,
            timestamp: new Date(),
          });
        }
        // Check for at-risk OKRs (based on healthMetrics)
        else if (obj.healthMetrics?.riskLevel === 'high' || obj.healthMetrics?.riskLevel === 'medium') {
          generatedNotifications.push({
            id: `${obj.id}-warning`,
            type: 'warning',
            title: 'OKR a Rischio',
            message: `"${obj.title}" potrebbe non raggiungere l'obiettivo`,
            objectiveId: obj.id,
            timestamp: new Date(),
          });
        }

        // Check for OKRs with upcoming deadlines (within 7 days)
        if (obj.dueDate && obj.progress < 100) {
          const dueDate = new Date(obj.dueDate);
          const now = new Date();
          const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysRemaining > 0 && daysRemaining <= 7 && obj.progress < 80) {
            generatedNotifications.push({
              id: `${obj.id}-deadline`,
              type: 'info',
              title: 'Scadenza Vicina',
              message: `"${obj.title}" scade tra ${daysRemaining} giorn${daysRemaining === 1 ? 'o' : 'i'}`,
              objectiveId: obj.id,
              timestamp: new Date(),
            });
          }
        }
      });

      // Sort by type priority: critical > warning > info
      generatedNotifications.sort((a, b) => {
        const priority = { critical: 0, warning: 1, info: 2 };
        return priority[a.type] - priority[b.type];
      });

      setNotifications(generatedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update ref so SSE callback can call fetchNotifications
  fetchNotificationsRef.current = fetchNotifications;

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for SSE real-time notifications
  useEffect(() => {
    const handleSSE = () => {
      fetchNotificationsRef.current();
    };
    window.addEventListener('sse-notification', handleSSE);
    return () => window.removeEventListener('sse-notification', handleSSE);
  }, []);

  // Listen for OKR updates to refresh notifications
  useEffect(() => {
    const handleOkrUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener('okr-updated', handleOkrUpdate);
    return () => window.removeEventListener('okr-updated', handleOkrUpdate);
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: Notification['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onSelectOKR) {
      onSelectOKR(notification.objectiveId);
    }
    setIsOpen(false);
  };

  const criticalCount = visibleNotifications.filter(n => n.type === 'critical').length;
  const totalCount = visibleNotifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm dark:shadow-gray-900/20 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold text-white rounded-full px-1 ${
            criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'
          }`}>
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/30 border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifiche</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-500 dark:text-slate-400 dark:text-slate-500">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full mx-auto mb-2" />
                Caricamento...
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-slate-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600 dark:text-slate-400" />
                <p>Nessuna notifica</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tutti gli OKR sono in linea!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {visibleNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left ${getNotificationBg(notification.type)} border-l-4`}
                  >
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="flex-1 flex items-start gap-3 min-w-0"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{notification.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{notification.message}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </button>
                    <button
                      onClick={(e) => dismissNotification(e, notification.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Rimuovi notifica"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {visibleNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {criticalCount > 0 && (
                  <span className="text-red-600 font-medium">{criticalCount} critici</span>
                )}
                {criticalCount > 0 && visibleNotifications.filter(n => n.type === 'warning').length > 0 && ' · '}
                {visibleNotifications.filter(n => n.type === 'warning').length > 0 && (
                  <span className="text-amber-600 font-medium">
                    {visibleNotifications.filter(n => n.type === 'warning').length} a rischio
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
