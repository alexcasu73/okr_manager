/**
 * Global SSE Service - Single connection shared across all components
 */
import { getAuthToken } from '../api/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export type SSEEventType =
  | 'okr_rejected'
  | 'okr_approved'
  | 'okr_submitted'
  | 'okr_activated'
  | 'okr_updated'
  | 'okr_deleted';

let eventSource: EventSource | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;

export function connectSSE() {
  if (isConnecting || eventSource?.readyState === EventSource.OPEN) {
    return;
  }

  const token = getAuthToken();
  if (!token) {
    console.log('[SSE] No auth token, skipping connection');
    return;
  }

  isConnecting = true;

  // Close existing connection
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;

  try {
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      isConnecting = false;
    };

    eventSource.onerror = () => {
      console.log('[SSE] Connection error, will reconnect...');
      isConnecting = false;

      if (eventSource?.readyState === EventSource.CLOSED) {
        eventSource = null;
        // Reconnect after 5 seconds
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    eventSource.addEventListener('connected', () => {
      console.log('[SSE] Connection confirmed');
    });

    // Handle all notification events
    const eventTypes: SSEEventType[] = [
      'okr_rejected',
      'okr_approved',
      'okr_submitted',
      'okr_activated',
      'okr_updated',
      'okr_deleted'
    ];

    eventTypes.forEach(type => {
      eventSource!.addEventListener(type, (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          console.log('[SSE] Event received:', type, data);

          // Dispatch custom window event that components can listen to
          window.dispatchEvent(new CustomEvent('sse-notification', {
            detail: { type, data }
          }));
        } catch (error) {
          console.error('[SSE] Error parsing event:', error);
        }
      });
    });

  } catch (error) {
    console.error('[SSE] Failed to create EventSource:', error);
    isConnecting = false;
  }
}

export function disconnectSSE() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  isConnecting = false;
}

// Auto-connect when token changes
window.addEventListener('storage', (e) => {
  if (e.key === 'authToken') {
    if (e.newValue) {
      connectSSE();
    } else {
      disconnectSSE();
    }
  }
});
