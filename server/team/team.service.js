/**
 * Team Service - Business logic for Teams and Invitations
 */
import crypto from 'crypto';

// Generate a secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate invitation email HTML
function getInvitationEmailHtml(inviterName, teamName, role, inviteUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .logo { color: #3B82F6; font-size: 24px; font-weight: bold; }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #3B82F6;
          color: white !important;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
        }
        .info-box {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">OKR Manager</div>
        </div>
        <h2>You've been invited to join a team!</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${role}</strong>.</p>
        <div class="info-box">
          <p><strong>Team:</strong> ${teamName}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Invited by:</strong> ${inviterName}</p>
        </div>
        <p style="text-align: center;">
          <a href="${inviteUrl}" class="button">Accept Invitation</a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
        <p><strong>This invitation will expire in 7 days.</strong></p>
        <div class="footer">
          <p>If you don't want to join this team, you can safely ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} OKR Manager. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Transform DB row to API format
function transformTeam(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    memberCount: parseInt(row.member_count) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function transformMember(row) {
  return {
    id: row.id,
    odIduser: row.user_id,
    userId: row.user_id,  // alias for compatibility
    name: row.name,
    email: row.email,
    role: row.role,
    joinedAt: row.joined_at,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=3B82F6&color=fff`
  };
}

function transformInvitation(row) {
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    invitedByName: row.invited_by_name,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

// === TEAMS ===

export async function getTeams(pool, userId, userRole) {
  let query;
  let params;

  if (userRole === 'admin') {
    // Admin sees all teams
    query = `
      SELECT t.*, u.name as owner_name, u.email as owner_email,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      ORDER BY t.created_at DESC
    `;
    params = [];
  } else {
    // Non-admin sees only teams they are a member of
    query = `
      SELECT t.*, u.name as owner_name, u.email as owner_email,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.id IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
      ORDER BY t.created_at DESC
    `;
    params = [userId];
  }

  const { rows } = await pool.query(query, params);
  return rows.map(transformTeam);
}

export async function getTeamById(pool, teamId, userId, userRole) {
  let query;
  let params;

  if (userRole === 'admin') {
    // Admin can view any team
    query = `
      SELECT t.*, u.name as owner_name, u.email as owner_email,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.id = $1
    `;
    params = [teamId];
  } else {
    query = `
      SELECT t.*, u.name as owner_name, u.email as owner_email,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN users u ON t.owner_id = u.id
      WHERE t.id = $1 AND t.id IN (
        SELECT team_id FROM team_members WHERE user_id = $2
      )
    `;
    params = [teamId, userId];
  }

  const { rows } = await pool.query(query, params);
  if (rows.length === 0) return null;
  return transformTeam(rows[0]);
}

export async function createTeam(pool, data, userId, userRole) {
  const { name, description } = data;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create team
    const { rows } = await client.query(
      `INSERT INTO teams (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, userId]
    );

    const team = rows[0];

    // Add creator as owner member
    await client.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [team.id, userId]
    );

    await client.query('COMMIT');

    return getTeamById(pool, team.id, userId, userRole);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTeam(pool, teamId, data, userId, userRole) {
  const { name, description } = data;

  // System admin can update any team
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to update this team');
    }
  }

  await pool.query(
    `UPDATE teams SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
     WHERE id = $3`,
    [name, description, teamId]
  );

  return getTeamById(pool, teamId, userId, userRole);
}

export async function deleteTeam(pool, teamId, userId, userRole) {
  // System admin can delete any team
  if (userRole !== 'admin') {
    // Only team owner can delete
    const { rows } = await pool.query(
      `SELECT owner_id FROM teams WHERE id = $1`,
      [teamId]
    );

    if (rows.length === 0) return false;
    if (rows[0].owner_id !== userId) {
      throw new Error('Only team owner can delete the team');
    }
  }

  const result = await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
  return result.rowCount > 0;
}

// === TEAM MEMBERS ===

export async function getTeamMembers(pool, teamId, userId, userRole) {
  // System admin can view any team's members
  if (userRole !== 'admin') {
    // Check if user is a member
    const memberCheck = await pool.query(
      `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('Not a member of this team');
    }
  }

  const { rows } = await pool.query(`
    SELECT tm.id, tm.user_id, tm.role, tm.joined_at, u.name, u.email
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = $1
    ORDER BY
      CASE tm.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END,
      tm.joined_at
  `, [teamId]);

  return rows.map(transformMember);
}

export async function updateMemberRole(pool, teamId, memberId, newRole, userId, userRole) {
  // System admin can update any member role
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to update member roles');
    }
  }

  // Cannot change owner role
  const targetMember = await pool.query(
    `SELECT role FROM team_members WHERE id = $1 AND team_id = $2`,
    [memberId, teamId]
  );

  if (targetMember.rows.length === 0) {
    throw new Error('Member not found');
  }

  if (targetMember.rows[0].role === 'owner') {
    throw new Error('Cannot change owner role');
  }

  await pool.query(
    `UPDATE team_members SET role = $1 WHERE id = $2`,
    [newRole, memberId]
  );

  return { success: true };
}

export async function removeMember(pool, teamId, memberId, userId, userRole) {
  // System admin can remove any member
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to remove members');
    }
  }

  // Cannot remove owner
  const targetMember = await pool.query(
    `SELECT role, user_id FROM team_members WHERE id = $1 AND team_id = $2`,
    [memberId, teamId]
  );

  if (targetMember.rows.length === 0) {
    throw new Error('Member not found');
  }

  if (targetMember.rows[0].role === 'owner') {
    throw new Error('Cannot remove team owner');
  }

  const result = await pool.query(
    `DELETE FROM team_members WHERE id = $1`,
    [memberId]
  );

  return result.rowCount > 0;
}

// === INVITATIONS ===

export async function createInvitation(pool, teamId, data, userId, options = {}, userRole) {
  const { email, role = 'member' } = data;
  const { emailService, frontendUrl } = options;

  // System admin can invite to any team
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to invite members');
    }
  }

  // Check if already a member
  const existingMember = await pool.query(`
    SELECT 1 FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = $1 AND u.email = $2
  `, [teamId, email]);

  if (existingMember.rows.length > 0) {
    throw new Error('User is already a team member');
  }

  // Check for pending invitation
  const existingInvite = await pool.query(`
    SELECT 1 FROM team_invitations
    WHERE team_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()
  `, [teamId, email]);

  if (existingInvite.rows.length > 0) {
    throw new Error('An invitation is already pending for this email');
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { rows } = await pool.query(`
    INSERT INTO team_invitations (team_id, email, invited_by, role, token, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [teamId, email, userId, role, token, expiresAt]);

  // Get team name and inviter name for response and email
  const team = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId]);
  const inviter = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);

  const teamName = team.rows[0]?.name || 'Team';
  const inviterName = inviter.rows[0]?.name || 'A team member';
  const inviteLink = `/invite/${token}`;

  // Send invitation email
  if (emailService && emailService.isConfigured()) {
    try {
      const inviteUrl = `${frontendUrl}${inviteLink}`;
      const subject = `You've been invited to join ${teamName} on OKR Manager`;
      const html = getInvitationEmailHtml(inviterName, teamName, role, inviteUrl);
      await emailService.sendEmail(email, subject, html);
      console.log(`Invitation email sent to ${email}`);
    } catch (err) {
      console.error('Failed to send invitation email:', err);
      // Don't fail the invitation if email fails
    }
  }

  return {
    ...transformInvitation(rows[0]),
    teamName,
    inviteLink
  };
}

export async function getTeamInvitations(pool, teamId, userId, userRole) {
  // System admin can view any team's invitations
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to view invitations');
    }
  }

  const { rows } = await pool.query(`
    SELECT ti.*, t.name as team_name, u.name as invited_by_name
    FROM team_invitations ti
    JOIN teams t ON ti.team_id = t.id
    JOIN users u ON ti.invited_by = u.id
    WHERE ti.team_id = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
    ORDER BY ti.created_at DESC
  `, [teamId]);

  return rows.map(transformInvitation);
}

export async function getPendingInvitationsForUser(pool, email) {
  const { rows } = await pool.query(`
    SELECT ti.*, t.name as team_name, u.name as invited_by_name
    FROM team_invitations ti
    JOIN teams t ON ti.team_id = t.id
    JOIN users u ON ti.invited_by = u.id
    WHERE ti.email = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
    ORDER BY ti.created_at DESC
  `, [email]);

  return rows.map(transformInvitation);
}

export async function resendInvitation(pool, invitationId, userId, options = {}, userRole) {
  const { emailService, frontendUrl } = options;

  // Get invitation details
  const { rows } = await pool.query(`
    SELECT ti.*, t.name as team_name, u.name as inviter_name
    FROM team_invitations ti
    JOIN teams t ON ti.team_id = t.id
    JOIN users u ON ti.invited_by = u.id
    WHERE ti.id = $1 AND ti.status = 'pending'
  `, [invitationId]);

  if (rows.length === 0) {
    throw new Error('Invitation not found or already processed');
  }

  const invitation = rows[0];

  // System admin can resend any invitation
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [invitation.team_id, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to resend invitations');
    }
  }

  // Update expiration date (extend by 7 more days)
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE team_invitations SET expires_at = $1 WHERE id = $2`,
    [newExpiresAt, invitationId]
  );

  // Send email
  if (emailService && emailService.isConfigured()) {
    try {
      const inviteUrl = `${frontendUrl}/invite/${invitation.token}`;
      const subject = `Reminder: You've been invited to join ${invitation.team_name} on OKR Manager`;
      const html = getInvitationEmailHtml(invitation.inviter_name, invitation.team_name, invitation.role, inviteUrl);
      await emailService.sendEmail(invitation.email, subject, html);
      console.log(`Invitation email resent to ${invitation.email}`);
    } catch (err) {
      console.error('Failed to resend invitation email:', err);
      throw new Error('Failed to send email');
    }
  } else {
    throw new Error('Email service not configured');
  }

  return { success: true, email: invitation.email };
}

export async function acceptInvitation(pool, token, userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get invitation
    const { rows } = await client.query(`
      SELECT ti.*, u.email as user_email
      FROM team_invitations ti
      JOIN users u ON u.id = $2
      WHERE ti.token = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
    `, [token, userId]);

    if (rows.length === 0) {
      throw new Error('Invalid or expired invitation');
    }

    const invitation = rows[0];

    // Check if invitation is for this user's email
    if (invitation.email.toLowerCase() !== invitation.user_email.toLowerCase()) {
      throw new Error('This invitation is for a different email address');
    }

    // Add user to team
    await client.query(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, user_id) DO NOTHING
    `, [invitation.team_id, userId, invitation.role]);

    // Update invitation status
    await client.query(`
      UPDATE team_invitations
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1
    `, [invitation.id]);

    await client.query('COMMIT');

    return { success: true, teamId: invitation.team_id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function declineInvitation(pool, token, userId) {
  const { rows } = await pool.query(`
    SELECT ti.*, u.email as user_email
    FROM team_invitations ti
    JOIN users u ON u.id = $2
    WHERE ti.token = $1 AND ti.status = 'pending'
  `, [token, userId]);

  if (rows.length === 0) {
    throw new Error('Invitation not found');
  }

  if (rows[0].email.toLowerCase() !== rows[0].user_email.toLowerCase()) {
    throw new Error('This invitation is for a different email address');
  }

  await pool.query(`
    UPDATE team_invitations SET status = 'declined' WHERE id = $1
  `, [rows[0].id]);

  return { success: true };
}

// Get invitation details by token (public - no auth required)
export async function getInvitationByToken(pool, token) {
  const { rows } = await pool.query(`
    SELECT ti.*, t.name as team_name, u.name as inviter_name
    FROM team_invitations ti
    JOIN teams t ON ti.team_id = t.id
    JOIN users u ON ti.invited_by = u.id
    WHERE ti.token = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
  `, [token]);

  if (rows.length === 0) {
    return null;
  }

  const inv = rows[0];
  return {
    id: inv.id,
    email: inv.email,
    teamName: inv.team_name,
    teamId: inv.team_id,
    inviterName: inv.inviter_name,
    role: inv.role,
    expiresAt: inv.expires_at
  };
}

// Register user from invitation and add to team
export async function registerFromInvitation(pool, token, data, options = {}) {
  const { name, password } = data;
  const { hashPassword } = options;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get invitation
    const { rows: invRows } = await client.query(`
      SELECT ti.*, t.name as team_name
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      WHERE ti.token = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
    `, [token]);

    if (invRows.length === 0) {
      throw new Error('Invalid or expired invitation');
    }

    const invitation = invRows[0];

    // Check if user already exists
    const { rows: existingUser } = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [invitation.email]
    );

    let userId;

    if (existingUser.length > 0) {
      // User exists - just use their ID
      userId = existingUser[0].id;
    } else {
      // Create new user with email already verified (invitation proves email ownership)
      const hashedPassword = hashPassword ? await hashPassword(password) : password;
      const { rows: newUser } = await client.query(`
        INSERT INTO users (email, password, name, role, email_verified)
        VALUES ($1, $2, $3, 'user', true)
        RETURNING id, email, name, role
      `, [invitation.email, hashedPassword, name]);
      userId = newUser[0].id;
    }

    // Check if already a member
    const { rows: existingMember } = await client.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [invitation.team_id, userId]
    );

    if (existingMember.length === 0) {
      // Add user to team
      await client.query(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, $3)
      `, [invitation.team_id, userId, invitation.role]);
    }

    // Update invitation status
    await client.query(`
      UPDATE team_invitations
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1
    `, [invitation.id]);

    await client.query('COMMIT');

    // Get user data for response
    const { rows: userData } = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    );

    return {
      success: true,
      user: userData[0],
      teamId: invitation.team_id,
      teamName: invitation.team_name
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelInvitation(pool, invitationId, userId, userRole) {
  // Get invitation and check permissions
  const { rows } = await pool.query(`
    SELECT ti.team_id FROM team_invitations ti
    WHERE ti.id = $1
  `, [invitationId]);

  if (rows.length === 0) {
    throw new Error('Invitation not found');
  }

  // System admin can cancel any invitation
  if (userRole !== 'admin') {
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [rows[0].team_id, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to cancel invitations');
    }
  }

  const result = await pool.query(
    `DELETE FROM team_invitations WHERE id = $1`,
    [invitationId]
  );

  return result.rowCount > 0;
}

// === SEARCH USERS ===

export async function searchUsers(pool, query, teamId, userId, userRole) {
  // System admin can search users for any team
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to search users');
    }
  }

  // Search users by name or email, excluding current team members
  const { rows } = await pool.query(`
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE (LOWER(u.name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))
      AND u.id NOT IN (SELECT user_id FROM team_members WHERE team_id = $2)
    ORDER BY u.name
    LIMIT 10
  `, [`%${query}%`, teamId]);

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=3B82F6&color=fff`
  }));
}

// === ADD MEMBER DIRECTLY ===

export async function addMemberDirectly(pool, teamId, targetUserId, role, userId, userRole) {
  // System admin can add members to any team
  if (userRole !== 'admin') {
    // Check if user is team owner or team admin
    const memberCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new Error('Not authorized to add members');
    }
  }

  // Check if target user exists
  const userCheck = await pool.query(
    `SELECT id, name, email FROM users WHERE id = $1`,
    [targetUserId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error('User not found');
  }

  // Check if already a member
  const existingMember = await pool.query(
    `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
    [teamId, targetUserId]
  );

  if (existingMember.rows.length > 0) {
    throw new Error('User is already a team member');
  }

  // Add member
  const { rows } = await pool.query(`
    INSERT INTO team_members (team_id, user_id, role)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [teamId, targetUserId, role || 'member']);

  const user = userCheck.rows[0];
  return {
    id: rows[0].id,
    userId: targetUserId,
    name: user.name,
    email: user.email,
    role: rows[0].role,
    joinedAt: rows[0].joined_at,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff`
  };
}
