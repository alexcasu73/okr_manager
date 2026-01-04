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
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch OKRs and generate notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const objectives = await okrAPI.getObjectives();
        const generatedNotifications: Notification[] = [];

        objectives.forEach((obj: Objective) => {
          // Check for critical/off-track OKRs
          if (obj.status === 'off-track' || obj.healthMetrics?.riskLevel === 'critical') {
            generatedNotifications.push({
              id: `${obj.id}-critical`,
              type: 'critical',
              title: 'OKR Critico',
              message: `"${obj.title}" richiede attenzione urgente`,
              objectiveId: obj.id,
              timestamp: new Date(),
            });
          }
          // Check for at-risk OKRs
          else if (obj.status === 'at-risk' || obj.healthMetrics?.riskLevel === 'high') {
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
          if (obj.dueDate) {
            const dueDate = new Date(obj.dueDate);
            const now = new Date();
            const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysRemaining > 0 && daysRemaining <= 7 && obj.progress < 80 && obj.status !== 'completed') {
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

    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
        return 'bg-red-50 border-red-100';
      case 'warning':
        return 'bg-amber-50 border-amber-100';
      case 'info':
        return 'bg-blue-50 border-blue-100';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onSelectOKR) {
      onSelectOKR(notification.objectiveId);
    }
    setIsOpen(false);
  };

  const criticalCount = notifications.filter(n => n.type === 'critical').length;
  const totalCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white p-3 rounded-xl shadow-sm text-gray-500 hover:text-gray-900 transition-colors"
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
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifiche</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-2" />
                Caricamento...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Nessuna notifica</p>
                <p className="text-xs text-gray-400 mt-1">Tutti gli OKR sono in linea!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${getNotificationBg(notification.type)} border-l-4`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                {criticalCount > 0 && (
                  <span className="text-red-600 font-medium">{criticalCount} critici</span>
                )}
                {criticalCount > 0 && notifications.filter(n => n.type === 'warning').length > 0 && ' · '}
                {notifications.filter(n => n.type === 'warning').length > 0 && (
                  <span className="text-amber-600 font-medium">
                    {notifications.filter(n => n.type === 'warning').length} a rischio
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
