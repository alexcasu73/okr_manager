/**
 * SSE Routes - Server-Sent Events endpoint for real-time notifications
 */
import { Router } from 'express';
import { addClient, removeClient } from './sse.service.js';

export function createSSERoutes(config) {
  const router = Router();
  const { authMiddleware, verifyToken } = config;

  // SSE endpoint for real-time notifications
  // Note: EventSource doesn't support custom headers, so we accept token as query param
  router.get('/stream', async (req, res, next) => {
    try {
      // Check for token in query string (for EventSource)
      const token = req.query.token;
      if (token) {
        // Verify token manually
        const user = await verifyToken(token);
        if (user) {
          req.user = user;
        } else {
          return res.status(401).json({ error: 'Invalid token' });
        }
      } else {
        // Fall back to standard auth middleware
        return authMiddleware(req, res, next);
      }
    } catch (error) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial connection success message
    res.write(`event: connected\ndata: ${JSON.stringify({ userId, timestamp: new Date().toISOString() })}\n\n`);

    // Add client to connected clients
    addClient(userId, companyId, res);

    // Handle client disconnect
    req.on('close', () => {
      removeClient(userId, companyId, res);
    });

    // Handle errors
    req.on('error', (error) => {
      console.error('[SSE] Request error:', error);
      removeClient(userId, companyId, res);
    });
  });

  return router;
}

export default createSSERoutes;
