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
  pauseObjective,
  resumeObjective,
  stopObjective,
  reopenObjective,
  archiveObjective,
  revertToDraft,
  autoFailExpiredObjectives,
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
  const { pool, authMiddleware, requireAdmin, checkOKRLimit, checkKeyResultLimit } = config;

  // All routes require authentication
  router.use(authMiddleware);

  // Get users that can be assigned OKRs (accessible to lead and admin)
  // Multi-tenant: filters by company_id to show only users from same company
  router.get('/assignable-users', async (req, res, next) => {
    try {
      const userRole = req.user.role || 'user';
      const companyId = req.user.company_id;

      // Only admin and lead can assign to others
      if (userRole === 'user') {
        // User can only see themselves
        return res.json([{
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        }]);
      }

      if (userRole === 'lead') {
        // Lead can only assign to users (not to other leads or admins)
        // Filter by company_id for tenant isolation
        const { rows } = await pool.query(
          `SELECT id, name, email, role FROM users
           WHERE role = 'user' AND ($1::uuid IS NULL OR company_id = $1)
           ORDER BY name`,
          [companyId]
        );
        res.json(rows);
      } else {
        // Admin can see all users within the same company
        const { rows } = await pool.query(
          `SELECT id, name, email, role FROM users
           WHERE $1::uuid IS NULL OR company_id = $1
           ORDER BY name`,
          [companyId]
        );
        res.json(rows);
      }
    } catch (error) {
      next(error);
    }
  });

  // === OBJECTIVES ===

  // Get all objectives (with optional filters)
  // Multi-tenant: filters by company_id for tenant isolation
  router.get('/objectives', async (req, res, next) => {
    try {
      // Auto-fail expired objectives before fetching
      await autoFailExpiredObjectives(pool);

      const { level, period, status, mine } = req.query;
      const filters = { level, period, status };

      // Multi-tenant: filter by company_id
      if (req.user.company_id) {
        filters.companyId = req.user.company_id;
      }

      // If 'mine' query param or user is not admin, filter by user (owner OR contributor)
      if (mine === 'true' || req.user.role !== 'admin') {
        filters.userId = req.user.id;
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
      const { level, ownerId } = req.body;
      const userRole = req.user.role || 'user';

      // Permission check based on role and level
      // Admin: can create all levels (company, team, individual)
      // Lead: can create team and individual only
      // User: can create individual only
      const allowedLevels = {
        admin: ['company', 'team', 'individual'],
        lead: ['team', 'individual'],
        user: ['individual']
      };

      const userAllowedLevels = allowedLevels[userRole] || allowedLevels.user;
      if (!userAllowedLevels.includes(level)) {
        return res.status(403).json({
          error: `Non hai i permessi per creare obiettivi di livello "${level}". Livelli consentiti: ${userAllowedLevels.join(', ')}`
        });
      }

      // Assignment permission check
      // Admin: can assign to anyone
      // Lead: can assign to anyone for individual OKRs
      // User: can only assign to themselves
      if (ownerId && ownerId !== req.user.id) {
        if (userRole === 'user') {
          return res.status(403).json({
            error: 'Non hai i permessi per assegnare OKR ad altri utenti'
          });
        }
        // Lead can only assign individual OKRs to others
        if (userRole === 'lead' && level !== 'individual') {
          return res.status(403).json({
            error: 'Come Lead puoi assegnare ad altri utenti solo OKR individuali'
          });
        }
      }

      // Check subscription limits for OKR creation
      if (checkOKRLimit) {
        const companyId = req.user.company_id || req.user.id;
        const limitCheck = await checkOKRLimit(pool, companyId, req.user.id, userRole);
        if (!limitCheck.allowed) {
          return res.status(403).json({
            error: limitCheck.error,
            usage: limitCheck.usage,
            limits: limitCheck.limits
          });
        }

        // Check KR limit for KRs being created with the OKR
        const { keyResults = [] } = req.body;
        if (limitCheck.limits && keyResults.length > limitCheck.limits.krsPerOkr) {
          return res.status(403).json({
            error: `Puoi creare massimo ${limitCheck.limits.krsPerOkr} Key Results per OKR nel piano Free.`,
            limits: limitCheck.limits
          });
        }
      }

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

      // Check if user is owner, admin, or contributor
      const isOwner = existing.ownerId === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const contributors = await getContributors(pool, req.params.id);
      const isContributor = contributors.some(c => c.userId === req.user.id);

      if (!isOwner && !isAdmin && !isContributor) {
        return res.status(403).json({ error: 'Not authorized to update this objective' });
      }

      // Check level permission if level is being changed
      const { level } = req.body;
      if (level) {
        const userRole = req.user.role || 'user';
        const allowedLevels = {
          admin: ['company', 'team', 'individual'],
          lead: ['team', 'individual'],
          user: ['individual']
        };
        const userAllowedLevels = allowedLevels[userRole] || allowedLevels.user;
        if (!userAllowedLevels.includes(level)) {
          return res.status(403).json({
            error: `Non hai i permessi per impostare il livello "${level}". Livelli consentiti: ${userAllowedLevels.join(', ')}`
          });
        }
      }

      const objective = await updateObjective(pool, req.params.id, req.body, req.user.id);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
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

      // Only owner or admin can delete (contributors cannot)
      const isOwner = existing.ownerId === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this objective' });
      }

      await deleteObjective(pool, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
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

      // Check if user is owner, admin, or contributor
      const isOwner = existing.ownerId === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const contributors = await getContributors(pool, req.params.id);
      const isContributor = contributors.some(c => c.userId === req.user.id);

      if (!isOwner && !isAdmin && !isContributor) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check subscription limits for Key Result creation
      if (checkKeyResultLimit) {
        const companyId = req.user.company_id || req.user.id;
        const limitCheck = await checkKeyResultLimit(pool, companyId, req.params.id);
        if (!limitCheck.allowed) {
          return res.status(403).json({
            error: limitCheck.error,
            usage: limitCheck.usage,
            limits: limitCheck.limits
          });
        }
      }

      const keyResult = await createKeyResult(pool, req.params.id, req.body, req.user.id);
      res.status(201).json(keyResult);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
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
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
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
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // === ANALYTICS ===

  // Get dashboard stats
  // Multi-tenant: filters stats by company_id
  router.get('/stats', async (req, res, next) => {
    try {
      const isAdmin = req.user.role === 'admin';
      const companyId = req.user.company_id || null;
      const stats = await getStats(pool, req.user.id, isAdmin, companyId);
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
  // Multi-tenant: filters by company_id
  router.get('/hierarchy', async (req, res, next) => {
    try {
      const { period } = req.query;
      const companyId = req.user.company_id || null;
      const hierarchy = await getObjectiveHierarchy(pool, { period, companyId });
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

  // Activate approved objective (admin only)
  router.post('/objectives/:id/activate', async (req, res, next) => {
    try {
      // Only admin can activate
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo gli amministratori possono attivare gli OKR' });
      }

      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
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

  // Pause an active objective (admin only)
  router.post('/objectives/:id/pause', async (req, res, next) => {
    try {
      // Only admin can pause
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo gli amministratori possono sospendere gli OKR' });
      }

      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      const objective = await pauseObjective(pool, req.params.id, req.user.id, req.body.comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Resume a paused objective (admin only)
  router.post('/objectives/:id/resume', async (req, res, next) => {
    try {
      // Only admin can resume
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo gli amministratori possono riprendere gli OKR' });
      }

      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      const objective = await resumeObjective(pool, req.params.id, req.user.id, req.body.comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Stop an objective permanently (admin only)
  router.post('/objectives/:id/stop', async (req, res, next) => {
    try {
      // Only admin can stop
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo gli amministratori possono fermare gli OKR' });
      }

      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      const objective = await stopObjective(pool, req.params.id, req.user.id, req.body.comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Reopen a closed or failed objective (admin only)
  router.post('/objectives/:id/reopen', async (req, res, next) => {
    try {
      // Only admin can reopen
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo gli amministratori possono riaprire gli OKR' });
      }

      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      const objective = await reopenObjective(pool, req.params.id, req.user.id, req.body.comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Archive a stopped objective
  router.post('/objectives/:id/archive', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Check if user is owner, admin, or contributor
      const isOwner = existing.ownerId === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const contributors = await getContributors(pool, req.params.id);
      const isContributor = contributors.some(c => c.userId === req.user.id);

      if (!isOwner && !isAdmin && !isContributor) {
        return res.status(403).json({ error: 'Not authorized to archive this objective' });
      }

      const objective = await archiveObjective(pool, req.params.id, req.user.id, req.body.comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Revert an objective to draft (from pending_review or approved)
  router.post('/objectives/:id/revert-to-draft', async (req, res, next) => {
    try {
      const existing = await getObjectiveById(pool, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      // Check if user is owner, admin, or contributor
      const isOwner = existing.ownerId === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const contributors = await getContributors(pool, req.params.id);
      const isContributor = contributors.some(c => c.userId === req.user.id);

      if (!isOwner && !isAdmin && !isContributor) {
        return res.status(403).json({ error: 'Not authorized to revert this objective' });
      }

      const objective = await revertToDraft(pool, req.params.id, req.user.id, req.body.comment);
      res.json(objective);
    } catch (error) {
      if (error.message.includes('Non è possibile')) {
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
