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

    // Indexes
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
    `);

    await client.query('COMMIT');
    console.log('OKR schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
