/**
 * Subscription Limits Service
 * Manages Free vs Premium tier limits
 */

// Free tier limits (per role)
export const FREE_LIMITS = {
  users: {
    admins: 1,
    leads: 1,
    users: 1
  },
  okrsPerRole: {
    admin: 1,
    lead: 1,
    user: 1
  },
  krsPerOkr: 2
};

/**
 * Get current usage for a company
 * @param {Pool} pool - Database pool
 * @param {string} companyId - Company (azienda) ID
 * @returns {Promise<object>}
 */
export async function getCompanyUsage(pool, companyId) {
  // Count users by role
  const usersResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE role = 'admin') as admins,
      COUNT(*) FILTER (WHERE role = 'lead') as leads,
      COUNT(*) FILTER (WHERE role = 'user') as users
    FROM users
    WHERE company_id = $1
  `, [companyId]);

  // Count OKRs per role
  const okrsResult = await pool.query(`
    SELECT u.role, COUNT(o.id) as count
    FROM users u
    LEFT JOIN objectives o ON o.owner_id = u.id
    WHERE u.company_id = $1 OR u.id = $1
    GROUP BY u.role
  `, [companyId]);

  const okrsByRole = {};
  okrsResult.rows.forEach(row => {
    okrsByRole[row.role] = parseInt(row.count) || 0;
  });

  // Count total OKRs and KRs
  const totalsResult = await pool.query(`
    SELECT
      COUNT(DISTINCT o.id) as total_okrs,
      COUNT(kr.id) as total_krs
    FROM objectives o
    JOIN users u ON o.owner_id = u.id
    LEFT JOIN key_results kr ON kr.objective_id = o.id
    WHERE u.company_id = $1 OR u.id = $1
  `, [companyId]);

  return {
    users: {
      admins: parseInt(usersResult.rows[0].admins) || 0,
      leads: parseInt(usersResult.rows[0].leads) || 0,
      users: parseInt(usersResult.rows[0].users) || 0
    },
    okrsByRole: {
      admin: okrsByRole.admin || 0,
      lead: okrsByRole.lead || 0,
      user: okrsByRole.user || 0
    },
    totals: {
      okrs: parseInt(totalsResult.rows[0].total_okrs) || 0,
      keyResults: parseInt(totalsResult.rows[0].total_krs) || 0
    }
  };
}

/**
 * Get OKR count for a specific user
 * @param {Pool} pool - Database pool
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
export async function getUserOKRCount(pool, userId) {
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM objectives WHERE owner_id = $1
  `, [userId]);
  return parseInt(result.rows[0].count) || 0;
}

/**
 * Get KR count for a specific OKR
 * @param {Pool} pool - Database pool
 * @param {string} objectiveId - Objective ID
 * @returns {Promise<number>}
 */
export async function getOKRKeyResultCount(pool, objectiveId) {
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM key_results WHERE objective_id = $1
  `, [objectiveId]);
  return parseInt(result.rows[0].count) || 0;
}

/**
 * Check if company is on premium tier
 * @param {Pool} pool - Database pool
 * @param {string} companyId - Company (azienda) ID
 * @returns {Promise<boolean>}
 */
export async function isPremium(pool, companyId) {
  const result = await pool.query(`
    SELECT subscription_tier FROM users WHERE id = $1
  `, [companyId]);

  return result.rows[0]?.subscription_tier === 'premium';
}

/**
 * Check if a user can be created (based on role limits)
 * @param {Pool} pool - Database pool
 * @param {string} companyId - Company (azienda) ID
 * @param {string} role - Role of the new user
 * @returns {Promise<{allowed: boolean, error?: string, usage?: object, limits?: object}>}
 */
export async function canCreateUser(pool, companyId, role) {
  // Premium companies have no limits
  if (await isPremium(pool, companyId)) {
    return { allowed: true };
  }

  const usage = await getCompanyUsage(pool, companyId);

  const roleKey = role === 'admin' ? 'admins' : role === 'lead' ? 'leads' : 'users';
  const currentCount = usage.users[roleKey];
  const limit = FREE_LIMITS.users[roleKey];

  if (currentCount >= limit) {
    return {
      allowed: false,
      error: `Hai raggiunto il limite di ${limit} ${roleKey} per il piano Free. Passa a Premium per aggiungere più utenti.`,
      usage,
      limits: FREE_LIMITS
    };
  }

  return { allowed: true, usage, limits: FREE_LIMITS };
}

/**
 * Check if an OKR can be created by a specific user
 * @param {Pool} pool - Database pool
 * @param {string} companyId - Company (azienda) ID
 * @param {string} userId - User creating the OKR
 * @param {string} userRole - Role of the user creating the OKR
 * @returns {Promise<{allowed: boolean, error?: string, usage?: object, limits?: object}>}
 */
export async function canCreateOKR(pool, companyId, userId, userRole) {
  // Premium companies have no limits
  if (await isPremium(pool, companyId)) {
    return { allowed: true };
  }

  // Check how many OKRs this user already has
  const userOKRCount = await getUserOKRCount(pool, userId);
  const roleLimit = FREE_LIMITS.okrsPerRole[userRole] || 1;

  if (userOKRCount >= roleLimit) {
    return {
      allowed: false,
      error: `Hai raggiunto il limite di ${roleLimit} OKR per il tuo ruolo (${userRole}) nel piano Free. Passa a Premium per creare più OKR.`,
      limits: FREE_LIMITS
    };
  }

  return { allowed: true, limits: FREE_LIMITS };
}

/**
 * Check if a Key Result can be created for an OKR
 * @param {Pool} pool - Database pool
 * @param {string} companyId - Company (azienda) ID
 * @param {string} objectiveId - Objective ID
 * @returns {Promise<{allowed: boolean, error?: string, usage?: object, limits?: object}>}
 */
export async function canCreateKeyResult(pool, companyId, objectiveId) {
  // Premium companies have no limits
  if (await isPremium(pool, companyId)) {
    return { allowed: true };
  }

  // Check how many KRs this OKR already has
  const krCount = await getOKRKeyResultCount(pool, objectiveId);
  const limit = FREE_LIMITS.krsPerOkr;

  if (krCount >= limit) {
    return {
      allowed: false,
      error: `Hai raggiunto il limite di ${limit} Key Results per OKR nel piano Free. Passa a Premium per aggiungere più Key Results.`,
      limits: FREE_LIMITS
    };
  }

  return { allowed: true, limits: FREE_LIMITS };
}

/**
 * Get subscription info for a company (usage + limits)
 * @param {Pool} pool - Database pool
 * @param {string} companyId - Company (azienda) ID
 * @returns {Promise<{tier: string, usage: object, limits: object|null}>}
 */
export async function getSubscriptionInfo(pool, companyId) {
  const premium = await isPremium(pool, companyId);
  const usage = await getCompanyUsage(pool, companyId);

  return {
    tier: premium ? 'premium' : 'free',
    usage,
    limits: premium ? null : FREE_LIMITS
  };
}

export default {
  FREE_LIMITS,
  getCompanyUsage,
  getUserOKRCount,
  getOKRKeyResultCount,
  isPremium,
  canCreateUser,
  canCreateOKR,
  canCreateKeyResult,
  getSubscriptionInfo
};
