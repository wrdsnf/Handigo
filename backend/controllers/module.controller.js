const pool = require('../config/db'); // Menggunakan config Neon pg kamu

/**
 * GET /api/modules
 * Mengambil semua modul diurutkan berdasarkan sort_order
 */
async function getModules(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM modules ORDER BY sort_order ASC'
    );
    
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/modules/:id
 * Mengambil satu modul spesifik berdasarkan ID
 */
async function getModuleById(req, res, next) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM modules WHERE id = $1 LIMIT 1', 
      [id]
    );
    const data = result.rows[0];

    if (!data) {
      return res.status(404).json({ error: 'Modul tidak ditemukan.' });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/modules/:id/exercises
 * Mengambil semua latihan yang ada di dalam modul tertentu
 */
async function getModuleExercises(req, res, next) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM exercises WHERE module_id = $1 ORDER BY sort_order ASC',
      [id]
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  getModules, 
  getModuleById, 
  getModuleExercises 
};