/**
 * Server-Sent Events (SSE) Notification Service
 * Manages real-time notifications to connected clients
 */

// Store connected clients by user ID
// Map<userId, Set<response>>
const connectedClients = new Map();

// Store connected clients by company ID for broadcast
// Map<companyId, Set<{userId, res}>>
const companyClients = new Map();

/**
 * Add a client connection
 */
export function addClient(userId, companyId, res) {
  // Add to user-specific clients
  if (!connectedClients.has(userId)) {
    connectedClients.set(userId, new Set());
  }
  connectedClients.get(userId).add(res);

  // Add to company-wide clients
  if (companyId) {
    if (!companyClients.has(companyId)) {
      companyClients.set(companyId, new Set());
    }
    companyClients.get(companyId).add({ userId, res });
  }

  console.log(`[SSE] Client connected: user=${userId}, company=${companyId}. Total connections: ${getTotalConnections()}`);
}

/**
 * Remove a client connection
 */
export function removeClient(userId, companyId, res) {
  // Remove from user-specific clients
  if (connectedClients.has(userId)) {
    connectedClients.get(userId).delete(res);
    if (connectedClients.get(userId).size === 0) {
      connectedClients.delete(userId);
    }
  }

  // Remove from company-wide clients
  if (companyId && companyClients.has(companyId)) {
    const companySet = companyClients.get(companyId);
    for (const client of companySet) {
      if (client.res === res) {
        companySet.delete(client);
        break;
      }
    }
    if (companySet.size === 0) {
      companyClients.delete(companyId);
    }
  }

  console.log(`[SSE] Client disconnected: user=${userId}. Total connections: ${getTotalConnections()}`);
}

/**
 * Get total number of connections
 */
function getTotalConnections() {
  let total = 0;
  for (const clients of connectedClients.values()) {
    total += clients.size;
  }
  return total;
}

/**
 * Send notification to a specific user
 */
export function sendToUser(userId, event, data) {
  const clients = connectedClients.get(userId);
  if (!clients || clients.size === 0) {
    console.log(`[SSE] No connected clients for user ${userId}`);
    return false;
  }

  const message = formatSSEMessage(event, data);
  let sent = 0;

  for (const res of clients) {
    try {
      res.write(message);
      sent++;
    } catch (error) {
      console.error(`[SSE] Error sending to user ${userId}:`, error);
    }
  }

  console.log(`[SSE] Sent "${event}" to user ${userId} (${sent} connections)`);
  return sent > 0;
}

/**
 * Send notification to all users in a company
 */
export function sendToCompany(companyId, event, data, excludeUserId = null) {
  const clients = companyClients.get(companyId);
  if (!clients || clients.size === 0) {
    console.log(`[SSE] No connected clients for company ${companyId}`);
    return false;
  }

  const message = formatSSEMessage(event, data);
  let sent = 0;

  for (const { userId, res } of clients) {
    if (excludeUserId && userId === excludeUserId) continue;
    try {
      res.write(message);
      sent++;
    } catch (error) {
      console.error(`[SSE] Error sending to company ${companyId}:`, error);
    }
  }

  console.log(`[SSE] Sent "${event}" to company ${companyId} (${sent} connections)`);
  return sent > 0;
}

/**
 * Send notification to all admins in a company
 */
export function sendToAdmins(companyId, event, data, pool) {
  // This would require knowing which connected users are admins
  // For simplicity, we broadcast to the company and let the client filter
  return sendToCompany(companyId, event, data);
}

/**
 * Format SSE message
 */
function formatSSEMessage(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Send a heartbeat to keep connections alive
 */
export function sendHeartbeat() {
  const message = `: heartbeat\n\n`;

  for (const clients of connectedClients.values()) {
    for (const res of clients) {
      try {
        res.write(message);
      } catch (error) {
        // Client disconnected, will be cleaned up
      }
    }
  }
}

// Send heartbeat every 30 seconds to keep connections alive
setInterval(sendHeartbeat, 30000);

/**
 * Notification types
 */
export const NotificationTypes = {
  OKR_REJECTED: 'okr_rejected',
  OKR_APPROVED: 'okr_approved',
  OKR_SUBMITTED: 'okr_submitted',
  OKR_ACTIVATED: 'okr_activated',
  OKR_UPDATED: 'okr_updated',
  OKR_DELETED: 'okr_deleted',
  REFRESH_NOTIFICATIONS: 'refresh_notifications'
};

export default {
  addClient,
  removeClient,
  sendToUser,
  sendToCompany,
  sendToAdmins,
  sendHeartbeat,
  NotificationTypes
};
