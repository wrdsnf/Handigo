const pool = require('../config/db'); // Pastikan path config Neon sudah benar

/**
 * GET /api/exercises/:id
 */
async function getExerciseById(req, res, next) {
  try {
    const { id } = req.params;

    // Menggunakan query SELECT standar PostgreSQL
    const result = await pool.query(
      'SELECT * FROM exercises WHERE id = $1 LIMIT 1', 
      [id]
    );
    const data = result.rows[0];

    if (!data) {
      return res.status(404).json({ error: 'Latihan tidak ditemukan.' });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/exercises/:id/result
 */
async function saveExerciseResult(req, res, next) {
  try {
    const { id: exerciseId } = req.params;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terautentikasi atau ID pengguna tidak valid.' });
    }
    const userId = req.user.id;

    const { score, accuracy, attempts, time_seconds, module_id } = req.body;

    if (!module_id || score == null || accuracy == null) {
      return res.status(400).json({
        error: 'module_id, score, dan accuracy wajib diisi.',
      });
    }

    // Menggunakan INSERT INTO dengan RETURNING * untuk mendapatkan data yang baru dibuat
    const result = await pool.query(
      `INSERT INTO exercise_results (
        user_id, module_id, exercise_id, score, accuracy, attempts, time_seconds
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId, 
        module_id, 
        exerciseId, 
        score, 
        accuracy, 
        attempts || 1, 
        time_seconds || 0
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    // Menangkap error foreign key PostgreSQL secara spesifik (kode error: 23503)
    if (err.code === '23503') {
      return res.status(400).json({ 
        error: 'Gagal menyimpan hasil. Referensi User ID atau ID Latihan tidak ditemukan di database.' 
      });
    }
    next(err);
  }
}

/**
 * GET /api/exercises/results
 */
async function getUserResults(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terautentikasi.' });
    }
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    // Menggabungkan data relasi menggunakan LEFT JOIN
    const query = `
      SELECT er.*, m.title AS module_title, ex.title AS exercise_title
      FROM exercise_results er
      LEFT JOIN modules m ON er.module_id = m.id
      LEFT JOIN exercises ex ON er.exercise_id = ex.id
      WHERE er.user_id = $1
      ORDER BY er.created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);

    
    const data = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      module_id: row.module_id,
      exercise_id: row.exercise_id,
      score: row.score,
      accuracy: row.accuracy,
      attempts: row.attempts,
      time_seconds: row.time_seconds,
      created_at: row.created_at,
      modules: { title: row.module_title },
      exercises: { title: row.exercise_title }
    }));

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/exercises/results/latest
 */
async function getLatestResult(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terautentikasi.' });
    }
    const userId = req.user.id;

    const query = `
      SELECT er.*, ex.title AS exercise_title, ex.sort_order AS exercise_sort_order, m.title AS module_title
      FROM exercise_results er
      LEFT JOIN exercises ex ON er.exercise_id = ex.id
      LEFT JOIN modules m ON er.module_id = m.id
      WHERE er.user_id = $1
      ORDER BY er.created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({
        error: 'Belum ada hasil latihan.',
      });
    }

    // Mapping agar berwujud nested object
    const data = {
      id: row.id,
      user_id: row.user_id,
      module_id: row.module_id,
      exercise_id: row.exercise_id,
      score: row.score,
      accuracy: row.accuracy,
      attempts: row.attempts,
      time_seconds: row.time_seconds,
      created_at: row.created_at,
      exercises: { title: row.exercise_title, sort_order: row.exercise_sort_order },
      modules: { title: row.module_title }
    };

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/exercises/results/latest/next
 */
async function getLatestResultAndRecommendedNext(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User tidak terautentikasi.' });
    }
    const userId = req.user.id;

    // 1. Ambil latest result beserta relasinya
    const latestQuery = `
      SELECT er.*, 
             ex.id AS ex_id, ex.title AS ex_title, ex.sort_order AS ex_sort_order, ex.module_id AS ex_module_id,
             m.id AS m_id, m.title AS m_title
      FROM exercise_results er
      LEFT JOIN exercises ex ON er.exercise_id = ex.id
      LEFT JOIN modules m ON er.module_id = m.id
      WHERE er.user_id = $1
      ORDER BY er.created_at DESC
      LIMIT 1
    `;
    const latestResult = await pool.query(latestQuery, [userId]);
    const row = latestResult.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Belum ada hasil latihan.' });
    }

    const latest = {
      id: row.id,
      user_id: row.user_id,
      module_id: row.module_id,
      exercise_id: row.exercise_id,
      score: row.score,
      accuracy: row.accuracy,
      attempts: row.attempts,
      time_seconds: row.time_seconds,
      created_at: row.created_at,
      exercises: { id: row.ex_id, title: row.ex_title, sort_order: row.ex_sort_order, module_id: row.ex_module_id },
      modules: { id: row.m_id, title: row.m_title }
    };

    const moduleId = latest.module_id;
    const latestExerciseId = latest.exercises?.id;

    // 2. Ambil SEMUA latihan dalam modul tersebut
    const exercisesResult = await pool.query(
      'SELECT id, title, sort_order FROM exercises WHERE module_id = $1 ORDER BY sort_order ASC',
      [moduleId]
    );
    const allExercises = exercisesResult.rows;

    // 3. Buang latihan terakhir yang sudah selesai
    const nextExercises = allExercises.filter(ex => ex.id !== latestExerciseId);

    return res.json({
      latest,
      nextExercises,
      meta: {
        moduleId,
        latestExerciseId,
        mode: 'all-minus-latest',
      },
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExerciseById,
  saveExerciseResult,
  getUserResults,
  getLatestResult,
  getLatestResultAndRecommendedNext,
};