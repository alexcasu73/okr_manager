/**
 * React Hook for Server-Sent Events (SSE) real-time notifications
 */
import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '../api/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export type SSEEventType =
  | 'connected'
  | 'okr_rejected'
  | 'okr_approved'
  | 'okr_submitted'
  | 'okr_activated'
  | 'okr_updated'
  | 'okr_deleted'
  | 'refresh_notifications';

export interface SSENotification {
  type: SSEEventType;
  data: {
    objectiveId?: string;
    title?: string;
    comment?: string;
    ownerName?: string;
    timestamp: string;
  };
}

interface UseSSEOptions {
  onNotification?: (notification: SSENotification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export function useSSE(options: UseSSEOptions = {}) {
  const { enabled = true } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid re-creating connection on every render
  const onNotificationRef = useRef(options.onNotification);
  const onConnectRef = useRef(options.onConnect);
  const onDisconnectRef = useRef(options.onDisconnect);
  const onErrorRef = useRef(options.onError);

  // Update refs when callbacks change
  useEffect(() => {
    onNotificationRef.current = options.onNotification;
    onConnectRef.current = options.onConnect;
    onDisconnectRef.current = options.onDisconnect;
    onErrorRef.current = options.onError;
  });

  useEffect(() => {
    if (!enabled) return;

    const token = getAuthToken();
    if (!token) return;

    const connect = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;

      try {
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[SSE] Connected to notification stream');
          setIsConnected(true);
          onConnectRef.current?.();
        };

        eventSource.onerror = (event) => {
          console.error('[SSE] Connection error:', event);
          setIsConnected(false);
          onErrorRef.current?.(event);
          onDisconnectRef.current?.();

          if (eventSource.readyState === EventSource.CLOSED) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[SSE] Attempting to reconnect...');
              connect();
            }, 5000);
          }
        };

        eventSource.addEventListener('connected', (event) => {
          const data = JSON.parse((event as MessageEvent).data);
          console.log('[SSE] Connection confirmed:', data);
        });

        const handleEvent = (type: SSEEventType) => (event: Event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            const notification: SSENotification = { type, data };
            console.log('[SSE] Notification received:', type, data);
            onNotificationRef.current?.(notification);
          } catch (error) {
            console.error('[SSE] Error parsing event:', error);
          }
        };

        eventSource.addEventListener('okr_rejected', handleEvent('okr_rejected'));
        eventSource.addEventListener('okr_approved', handleEvent('okr_approved'));
        eventSource.addEventListener('okr_submitted', handleEvent('okr_submitted'));
        eventSource.addEventListener('okr_activated', handleEvent('okr_activated'));
        eventSource.addEventListener('okr_updated', handleEvent('okr_updated'));
        eventSource.addEventListener('okr_deleted', handleEvent('okr_deleted'));
        eventSource.addEventListener('refresh_notifications', handleEvent('refresh_notifications'));

      } catch (error) {
        console.error('[SSE] Failed to create EventSource:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled]);

  return { isConnected };
}

export default useSSE;
