const pool = require('../config/db'); // Menggunakan config Neon pg kamu

/**
 * GET /api/progress
 * Ambil semua progress user untuk semua modul
 */
async function getAllProgress(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM user_progress WHERE user_id = $1',
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/progress/:moduleId
 * Ambil progress user untuk 1 modul
 */
async function getModuleProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const { moduleId } = req.params;

    const result = await pool.query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND module_id = $2 LIMIT 1',
      [userId, moduleId]
    );
    const data = result.rows[0];

    return res.json(data || null);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/progress/:moduleId
 * Upsert progress — tidak pernah mundur
 */
async function upsertModuleProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const { moduleId } = req.params;
    const { completed_exercises, progress_percentage, last_exercise_index } = req.body;

    // 1. Ambil progress lama dari Neon untuk komparasi Math.max
    const existingResult = await pool.query(
      'SELECT completed_exercises, progress_percentage, last_exercise_index FROM user_progress WHERE user_id = $1 AND module_id = $2 LIMIT 1',
      [userId, moduleId]
    );
    const existing = existingResult.rows[0];

    const safeCompleted = Math.max(
      existing?.completed_exercises || 0,
      completed_exercises || 0
    );

    const safePct = Math.max(
      existing?.progress_percentage || 0,
      progress_percentage || 0
    );

    const safeLastIndex = Math.max(
      existing?.last_exercise_index || 0,
      last_exercise_index || 0
    );

    // 2. Lakukan UPSERT menggunakan klausa ON CONFLICT PostgreSQL
    const upsertQuery = `
      INSERT INTO user_progress (
        user_id, module_id, completed_exercises, progress_percentage, last_exercise_index, last_accessed_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, module_id)
      DO UPDATE SET
        completed_exercises = EXCLUDED.completed_exercises,
        progress_percentage = EXCLUDED.progress_percentage,
        last_exercise_index = EXCLUDED.last_exercise_index,
        last_accessed_at = EXCLUDED.last_accessed_at
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [
      userId,
      moduleId,
      safeCompleted,
      safePct,
      safeLastIndex
    ]);

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/progress/last-accessed
 * Modul terakhir yang diakses user
 */
async function getLastAccessed(req, res, next) {
  try {
    const userId = req.user.id;

    // Menggunakan LEFT JOIN untuk mengambil data judul modul
    const query = `
      SELECT up.*, m.title AS module_title
      FROM user_progress up
      LEFT JOIN modules m ON up.module_id = m.id
      WHERE up.user_id = $1
      ORDER BY up.last_accessed_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    if (!row) {
      return res.json(null);
    }

    
    const data = {
      id: row.id,
      user_id: row.user_id,
      module_id: row.module_id,
      completed_exercises: row.completed_exercises,
      progress_percentage: row.progress_percentage,
      last_exercise_index: row.last_exercise_index,
      last_accessed_at: row.last_accessed_at,
      modules: {
        title: row.module_title
      }
    };

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/progress/dashboard
 * Statistik dashboard user
 */
async function getDashboardStats(req, res, next) {
  try {
    const userId = req.user.id;

    // Menjalankan query secara paralel menggunakan Promise.all pada pool pg
    const [progressResult, resultsResult] = await Promise.all([
      pool.query('SELECT * FROM user_progress WHERE user_id = $1', [userId]),
      pool.query('SELECT accuracy, created_at FROM exercise_results WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
    ]);

    const progress = progressResult.rows;
    const results = resultsResult.rows;

    const completedModules = progress.filter(p => p.progress_percentage >= 100).length;

    const accuracies = results.map(r => r.accuracy).filter(Boolean);

    const avgAccuracy = accuracies.length > 0
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

    // Hitung streak harian aktivitas user
    const daySet = new Set(
      results.map(r => new Date(r.created_at).toISOString().split('T')[0])
    );

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];

      if (daySet.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Penyusunan data chart untuk grafik aktivitas 7 hari terakhir
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const weekData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];

      const dayResults = results.filter(
        r => new Date(r.created_at).toISOString().split('T')[0] === key
      );

      const dayAvg = dayResults.length > 0
        ? Math.round(dayResults.reduce((a, r) => a + (r.accuracy || 0), 0) / dayResults.length)
        : 0;

      return {
        day: dayNames[d.getDay()],
        accuracy: dayAvg
      };
    });

    return res.json({
      completedModules,
      avgAccuracy,
      streak,
      weekData,
      totalResults: results.length,
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllProgress,
  getModuleProgress,
  upsertModuleProgress,
  getLastAccessed,
  getDashboardStats,
};