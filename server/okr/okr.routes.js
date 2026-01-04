/**
 * OKR Routes - API endpoints for Objectives and Key Results
 */
import { Router } from 'express';
import {
  getObjectives,
  getObjectiveById,
  createObjective,
  updateObjective,
  deleteObjective,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
  getStats,
  getProgressHistory,
  getUserDataCount,
  reassignUserOKRs
} from './okr.service.js';

export function createOKRRoutes(config) {
  const router = Router();
  const { pool, authMiddleware, requireAdmin } = config;

  // All routes require authentication
  router.use(authMiddleware);

  // === OBJECTIVES ===

  // Get all objectives (with optional filters)
  router.get('/objectives', async (req, res, next) => {
    try {
      const { level, period, status, mine } = req.query;
      const filters = { level, period, status };

      // If 'mine' query param or user is not admin, filter by owner
      if (mine === 'true' || req.user.role !== 'admin') {
        filters.ownerId = req.user.id;
      }

      const objectives = await getObjectives(pool, filters);
      res.json(objectives);
    } catch (error) {
      next(error);
    }
  });

  // Get single objective
  router.get('/objectives/:id', async (req, res, next) => {
    try {
      const objective = await getObjectiveById(pool, req.params.id);
      if (!objective) {
        return res.status(404).json({ error: 'Objective not found' });
      }
      res.json(objective);
    } catch (error) {
      next(error);
    }
  });

  // Create objective
  router.post('/objectives', async (req, res, next) => {
    try {
      const objective = await createObjective(pool, req.body, req.user.id);
      res.status(201).json(objective);
    } catch (error) {
      next(error);
    }
  });

  // Update objective
  router.put('/objectives/:id', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Only owner or admin can update
      if (existing.ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this objective' });
      }

      const objective = await updateObjective(pool, req.params.id, req.body, req.user.id);
      res.json(objective);
    } catch (error) {
      next(error);
    }
  });

  // Delete objective
  router.delete('/objectives/:id', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Only owner or admin can delete
      if (existing.ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this objective' });
      }

      await deleteObjective(pool, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // === KEY RESULTS ===

  // Add key result to objective
  router.post('/objectives/:id/key-results', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      if (existing.ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const keyResult = await createKeyResult(pool, req.params.id, req.body, req.user.id);
      res.status(201).json(keyResult);
    } catch (error) {
      next(error);
    }
  });

  // Update key result
  router.put('/key-results/:id', async (req, res, next) => {
    try {
      const keyResult = await updateKeyResult(pool, req.params.id, req.body, req.user.id);
      if (!keyResult) {
        return res.status(404).json({ error: 'Key result not found' });
      }
      res.json(keyResult);
    } catch (error) {
      next(error);
    }
  });

  // Delete key result
  router.delete('/key-results/:id', async (req, res, next) => {
    try {
      const deleted = await deleteKeyResult(pool, req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Key result not found' });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // === ANALYTICS ===

  // Get dashboard stats
  router.get('/stats', async (req, res, next) => {
    try {
      const isAdmin = req.user.role === 'admin';
      const stats = await getStats(pool, req.user.id, isAdmin);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // Get progress history for an objective
  router.get('/objectives/:id/history', async (req, res, next) => {
    try {
      const history = await getProgressHistory(pool, req.params.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  // === ADMIN ENDPOINTS ===

  // Get user's data count (for deletion warning)
  router.get('/admin/users/:userId/data-count', requireAdmin, async (req, res, next) => {
    try {
      const counts = await getUserDataCount(pool, req.params.userId);
      res.json(counts);
    } catch (error) {
      next(error);
    }
  });

  // Reassign all OKRs from one user to another
  router.post('/admin/users/:userId/reassign-okrs', requireAdmin, async (req, res, next) => {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: 'targetUserId is required' });
      }

      const result = await reassignUserOKRs(pool, req.params.userId, targetUserId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
