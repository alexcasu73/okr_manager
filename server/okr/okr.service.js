/**
 * OKR Service - Business logic for Objectives and Key Results
 */

// Transform DB row to API format
function transformObjective(row, keyResults = []) {
  return {
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
    updatedAt: row.updated_at
  };
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

// Determine status based on progress and due date
function determineStatus(progress, dueDate) {
  if (progress >= 100) return 'completed';

  const now = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'off-track';
  if (progress < 25 && daysUntilDue < 30) return 'off-track';
  if (progress < 50 && daysUntilDue < 30) return 'at-risk';
  if (progress < 70 && daysUntilDue < 14) return 'at-risk';

  return 'on-track';
}

// === OBJECTIVES ===

export async function getObjectives(pool, filters = {}) {
  const { ownerId, level, period, status } = filters;
  let query = `
    SELECT o.*, u.name as owner_name
    FROM objectives o
    JOIN users u ON o.owner_id = u.id
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
    `SELECT o.*, u.name as owner_name
     FROM objectives o
     JOIN users u ON o.owner_id = u.id
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
  const { title, description, level, period, dueDate, keyResults = [] } = data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create objective
    const { rows } = await client.query(
      `INSERT INTO objectives (title, description, owner_id, level, period, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [title, description, userId, level, period, dueDate]
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

    return transformObjective(objective, createdKeyResults);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateObjective(pool, id, data, userId) {
  const { title, description, level, period, dueDate, status } = data;

  const { rows } = await pool.query(
    `UPDATE objectives
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         level = COALESCE($3, level),
         period = COALESCE($4, period),
         due_date = COALESCE($5, due_date),
         status = COALESCE($6, status),
         updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [title, description, level, period, dueDate, status, id]
  );

  if (rows.length === 0) return null;

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
    'SELECT due_date FROM objectives WHERE id = $1',
    [objectiveId]
  );

  const status = objective[0]?.due_date
    ? determineStatus(progress, objective[0].due_date)
    : progress >= 100 ? 'completed' : 'on-track';

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
