/**
 * Team Routes - API endpoints for Teams and Invitations
 */
import { Router } from 'express';
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  createInvitation,
  getTeamInvitations,
  getPendingInvitationsForUser,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  resendInvitation,
  searchUsers,
  addMemberDirectly,
  getInvitationByToken,
  registerFromInvitation
} from './team.service.js';

export function createTeamRoutes(config) {
  const router = Router();
  const { pool, authMiddleware, emailService, frontendUrl, hashPassword, generateJWT } = config;

  // === PUBLIC ROUTES (no auth required) ===

  // Get invitation details by token (public)
  router.get('/invitations/:token/details', async (req, res, next) => {
    try {
      const invitation = await getInvitationByToken(pool, req.params.token);
      if (!invitation) {
        return res.status(404).json({ error: 'Invalid or expired invitation' });
      }
      res.json(invitation);
    } catch (error) {
      next(error);
    }
  });

  // Register from invitation (public)
  router.post('/invitations/:token/register', async (req, res, next) => {
    try {
      const { name, password } = req.body;

      if (!name || !password) {
        return res.status(400).json({ error: 'Name and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const result = await registerFromInvitation(pool, req.params.token, { name, password }, {
        hashPassword
      });

      // Generate JWT token for the new user
      const token = generateJWT(result.user.id);

      res.json({
        success: true,
        token,
        user: result.user,
        teamId: result.teamId,
        teamName: result.teamName
      });
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // === PROTECTED ROUTES (auth required) ===
  router.use(authMiddleware);

  // === TEAMS ===

  // Get all teams for current user (admin sees all teams)
  router.get('/', async (req, res, next) => {
    try {
      const teams = await getTeams(pool, req.user.id, req.user.role);
      res.json(teams);
    } catch (error) {
      next(error);
    }
  });

  // Get single team
  router.get('/:id', async (req, res, next) => {
    try {
      const team = await getTeamById(pool, req.params.id, req.user.id);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      res.json(team);
    } catch (error) {
      next(error);
    }
  });

  // Create team (admin or lead only)
  router.post('/', async (req, res, next) => {
    try {
      // Only admin and lead can create teams
      if (!['admin', 'lead'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Solo amministratori e lead possono creare team' });
      }

      let leadId;

      if (req.user.role === 'lead') {
        // Lead creates team for themselves
        leadId = req.user.id;
      } else {
        // Admin must assign a lead
        if (!req.body.leadId) {
          return res.status(400).json({ error: 'È necessario assegnare un lead al team' });
        }
        // Admin cannot create a team for themselves
        if (req.body.leadId === req.user.id) {
          return res.status(400).json({ error: 'Non puoi creare un team per te stesso' });
        }
        leadId = req.body.leadId;
      }

      const team = await createTeam(pool, req.body, leadId);
      res.status(201).json(team);
    } catch (error) {
      next(error);
    }
  });

  // Update team
  router.put('/:id', async (req, res, next) => {
    try {
      const team = await updateTeam(pool, req.params.id, req.body, req.user.id);
      res.json(team);
    } catch (error) {
      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // Delete team
  router.delete('/:id', async (req, res, next) => {
    try {
      const deleted = await deleteTeam(pool, req.params.id, req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Team not found' });
      }
      res.status(204).send();
    } catch (error) {
      if (error.message.includes('Only team owner')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // === TEAM MEMBERS ===

  // Get team members
  router.get('/:id/members', async (req, res, next) => {
    try {
      const members = await getTeamMembers(pool, req.params.id, req.user.id);
      res.json(members);
    } catch (error) {
      if (error.message.includes('Not a member')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // Update member role
  router.put('/:teamId/members/:memberId', async (req, res, next) => {
    try {
      const result = await updateMemberRole(
        pool,
        req.params.teamId,
        req.params.memberId,
        req.body.role,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      if (error.message.includes('Not authorized') || error.message.includes('Cannot change')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // Remove member
  router.delete('/:teamId/members/:memberId', async (req, res, next) => {
    try {
      const deleted = await removeMember(
        pool,
        req.params.teamId,
        req.params.memberId,
        req.user.id
      );
      if (!deleted) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.status(204).send();
    } catch (error) {
      if (error.message.includes('Not authorized') || error.message.includes('Cannot remove')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // Search users to add to team
  router.get('/:id/users/search', async (req, res, next) => {
    try {
      const query = req.query.q || '';
      if (query.length < 2) {
        return res.json([]);
      }
      const users = await searchUsers(pool, query, req.params.id, req.user.id);
      res.json(users);
    } catch (error) {
      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // Add member directly (without invitation)
  router.post('/:id/members', async (req, res, next) => {
    try {
      const member = await addMemberDirectly(
        pool,
        req.params.id,
        req.body.userId,
        req.body.role,
        req.user.id
      );
      res.status(201).json(member);
    } catch (error) {
      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('already a team member')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  });

  // === INVITATIONS ===

  // Get pending invitations for a team
  router.get('/:id/invitations', async (req, res, next) => {
    try {
      const invitations = await getTeamInvitations(pool, req.params.id, req.user.id);
      res.json(invitations);
    } catch (error) {
      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // Create invitation
  router.post('/:id/invitations', async (req, res, next) => {
    try {
      const invitation = await createInvitation(
        pool,
        req.params.id,
        req.body,
        req.user.id,
        { emailService, frontendUrl }
      );
      res.status(201).json(invitation);
    } catch (error) {
      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('already')) {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  });

  // Cancel invitation
  router.delete('/invitations/:invitationId', async (req, res, next) => {
    try {
      const cancelled = await cancelInvitation(pool, req.params.invitationId, req.user.id);
      if (!cancelled) {
        return res.status(404).json({ error: 'Invitation not found' });
      }
      res.status(204).send();
    } catch (error) {
      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  });

  // Resend invitation
  router.post('/invitations/:invitationId/resend', async (req, res, next) => {
    try {
      const result = await resendInvitation(
        pool,
        req.params.invitationId,
        req.user.id,
        { emailService, frontendUrl }
      );
      res.json(result);
    } catch (error) {
      if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found') || error.message.includes('not configured')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Get my pending invitations
  router.get('/invitations/pending', async (req, res, next) => {
    try {
      const invitations = await getPendingInvitationsForUser(pool, req.user.email);
      res.json(invitations);
    } catch (error) {
      next(error);
    }
  });

  // Accept invitation
  router.post('/invitations/:token/accept', async (req, res, next) => {
    try {
      const result = await acceptInvitation(pool, req.params.token, req.user.id);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('different email')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // Decline invitation
  router.post('/invitations/:token/decline', async (req, res, next) => {
    try {
      const result = await declineInvitation(pool, req.params.token, req.user.id);
      res.json(result);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('different email')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  return router;
}
