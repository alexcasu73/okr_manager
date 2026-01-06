/**
 * OKR Service - Business logic for Objectives and Key Results
 */

// Transform DB row to API format
function transformObjective(row, keyResults = []) {
  const objective = {
    id: row.id,
    title: row.title,
    description: row.description,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    level: row.level,
    period: row.period,
    status: row.status,
    progress: row.progress,
    dueDate: row.due_date,
    keyResults: keyResults.map(transformKeyResult),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Hierarchy fields
    parentObjectiveId: row.parent_objective_id || null,
    parentObjectiveTitle: row.parent_objective_title || null,
    teamId: row.team_id || null,
    teamName: row.team_name || null,
    // Approval workflow fields
    approvalStatus: row.approval_status || 'draft',
    approvedBy: row.approved_by || null,
    approvedByName: row.approved_by_name || null,
    approvedAt: row.approved_at || null,
    // Aggregated hierarchy info
    childrenCount: parseInt(row.children_count) || 0
  };

  // Add health metrics for dashboard insights
  objective.healthMetrics = calculateHealthMetricsFromRow(row, keyResults);

  return objective;
}

// Calculate health metrics from raw row data
function calculateHealthMetricsFromRow(row, keyResults) {
  const now = new Date();
  const due = row.due_date ? new Date(row.due_date) : null;
  const created = new Date(row.created_at);
  const progress = row.progress || 0;

  const metrics = {
    paceRatio: 1.0,
    expectedProgress: 0,
    progressGap: 0,
    daysRemaining: null,
    daysElapsed: 0,
    totalDays: 0,
    percentTimeElapsed: 0,
    isOnPace: true,
    riskLevel: 'low',
    recommendation: null
  };

  if (!due) return metrics;

  metrics.daysRemaining = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  // If deadline has passed and not completed, it's critical
  if (metrics.daysRemaining < 0 && progress < 100) {
    metrics.riskLevel = 'critical';
    metrics.isOnPace = false;
    metrics.paceRatio = 0;
    metrics.expectedProgress = 100;
    metrics.progressGap = 100 - progress;
    metrics.percentTimeElapsed = 100;
    metrics.recommendation = 'Scaduto! Obiettivo non raggiunto. Azione urgente richiesta.';
    return metrics;
  }

  const totalDuration = due - created;
  const elapsed = now - created;

  // Handle edge case where due date is before or same as created date
  if (totalDuration <= 0) {
    metrics.riskLevel = progress >= 100 ? 'low' : 'critical';
    metrics.isOnPace = progress >= 100;
    metrics.expectedProgress = 100;
    metrics.progressGap = 100 - progress;
    metrics.recommendation = progress < 100 ? 'Obiettivo con scadenza immediata non raggiunto.' : null;
    return metrics;
  }

  metrics.daysElapsed = Math.max(0, Math.floor(elapsed / (1000 * 60 * 60 * 24)));
  metrics.totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
  metrics.percentTimeElapsed = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

  const timeProgress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  metrics.expectedProgress = Math.round(timeProgress);
  metrics.progressGap = Math.round(metrics.expectedProgress - progress);
  metrics.paceRatio = metrics.expectedProgress > 0
    ? Math.round((progress / metrics.expectedProgress) * 100) / 100
    : 1;
  metrics.isOnPace = metrics.paceRatio >= 0.8;

  // Determine risk level
  if (metrics.paceRatio >= 0.9) {
    metrics.riskLevel = 'low';
  } else if (metrics.paceRatio >= 0.7) {
    metrics.riskLevel = 'medium';
    metrics.recommendation = 'Leggermente in ritardo. Considera di accelerare.';
  } else if (metrics.paceRatio >= 0.5) {
    metrics.riskLevel = 'high';
    metrics.recommendation = 'In ritardo significativo. Richiede intervento.';
  } else {
    metrics.riskLevel = 'critical';
    metrics.recommendation = 'Critico. Rivaluta obiettivi o risorse.';
  }

  return metrics;
}

function transformKeyResult(row) {
  return {
    id: row.id,
    objectiveId: row.objective_id,
    description: row.description,
    metricType: row.metric_type,
    startValue: parseFloat(row.start_value),
    targetValue: parseFloat(row.target_value),
    currentValue: parseFloat(row.current_value),
    unit: row.unit,
    status: row.status,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Calculate objective progress from key results
function calculateProgress(keyResults) {
  if (!keyResults || keyResults.length === 0) return 0;

  const totalProgress = keyResults.reduce((sum, kr) => {
    const range = kr.target_value - kr.start_value;
    if (range === 0) return sum + (kr.current_value >= kr.target_value ? 100 : 0);
    const progress = ((kr.current_value - kr.start_value) / range) * 100;
    return sum + Math.min(Math.max(progress, 0), 100);
  }, 0);

  return Math.round(totalProgress / keyResults.length);
}

/**
 * Determine status based on progress, time elapsed, and pace analysis
 *
 * Logic:
 * 1. Calculate expected progress based on time elapsed
 * 2. Compare actual progress to expected (pace ratio)
 * 3. Consider urgency (how close to deadline)
 * 4. Factor in confidence levels from Key Results
 *
 * Status meanings:
 * - completed: progress >= 100%
 * - on-track: pace ratio >= 0.8 (within 20% of expected)
 * - at-risk: pace ratio 0.5-0.8 OR close to deadline with moderate gap
 * - off-track: pace ratio < 0.5 OR past deadline OR severe gap near deadline
 */
function determineStatus(progress, dueDate, createdAt = null, keyResults = []) {
  // Completed check
  if (progress >= 100) return 'completed';

  const now = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  // Past deadline = off-track
  if (daysUntilDue < 0) return 'off-track';

  // If no due date or just created, default to on-track
  if (!dueDate) return progress > 0 ? 'on-track' : 'draft';

  // Calculate time-based expected progress
  const created = createdAt ? new Date(createdAt) : new Date(due.getTime() - 90 * 24 * 60 * 60 * 1000); // default 90 days
  const totalDuration = due - created;
  const elapsed = now - created;
  const timeProgress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

  // Expected progress (linear model - could be adjusted for different curves)
  const expectedProgress = timeProgress;

  // Pace ratio: actual / expected (1.0 = on track, > 1.0 = ahead, < 1.0 = behind)
  const paceRatio = expectedProgress > 0 ? progress / expectedProgress : (progress > 0 ? 1.5 : 0.5);

  // Gap: how many percentage points behind
  const progressGap = expectedProgress - progress;

  // Confidence factor from Key Results (average confidence)
  let confidenceFactor = 1.0;
  if (keyResults && keyResults.length > 0) {
    const confidenceScores = { high: 1.0, medium: 0.8, low: 0.6 };
    const avgConfidence = keyResults.reduce((sum, kr) => {
      return sum + (confidenceScores[kr.confidence] || 0.8);
    }, 0) / keyResults.length;
    confidenceFactor = avgConfidence;
  }

  // Urgency multiplier: increases as deadline approaches
  // More strict when close to deadline
  let urgencyMultiplier = 1.0;
  if (daysUntilDue <= 7) {
    urgencyMultiplier = 1.5; // Very close - be stricter
  } else if (daysUntilDue <= 14) {
    urgencyMultiplier = 1.3;
  } else if (daysUntilDue <= 30) {
    urgencyMultiplier = 1.1;
  }

  // Adjusted pace ratio considering confidence
  const adjustedPaceRatio = paceRatio * confidenceFactor;

  // Decision logic
  // OFF-TRACK conditions:
  if (adjustedPaceRatio < 0.4) return 'off-track'; // Severely behind pace
  if (daysUntilDue <= 7 && progress < 70) return 'off-track'; // 1 week left, not near completion
  if (daysUntilDue <= 14 && progress < 50) return 'off-track'; // 2 weeks left, less than half done
  if (progressGap > 40 * urgencyMultiplier) return 'off-track'; // Huge gap amplified by urgency

  // AT-RISK conditions:
  if (adjustedPaceRatio < 0.7) return 'at-risk'; // Behind pace
  if (daysUntilDue <= 7 && progress < 85) return 'at-risk'; // 1 week left, should be almost done
  if (daysUntilDue <= 14 && progress < 70) return 'at-risk'; // 2 weeks left, should be mostly done
  if (daysUntilDue <= 30 && progress < 50) return 'at-risk'; // 1 month left, should be halfway
  if (progressGap > 20 * urgencyMultiplier) return 'at-risk'; // Moderate gap

  // ON-TRACK: pace ratio >= 0.7 and no urgent concerns
  return 'on-track';
}

/**
 * Calculate detailed health metrics for an objective
 * Returns additional data for dashboard insights
 */
function calculateHealthMetrics(objective, keyResults) {
  const now = new Date();
  const due = objective.due_date ? new Date(objective.due_date) : null;
  const created = new Date(objective.created_at);

  const metrics = {
    paceRatio: 1.0,
    expectedProgress: 0,
    progressGap: 0,
    daysRemaining: null,
    daysElapsed: 0,
    isOnPace: true,
    riskLevel: 'low', // low, medium, high, critical
    recommendation: null
  };

  if (!due) return metrics;

  const totalDuration = due - created;
  const elapsed = now - created;
  metrics.daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  metrics.daysRemaining = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  const timeProgress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  metrics.expectedProgress = Math.round(timeProgress);

  const progress = objective.progress || 0;
  metrics.progressGap = Math.round(metrics.expectedProgress - progress);
  metrics.paceRatio = metrics.expectedProgress > 0 ? progress / metrics.expectedProgress : 1;
  metrics.isOnPace = metrics.paceRatio >= 0.8;

  // Determine risk level
  if (metrics.paceRatio >= 0.9) {
    metrics.riskLevel = 'low';
  } else if (metrics.paceRatio >= 0.7) {
    metrics.riskLevel = 'medium';
    metrics.recommendation = 'Leggermente in ritardo. Considera di accelerare il ritmo.';
  } else if (metrics.paceRatio >= 0.5) {
    metrics.riskLevel = 'high';
    metrics.recommendation = 'Significativamente in ritardo. Richiede intervento immediato.';
  } else {
    metrics.riskLevel = 'critical';
    metrics.recommendation = 'Criticamente in ritardo. Rivaluta obiettivi o risorse.';
  }

  return metrics;
}

// === OBJECTIVES ===

export async function getObjectives(pool, filters = {}) {
  const { ownerId, level, period, status, parentObjectiveId, approvalStatus } = filters;
  let query = `
    SELECT o.*,
           u.name as owner_name,
           parent.title as parent_objective_title,
           t.name as team_name,
           approver.name as approved_by_name,
           (SELECT COUNT(*) FROM objectives child WHERE child.parent_objective_id = o.id) as children_count
    FROM objectives o
    JOIN users u ON o.owner_id = u.id
    LEFT JOIN objectives parent ON o.parent_objective_id = parent.id
    LEFT JOIN teams t ON o.team_id = t.id
    LEFT JOIN users approver ON o.approved_by = approver.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (ownerId) {
    query += ` AND o.owner_id = $${paramIndex++}`;
    params.push(ownerId);
  }
  if (level) {
    query += ` AND o.level = $${paramIndex++}`;
    params.push(level);
  }
  if (period) {
    query += ` AND o.period = $${paramIndex++}`;
    params.push(period);
  }
  if (status) {
    query += ` AND o.status = $${paramIndex++}`;
    params.push(status);
  }
  if (parentObjectiveId) {
    query += ` AND o.parent_objective_id = $${paramIndex++}`;
    params.push(parentObjectiveId);
  }
  if (approvalStatus) {
    query += ` AND o.approval_status = $${paramIndex++}`;
    params.push(approvalStatus);
  }

  query += ' ORDER BY o.created_at DESC';

  const { rows } = await pool.query(query, params);

  // Fetch key results for each objective
  const objectives = await Promise.all(
    rows.map(async (row) => {
      const krResult = await pool.query(
        'SELECT * FROM key_results WHERE objective_id = $1 ORDER BY created_at',
        [row.id]
      );
      return transformObjective(row, krResult.rows);
    })
  );

  return objectives;
}

export async function getObjectiveById(pool, id) {
  const { rows } = await pool.query(
    `SELECT o.*,
            u.name as owner_name,
            parent.title as parent_objective_title,
            t.name as team_name,
            approver.name as approved_by_name,
            (SELECT COUNT(*) FROM objectives child WHERE child.parent_objective_id = o.id) as children_count
     FROM objectives o
     JOIN users u ON o.owner_id = u.id
     LEFT JOIN objectives parent ON o.parent_objective_id = parent.id
     LEFT JOIN teams t ON o.team_id = t.id
     LEFT JOIN users approver ON o.approved_by = approver.id
     WHERE o.id = $1`,
    [id]
  );

  if (rows.length === 0) return null;

  const krResult = await pool.query(
    'SELECT * FROM key_results WHERE objective_id = $1 ORDER BY created_at',
    [id]
  );

  return transformObjective(rows[0], krResult.rows);
}

export async function createObjective(pool, data, userId) {
  const { title, description, level, period, dueDate, keyResults = [], ownerId, parentObjectiveId, teamId } = data;

  // Use provided ownerId or default to creating user
  const objectiveOwnerId = ownerId || userId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate parent-child hierarchy if parentObjectiveId is provided
    if (parentObjectiveId) {
      const validation = await validateParentChild(client, level, parentObjectiveId);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    // Create objective
    const { rows } = await client.query(
      `INSERT INTO objectives (title, description, owner_id, level, period, due_date, status, parent_objective_id, team_id, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, 'draft')
       RETURNING *`,
      [title, description, objectiveOwnerId, level, period, dueDate, parentObjectiveId || null, teamId || null]
    );

    const objective = rows[0];

    // Create key results
    const createdKeyResults = [];
    for (const kr of keyResults) {
      const krResult = await client.query(
        `INSERT INTO key_results (objective_id, description, metric_type, start_value, target_value, current_value, unit, status, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', 'medium')
         RETURNING *`,
        [objective.id, kr.description, kr.metricType, kr.startValue || 0, kr.targetValue, kr.currentValue || kr.startValue || 0, kr.unit]
      );
      createdKeyResults.push(krResult.rows[0]);
    }

    await client.query('COMMIT');

    // Return full objective with joins
    return getObjectiveById(pool, objective.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Validate parent-child relationship rules
async function validateParentChild(client, childLevel, parentId) {
  const levelHierarchy = {
    'company': 0,
    'department': 1,
    'team': 2,
    'individual': 3
  };

  const { rows } = await client.query(
    'SELECT level FROM objectives WHERE id = $1',
    [parentId]
  );

  if (rows.length === 0) {
    return { valid: false, error: 'Parent objective not found' };
  }

  const parentLevel = rows[0].level;
  const parentRank = levelHierarchy[parentLevel];
  const childRank = levelHierarchy[childLevel];

  // Child level must be lower in hierarchy (higher rank number)
  if (childRank <= parentRank) {
    return {
      valid: false,
      error: `A ${childLevel} OKR cannot have a ${parentLevel} OKR as parent. Parent must be a higher level.`
    };
  }

  return { valid: true };
}

export async function updateObjective(pool, id, data, userId) {
  const { title, description, level, period, dueDate, status, parentObjectiveId, teamId } = data;

  // Validate parent-child if changing parentObjectiveId
  if (parentObjectiveId !== undefined && parentObjectiveId !== null) {
    // Get current level or use new level
    const currentObj = await pool.query('SELECT level FROM objectives WHERE id = $1', [id]);
    const objLevel = level || currentObj.rows[0]?.level;
    const validation = await validateParentChild({ query: pool.query.bind(pool) }, objLevel, parentObjectiveId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  // First update the basic fields including hierarchy
  const { rows } = await pool.query(
    `UPDATE objectives
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         level = COALESCE($3, level),
         period = COALESCE($4, period),
         due_date = COALESCE($5, due_date),
         parent_objective_id = CASE WHEN $7::uuid IS NOT NULL OR $8 THEN $7 ELSE parent_objective_id END,
         team_id = CASE WHEN $9::uuid IS NOT NULL OR $10 THEN $9 ELSE team_id END,
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [title, description, level, period, dueDate, id, parentObjectiveId, parentObjectiveId === null, teamId, teamId === null]
  );

  if (rows.length === 0) return null;

  // If status was explicitly provided, use it; otherwise recalculate
  if (status) {
    await pool.query(
      'UPDATE objectives SET status = $1 WHERE id = $2',
      [status, id]
    );
  } else {
    // Recalculate status based on current data
    await updateObjectiveProgress(pool, id);
  }

  return getObjectiveById(pool, id);
}

export async function deleteObjective(pool, id) {
  const { rowCount } = await pool.query(
    'DELETE FROM objectives WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

// === KEY RESULTS ===

export async function createKeyResult(pool, objectiveId, data, userId) {
  const { description, metricType, startValue, targetValue, unit } = data;

  const { rows } = await pool.query(
    `INSERT INTO key_results (objective_id, description, metric_type, start_value, target_value, current_value, unit)
     VALUES ($1, $2, $3, $4, $5, $4, $6)
     RETURNING *`,
    [objectiveId, description, metricType, startValue || 0, targetValue, unit]
  );

  // Update objective progress
  await updateObjectiveProgress(pool, objectiveId);

  return transformKeyResult(rows[0]);
}

export async function updateKeyResult(pool, id, data, userId) {
  const { description, metricType, startValue, targetValue, currentValue, unit, status, confidence } = data;

  // Get current value for history
  const current = await pool.query('SELECT * FROM key_results WHERE id = $1', [id]);
  if (current.rows.length === 0) return null;

  const oldValue = current.rows[0].current_value;
  const objectiveId = current.rows[0].objective_id;

  const { rows } = await pool.query(
    `UPDATE key_results
     SET description = COALESCE($1, description),
         metric_type = COALESCE($2, metric_type),
         start_value = COALESCE($3, start_value),
         target_value = COALESCE($4, target_value),
         current_value = COALESCE($5, current_value),
         unit = COALESCE($6, unit),
         status = COALESCE($7, status),
         confidence = COALESCE($8, confidence),
         updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [description, metricType, startValue, targetValue, currentValue, unit, status, confidence, id]
  );

  // Log progress change
  if (currentValue !== undefined && currentValue !== oldValue) {
    await pool.query(
      `INSERT INTO progress_history (key_result_id, previous_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [id, oldValue, currentValue, userId]
    );
  }

  // Update objective progress
  await updateObjectiveProgress(pool, objectiveId);

  return transformKeyResult(rows[0]);
}

export async function deleteKeyResult(pool, id) {
  const current = await pool.query('SELECT objective_id FROM key_results WHERE id = $1', [id]);
  if (current.rows.length === 0) return false;

  const objectiveId = current.rows[0].objective_id;

  const { rowCount } = await pool.query('DELETE FROM key_results WHERE id = $1', [id]);

  if (rowCount > 0) {
    await updateObjectiveProgress(pool, objectiveId);
  }

  return rowCount > 0;
}

// Update objective progress based on key results
async function updateObjectiveProgress(pool, objectiveId) {
  const { rows: keyResults } = await pool.query(
    'SELECT * FROM key_results WHERE objective_id = $1',
    [objectiveId]
  );

  const progress = calculateProgress(keyResults);

  const { rows: objective } = await pool.query(
    'SELECT due_date, created_at FROM objectives WHERE id = $1',
    [objectiveId]
  );

  // Use enhanced status determination with all available data
  const status = objective[0]?.due_date
    ? determineStatus(progress, objective[0].due_date, objective[0].created_at, keyResults)
    : progress >= 100 ? 'completed' : (progress > 0 ? 'on-track' : 'draft');

  await pool.query(
    `UPDATE objectives SET progress = $1, status = $2, updated_at = NOW() WHERE id = $3`,
    [progress, status, objectiveId]
  );
}

// === ANALYTICS ===

export async function getStats(pool, userId, isAdmin) {
  const whereClause = isAdmin ? '' : 'WHERE o.owner_id = $1';
  const params = isAdmin ? [] : [userId];

  const { rows: [stats] } = await pool.query(`
    SELECT
      COUNT(*) as total_objectives,
      ROUND(AVG(progress)) as avg_progress,
      COUNT(*) FILTER (WHERE status IN ('at-risk', 'off-track')) as at_risk_count,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count
    FROM objectives o
    ${whereClause}
  `, params);

  return {
    totalObjectives: parseInt(stats.total_objectives) || 0,
    avgProgress: parseInt(stats.avg_progress) || 0,
    atRiskCount: parseInt(stats.at_risk_count) || 0,
    completedCount: parseInt(stats.completed_count) || 0
  };
}

export async function getProgressHistory(pool, objectiveId) {
  const { rows } = await pool.query(`
    SELECT ph.*, u.name as changed_by_name
    FROM progress_history ph
    LEFT JOIN users u ON ph.changed_by = u.id
    WHERE ph.objective_id = $1 OR ph.key_result_id IN (
      SELECT id FROM key_results WHERE objective_id = $1
    )
    ORDER BY ph.created_at DESC
    LIMIT 50
  `, [objectiveId]);

  return rows;
}

// === ADMIN FUNCTIONS ===

/**
 * Get count of all data associated with a user
 * Used to warn admin before deleting a user
 */
export async function getUserDataCount(pool, userId) {
  const { rows: [counts] } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM objectives WHERE owner_id = $1) as objectives_count,
      (SELECT COUNT(*) FROM key_results WHERE objective_id IN (SELECT id FROM objectives WHERE owner_id = $1)) as key_results_count,
      (SELECT COUNT(*) FROM teams WHERE owner_id = $1) as teams_owned_count,
      (SELECT COUNT(*) FROM team_members WHERE user_id = $1) as team_memberships_count
  `, [userId]);

  return {
    objectivesCount: parseInt(counts.objectives_count) || 0,
    keyResultsCount: parseInt(counts.key_results_count) || 0,
    teamsOwnedCount: parseInt(counts.teams_owned_count) || 0,
    teamMembershipsCount: parseInt(counts.team_memberships_count) || 0,
    hasData: (parseInt(counts.objectives_count) || 0) > 0 ||
             (parseInt(counts.teams_owned_count) || 0) > 0
  };
}

/**
 * Reassign all OKRs from one user to another
 * Used before deleting a user to preserve OKR data
 */
export async function reassignUserOKRs(pool, fromUserId, toUserId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Count objectives to reassign
    const { rows: [countResult] } = await client.query(
      'SELECT COUNT(*) as count FROM objectives WHERE owner_id = $1',
      [fromUserId]
    );
    const objectivesCount = parseInt(countResult.count) || 0;

    // Reassign objectives
    await client.query(
      'UPDATE objectives SET owner_id = $1, updated_at = NOW() WHERE owner_id = $2',
      [toUserId, fromUserId]
    );

    // Reassign teams ownership
    const { rows: [teamsCountResult] } = await client.query(
      'SELECT COUNT(*) as count FROM teams WHERE owner_id = $1',
      [fromUserId]
    );
    const teamsCount = parseInt(teamsCountResult.count) || 0;

    await client.query(
      'UPDATE teams SET owner_id = $1, updated_at = NOW() WHERE owner_id = $2',
      [toUserId, fromUserId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      reassignedObjectives: objectivesCount,
      reassignedTeams: teamsCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// === HIERARCHY FUNCTIONS ===

/**
 * Get child objectives of a given objective
 */
export async function getObjectiveChildren(pool, parentId) {
  const { rows } = await pool.query(
    `SELECT o.*,
            u.name as owner_name,
            parent.title as parent_objective_title,
            t.name as team_name,
            (SELECT COUNT(*) FROM objectives child WHERE child.parent_objective_id = o.id) as children_count
     FROM objectives o
     JOIN users u ON o.owner_id = u.id
     LEFT JOIN objectives parent ON o.parent_objective_id = parent.id
     LEFT JOIN teams t ON o.team_id = t.id
     WHERE o.parent_objective_id = $1
     ORDER BY o.level, o.created_at DESC`,
    [parentId]
  );

  // Fetch key results for each objective
  const objectives = await Promise.all(
    rows.map(async (row) => {
      const krResult = await pool.query(
        'SELECT * FROM key_results WHERE objective_id = $1 ORDER BY created_at',
        [row.id]
      );
      return transformObjective(row, krResult.rows);
    })
  );

  return objectives;
}

/**
 * Get available parent objectives for a given level
 * Returns objectives that can be valid parents based on hierarchy rules
 */
export async function getAvailableParents(pool, level, excludeId = null) {
  const levelHierarchy = {
    'company': [],           // Company can't have parents
    'department': ['company'],
    'team': ['company', 'department'],
    'individual': ['company', 'department', 'team']
  };

  const validParentLevels = levelHierarchy[level] || [];

  if (validParentLevels.length === 0) {
    return [];
  }

  let query = `
    SELECT o.id, o.title, o.level, o.period, o.status, o.progress,
           u.name as owner_name
    FROM objectives o
    JOIN users u ON o.owner_id = u.id
    WHERE o.level = ANY($1)
  `;
  const params = [validParentLevels];

  if (excludeId) {
    query += ` AND o.id != $2`;
    params.push(excludeId);
  }

  query += ` ORDER BY o.level, o.period DESC, o.title`;

  const { rows } = await pool.query(query, params);

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    level: row.level,
    period: row.period,
    status: row.status,
    progress: row.progress,
    ownerName: row.owner_name
  }));
}

/**
 * Get full OKR hierarchy tree
 * Returns nested structure with children
 */
export async function getObjectiveHierarchy(pool, filters = {}) {
  const { period, rootLevel = 'company' } = filters;

  // Get all objectives
  let query = `
    SELECT o.*,
           u.name as owner_name,
           parent.title as parent_objective_title,
           t.name as team_name,
           (SELECT COUNT(*) FROM objectives child WHERE child.parent_objective_id = o.id) as children_count
    FROM objectives o
    JOIN users u ON o.owner_id = u.id
    LEFT JOIN objectives parent ON o.parent_objective_id = parent.id
    LEFT JOIN teams t ON o.team_id = t.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (period) {
    query += ` AND o.period = $${paramIndex++}`;
    params.push(period);
  }

  query += ` ORDER BY o.level, o.created_at DESC`;

  const { rows } = await pool.query(query, params);

  // Fetch all key results in one query for efficiency
  const objectiveIds = rows.map(r => r.id);
  const { rows: allKeyResults } = objectiveIds.length > 0
    ? await pool.query(
        'SELECT * FROM key_results WHERE objective_id = ANY($1) ORDER BY created_at',
        [objectiveIds]
      )
    : { rows: [] };

  // Group key results by objective
  const krByObjective = {};
  allKeyResults.forEach(kr => {
    if (!krByObjective[kr.objective_id]) {
      krByObjective[kr.objective_id] = [];
    }
    krByObjective[kr.objective_id].push(kr);
  });

  // Transform all objectives
  const objectivesMap = {};
  rows.forEach(row => {
    objectivesMap[row.id] = {
      ...transformObjective(row, krByObjective[row.id] || []),
      children: []
    };
  });

  // Build tree structure
  const roots = [];
  Object.values(objectivesMap).forEach(obj => {
    if (obj.parentObjectiveId && objectivesMap[obj.parentObjectiveId]) {
      objectivesMap[obj.parentObjectiveId].children.push(obj);
    } else if (!obj.parentObjectiveId) {
      roots.push(obj);
    } else {
      // Parent not in current filter, treat as root
      roots.push(obj);
    }
  });

  return roots;
}

/**
 * Get objective with its full ancestry chain (breadcrumb)
 */
export async function getObjectiveWithAncestors(pool, id) {
  const objective = await getObjectiveById(pool, id);
  if (!objective) return null;

  const ancestors = [];
  let currentParentId = objective.parentObjectiveId;

  while (currentParentId) {
    const { rows } = await pool.query(
      `SELECT id, title, level, parent_objective_id FROM objectives WHERE id = $1`,
      [currentParentId]
    );

    if (rows.length === 0) break;

    ancestors.unshift({
      id: rows[0].id,
      title: rows[0].title,
      level: rows[0].level
    });

    currentParentId = rows[0].parent_objective_id;
  }

  return {
    ...objective,
    ancestors
  };
}

// === APPROVAL WORKFLOW FUNCTIONS ===

/**
 * Submit an objective for review
 * Changes status from 'draft' to 'pending_review'
 */
export async function submitForReview(pool, objectiveId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check current approval status
    const { rows } = await client.query(
      'SELECT approval_status, owner_id FROM objectives WHERE id = $1',
      [objectiveId]
    );

    if (rows.length === 0) {
      throw new Error('Objective not found');
    }

    if (rows[0].approval_status !== 'draft') {
      throw new Error(`Cannot submit for review: current status is ${rows[0].approval_status}`);
    }

    // Update approval status
    await client.query(
      `UPDATE objectives
       SET approval_status = 'pending_review', updated_at = NOW()
       WHERE id = $1`,
      [objectiveId]
    );

    // Log to approval history
    await client.query(
      `INSERT INTO approval_history (objective_id, action, performed_by, comment)
       VALUES ($1, 'submitted', $2, 'Submitted for review')`,
      [objectiveId, userId]
    );

    await client.query('COMMIT');

    return getObjectiveById(pool, objectiveId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Approve an objective
 * Changes status from 'pending_review' to 'approved'
 */
export async function approveObjective(pool, objectiveId, approverId, comment = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check current approval status
    const { rows } = await client.query(
      'SELECT approval_status FROM objectives WHERE id = $1',
      [objectiveId]
    );

    if (rows.length === 0) {
      throw new Error('Objective not found');
    }

    if (rows[0].approval_status !== 'pending_review') {
      throw new Error(`Cannot approve: current status is ${rows[0].approval_status}`);
    }

    // Update approval status
    await client.query(
      `UPDATE objectives
       SET approval_status = 'approved',
           approved_by = $2,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [objectiveId, approverId]
    );

    // Log to approval history
    await client.query(
      `INSERT INTO approval_history (objective_id, action, performed_by, comment)
       VALUES ($1, 'approved', $2, $3)`,
      [objectiveId, approverId, comment || 'Approved']
    );

    await client.query('COMMIT');

    return getObjectiveById(pool, objectiveId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reject an objective
 * Changes status from 'pending_review' back to 'draft'
 */
export async function rejectObjective(pool, objectiveId, rejecterId, comment) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check current approval status
    const { rows } = await client.query(
      'SELECT approval_status FROM objectives WHERE id = $1',
      [objectiveId]
    );

    if (rows.length === 0) {
      throw new Error('Objective not found');
    }

    if (rows[0].approval_status !== 'pending_review') {
      throw new Error(`Cannot reject: current status is ${rows[0].approval_status}`);
    }

    // Update approval status back to draft
    await client.query(
      `UPDATE objectives
       SET approval_status = 'draft',
           updated_at = NOW()
       WHERE id = $1`,
      [objectiveId]
    );

    // Log to approval history
    await client.query(
      `INSERT INTO approval_history (objective_id, action, performed_by, comment)
       VALUES ($1, 'rejected', $2, $3)`,
      [objectiveId, rejecterId, comment || 'Rejected']
    );

    await client.query('COMMIT');

    return getObjectiveById(pool, objectiveId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Activate an approved objective
 * Changes status from 'approved' to 'active'
 */
export async function activateObjective(pool, objectiveId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check current approval status
    const { rows } = await client.query(
      'SELECT approval_status FROM objectives WHERE id = $1',
      [objectiveId]
    );

    if (rows.length === 0) {
      throw new Error('Objective not found');
    }

    if (rows[0].approval_status !== 'approved') {
      throw new Error(`Cannot activate: current status is ${rows[0].approval_status}`);
    }

    // Update approval status
    await client.query(
      `UPDATE objectives
       SET approval_status = 'active',
           updated_at = NOW()
       WHERE id = $1`,
      [objectiveId]
    );

    // Log to approval history
    await client.query(
      `INSERT INTO approval_history (objective_id, action, performed_by, comment)
       VALUES ($1, 'activated', $2, 'Activated')`,
      [objectiveId, userId]
    );

    await client.query('COMMIT');

    return getObjectiveById(pool, objectiveId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get approval history for an objective
 */
export async function getApprovalHistory(pool, objectiveId) {
  const { rows } = await pool.query(
    `SELECT ah.*, u.name as performed_by_name
     FROM approval_history ah
     JOIN users u ON ah.performed_by = u.id
     WHERE ah.objective_id = $1
     ORDER BY ah.created_at DESC`,
    [objectiveId]
  );

  return rows.map(row => ({
    id: row.id,
    objectiveId: row.objective_id,
    action: row.action,
    performedBy: row.performed_by,
    performedByName: row.performed_by_name,
    comment: row.comment,
    createdAt: row.created_at
  }));
}

/**
 * Get objectives pending approval
 * For managers to see what needs their review
 */
export async function getPendingApprovals(pool, userId, isAdmin) {
  // For now, admins can approve all pending, managers can approve based on level
  let query = `
    SELECT o.*,
           u.name as owner_name,
           parent.title as parent_objective_title,
           t.name as team_name,
           (SELECT COUNT(*) FROM objectives child WHERE child.parent_objective_id = o.id) as children_count
    FROM objectives o
    JOIN users u ON o.owner_id = u.id
    LEFT JOIN objectives parent ON o.parent_objective_id = parent.id
    LEFT JOIN teams t ON o.team_id = t.id
    WHERE o.approval_status = 'pending_review'
  `;

  // If not admin, only show OKRs they can approve
  // For simplicity, non-admins can only see their own submitted OKRs
  const params = [];
  if (!isAdmin) {
    query += ` AND o.owner_id = $1`;
    params.push(userId);
  }

  query += ` ORDER BY o.created_at DESC`;

  const { rows } = await pool.query(query, params);

  // Fetch key results for each objective
  const objectives = await Promise.all(
    rows.map(async (row) => {
      const krResult = await pool.query(
        'SELECT * FROM key_results WHERE objective_id = $1 ORDER BY created_at',
        [row.id]
      );
      return transformObjective(row, krResult.rows);
    })
  );

  return objectives;
}

// === CONTRIBUTORS FUNCTIONS ===

/**
 * Get contributors for an objective
 */
export async function getContributors(pool, objectiveId) {
  const { rows } = await pool.query(
    `SELECT oc.id, oc.user_id, oc.role, oc.added_at,
            u.name, u.email, u.profile_picture
     FROM objective_contributors oc
     JOIN users u ON oc.user_id = u.id
     WHERE oc.objective_id = $1
     ORDER BY oc.added_at`,
    [objectiveId]
  );

  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    profilePicture: row.profile_picture,
    role: row.role,
    addedAt: row.added_at
  }));
}

/**
 * Add a contributor to an objective
 */
export async function addContributor(pool, objectiveId, userId, role = 'contributor') {
  // Check if already a contributor
  const existing = await pool.query(
    'SELECT id FROM objective_contributors WHERE objective_id = $1 AND user_id = $2',
    [objectiveId, userId]
  );

  if (existing.rows.length > 0) {
    throw new Error('User is already a contributor to this objective');
  }

  // Check if user is the owner
  const objective = await pool.query(
    'SELECT owner_id FROM objectives WHERE id = $1',
    [objectiveId]
  );

  if (objective.rows.length === 0) {
    throw new Error('Objective not found');
  }

  if (objective.rows[0].owner_id === userId) {
    throw new Error('The owner cannot be added as a contributor');
  }

  const { rows } = await pool.query(
    `INSERT INTO objective_contributors (objective_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, role, added_at`,
    [objectiveId, userId, role]
  );

  // Fetch user details
  const userResult = await pool.query(
    'SELECT name, email, profile_picture FROM users WHERE id = $1',
    [userId]
  );

  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    name: userResult.rows[0].name,
    email: userResult.rows[0].email,
    profilePicture: userResult.rows[0].profile_picture,
    role: rows[0].role,
    addedAt: rows[0].added_at
  };
}

/**
 * Remove a contributor from an objective
 */
export async function removeContributor(pool, objectiveId, contributorId) {
  const { rowCount } = await pool.query(
    'DELETE FROM objective_contributors WHERE objective_id = $1 AND id = $2',
    [objectiveId, contributorId]
  );

  return rowCount > 0;
}

/**
 * Update contributor role
 */
export async function updateContributorRole(pool, contributorId, role) {
  const { rows, rowCount } = await pool.query(
    `UPDATE objective_contributors
     SET role = $2
     WHERE id = $1
     RETURNING id, user_id, role, added_at`,
    [contributorId, role]
  );

  if (rowCount === 0) {
    return null;
  }

  // Fetch user details
  const userResult = await pool.query(
    'SELECT name, email, profile_picture FROM users WHERE id = $1',
    [rows[0].user_id]
  );

  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    name: userResult.rows[0].name,
    email: userResult.rows[0].email,
    profilePicture: userResult.rows[0].profile_picture,
    role: rows[0].role,
    addedAt: rows[0].added_at
  };
}

/**
 * Get objectives where user is a contributor
 */
export async function getMyContributions(pool, userId) {
  const { rows } = await pool.query(
    `SELECT o.*,
            u.name as owner_name,
            parent.title as parent_objective_title,
            t.name as team_name,
            oc.role as contributor_role
     FROM objective_contributors oc
     JOIN objectives o ON oc.objective_id = o.id
     JOIN users u ON o.owner_id = u.id
     LEFT JOIN objectives parent ON o.parent_objective_id = parent.id
     LEFT JOIN teams t ON o.team_id = t.id
     WHERE oc.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );

  // Fetch key results for each objective
  const objectives = await Promise.all(
    rows.map(async (row) => {
      const krResult = await pool.query(
        'SELECT * FROM key_results WHERE objective_id = $1 ORDER BY created_at',
        [row.id]
      );
      const transformed = transformObjective(row, krResult.rows);
      transformed.contributorRole = row.contributor_role;
      return transformed;
    })
  );

  return objectives;
}
