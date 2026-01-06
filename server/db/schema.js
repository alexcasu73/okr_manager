/**
 * OKR Database Schema
 * Extends the core schema with OKR-specific tables
 */

export async function initializeOKRSchema(pool) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Objectives table
    await client.query(`
      CREATE TABLE IF NOT EXISTS objectives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level VARCHAR(50) NOT NULL CHECK (level IN ('company', 'department', 'team', 'individual')),
        period VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('on-track', 'at-risk', 'off-track', 'completed', 'draft')),
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        due_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Key Results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS key_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('percentage', 'number', 'currency', 'boolean')),
        start_value DECIMAL(15,2) NOT NULL DEFAULT 0,
        target_value DECIMAL(15,2) NOT NULL,
        current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
        unit VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('on-track', 'at-risk', 'off-track', 'completed', 'draft')),
        confidence VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Progress history for tracking changes over time
    await client.query(`
      CREATE TABLE IF NOT EXISTS progress_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
        key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
        previous_value DECIMAL(15,2),
        new_value DECIMAL(15,2),
        changed_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CHECK (objective_id IS NOT NULL OR key_result_id IS NOT NULL)
      )
    `);

    // Teams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Team members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(team_id, user_id)
      )
    `);

    // Team invitations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        accepted_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Objective contributors table (many-to-many relationship)
    await client.query(`
      CREATE TABLE IF NOT EXISTS objective_contributors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'contributor' CHECK (role IN ('contributor', 'reviewer')),
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(objective_id, user_id)
      )
    `);

    // Approval history table for tracking approval workflow
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'returned', 'activated', 'paused', 'resumed', 'stopped', 'archived', 'reverted_to_draft')),
        performed_by UUID NOT NULL REFERENCES users(id),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Basic indexes (on columns that always exist)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_objectives_owner ON objectives(owner_id);
      CREATE INDEX IF NOT EXISTS idx_objectives_level ON objectives(level);
      CREATE INDEX IF NOT EXISTS idx_objectives_period ON objectives(period);
      CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
      CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id);
      CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
      CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
      CREATE INDEX IF NOT EXISTS idx_objective_contributors_objective ON objective_contributors(objective_id);
      CREATE INDEX IF NOT EXISTS idx_objective_contributors_user ON objective_contributors(user_id);
      CREATE INDEX IF NOT EXISTS idx_approval_history_objective ON approval_history(objective_id);
    `);

    await client.query('COMMIT');
    console.log('OKR schema initialized successfully');

    // Run migrations for existing databases (adds new columns)
    await migrateHierarchyFields(pool);

    // Create indexes on migrated columns (safe to run after migration)
    await createHierarchyIndexes(pool);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Migration: Add hierarchy and approval fields to existing tables
 * Safe to run multiple times (checks if columns exist)
 */
async function migrateHierarchyFields(pool) {
  const client = await pool.connect();

  try {
    // Check and add columns to objectives table
    const objectiveColumns = [
      { name: 'parent_objective_id', type: 'UUID REFERENCES objectives(id) ON DELETE SET NULL' },
      { name: 'team_id', type: 'UUID REFERENCES teams(id) ON DELETE SET NULL' },
      { name: 'approval_status', type: "VARCHAR(50) DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'active', 'paused', 'stopped', 'archived'))" },
      { name: 'approved_by', type: 'UUID REFERENCES users(id)' },
      { name: 'approved_at', type: 'TIMESTAMP WITH TIME ZONE' }
    ];

    for (const col of objectiveColumns) {
      const checkResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'objectives' AND column_name = $1
      `, [col.name]);

      if (checkResult.rows.length === 0) {
        await client.query(`ALTER TABLE objectives ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column objectives.${col.name}`);
      }
    }

    // Check and add type column to teams table
    const teamTypeCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'teams' AND column_name = 'type'
    `);

    if (teamTypeCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE teams ADD COLUMN type VARCHAR(50) DEFAULT 'team'
        CHECK (type IN ('department', 'team'))
      `);
      console.log('Added column teams.type');
    }

    console.log('Hierarchy migration completed');
  } catch (error) {
    console.error('Migration error:', error.message);
    // Non-fatal: migrations may fail on constraints if data exists
  } finally {
    client.release();
  }
}

/**
 * Create indexes on hierarchy columns (run after migration)
 */
async function createHierarchyIndexes(pool) {
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_objectives_parent ON objectives(parent_objective_id);
      CREATE INDEX IF NOT EXISTS idx_objectives_team ON objectives(team_id);
      CREATE INDEX IF NOT EXISTS idx_objectives_approval ON objectives(approval_status);
      CREATE INDEX IF NOT EXISTS idx_teams_type ON teams(type);
    `);
    console.log('Hierarchy indexes created');
  } catch (error) {
    console.error('Index creation error:', error.message);
    // Non-fatal: indexes may already exist or columns may not exist
  }

  // Update approval_history action constraint to include reverted_to_draft
  try {
    await pool.query(`
      ALTER TABLE approval_history DROP CONSTRAINT IF EXISTS approval_history_action_check;
      ALTER TABLE approval_history ADD CONSTRAINT approval_history_action_check
        CHECK (action IN ('submitted', 'approved', 'rejected', 'returned', 'activated', 'paused', 'resumed', 'stopped', 'archived', 'reverted_to_draft'));
    `);
    console.log('Updated approval_history action constraint');
  } catch (error) {
    console.error('Constraint update error:', error.message);
    // Non-fatal: constraint may already be correct
  }
}
