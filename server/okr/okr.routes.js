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
  reassignUserOKRs,
  // Hierarchy functions
  getObjectiveChildren,
  getAvailableParents,
  getObjectiveHierarchy,
  getObjectiveWithAncestors,
  // Approval workflow functions
  submitForReview,
  approveObjective,
  rejectObjective,
  activateObjective,
  getApprovalHistory,
  getPendingApprovals,
  // Contributors functions
  getContributors,
  addContributor,
  removeContributor,
  updateContributorRole,
  getMyContributions
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

  // === HIERARCHY ENDPOINTS ===

  // Get full hierarchy tree
  router.get('/hierarchy', async (req, res, next) => {
    try {
      const { period } = req.query;
      const hierarchy = await getObjectiveHierarchy(pool, { period });
      res.json(hierarchy);
    } catch (error) {
      next(error);
    }
  });

  // Get available parent objectives for a given level
  router.get('/available-parents', async (req, res, next) => {
    try {
      const { level, excludeId } = req.query;
      if (!level) {
        return res.status(400).json({ error: 'level query parameter is required' });
      }
      const parents = await getAvailableParents(pool, level, excludeId);
      res.json(parents);
    } catch (error) {
      next(error);
    }
  });

  // Get children of an objective
  router.get('/objectives/:id/children', async (req, res, next) => {
    try {
      const children = await getObjectiveChildren(pool, req.params.id);
      res.json(children);
    } catch (error) {
      next(error);
    }
  });

  // Get objective with ancestors (breadcrumb)
  router.get('/objectives/:id/ancestors', async (req, res, next) => {
    try {
      const result = await getObjectiveWithAncestors(pool, req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Objective not found' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // === APPROVAL WORKFLOW ENDPOINTS ===

  // Get objectives pending approval
  router.get('/pending-approvals', async (req, res, next) => {
    try {
      const isAdmin = req.user.role === 'admin';
      const objectives = await getPendingApprovals(pool, req.user.id, isAdmin);
      res.json(objectives);
    } catch (error) {
      next(error);
    }
  });

  // Submit objective for review
  router.post('/objectives/:id/submit-for-review', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Only owner can submit for review
      if (existing.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Only the owner can submit for review' });
      }

      const objective = await submitForReview(pool, req.params.id, req.user.id);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Cannot submit')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Approve objective
  router.post('/objectives/:id/approve', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Only admin can approve (for now, can be extended to managers)
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can approve objectives' });
      }

      const { comment } = req.body;
      const objective = await approveObjective(pool, req.params.id, req.user.id, comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Cannot approve')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Reject objective
  router.post('/objectives/:id/reject', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Only admin can reject (for now, can be extended to managers)
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can reject objectives' });
      }

      const { comment } = req.body;
      if (!comment) {
        return res.status(400).json({ error: 'Comment is required when rejecting' });
      }

      const objective = await rejectObjective(pool, req.params.id, req.user.id, comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Cannot reject')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Activate approved objective
  router.post('/objectives/:id/activate', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Owner or admin can activate
      if (existing.ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to activate this objective' });
      }

      const objective = await activateObjective(pool, req.params.id, req.user.id);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Cannot activate')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Get approval history for an objective
  router.get('/objectives/:id/approval-history', async (req, res, next) => {
    try {
      const history = await getApprovalHistory(pool, req.params.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  // === CONTRIBUTORS ENDPOINTS ===

  // Get my contributions (OKRs where I'm a contributor)
  router.get('/my-contributions', async (req, res, next) => {
    try {
      const contributions = await getMyContributions(pool, req.user.id);
      res.json(contributions);
    } catch (error) {
      next(error);
    }
  });

  // Get contributors for an objective
  router.get('/objectives/:id/contributors', async (req, res, next) => {
    try {
      const contributors = await getContributors(pool, req.params.id);
      res.json(contributors);
    } catch (error) {
      next(error);
    }
  });

  // Add contributor to objective
  router.post('/objectives/:id/contributors', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Only owner or admin can add contributors
      if (existing.ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to add contributors' });
      }

      const { userId, role = 'contributor' } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const contributor = await addContributor(pool, req.params.id, userId, role);
      res.status(201).json(contributor);
    } catch (error) {
      if (error.message.includes('already a contributor') || error.message.includes('cannot be added')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Remove contributor from objective
  router.delete('/objectives/:id/contributors/:contributorId', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Only owner or admin can remove contributors
      if (existing.ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to remove contributors' });
      }

      const deleted = await removeContributor(pool, req.params.id, req.params.contributorId);
      if (!deleted) {
        return res.status(404).json({ error: 'Contributor not found' });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Update contributor role
  router.put('/contributors/:contributorId', async (req, res, next) => {
    try {
      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ error: 'role is required' });
      }

      const contributor = await updateContributorRole(pool, req.params.contributorId, role);
      if (!contributor) {
        return res.status(404).json({ error: 'Contributor not found' });
      }
      res.json(contributor);
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
