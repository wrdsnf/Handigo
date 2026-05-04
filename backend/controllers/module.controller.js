const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Ambil semua modul
 *     description: Endpoint publik, tidak memerlukan autentikasi
 *     tags: [Modules]
 *     responses:
 *       200:
 *         description: List modul berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               - id: mod_1
 *                 title: Modul Dasar
 *                 description: Belajar dasar bahasa isyarat
 *                 sort_order: 1
 *               - id: mod_2
 *                 title: Modul Lanjutan
 *                 description: Level lanjut
 *                 sort_order: 2
 */
/**
 * GET /api/modules
 * Publik — tidak perlu auth
 */
async function getModules(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Ambil detail modul berdasarkan ID
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID modul
 *     responses:
 *       200:
 *         description: Detail modul ditemukan
 *         content:
 *           application/json:
 *             example:
 *               id: mod_1
 *               title: Modul Dasar
 *               description: Belajar dasar bahasa isyarat
 *               sort_order: 1
 *       404:
 *         description: Modul tidak ditemukan
 *         content:
 *           application/json:
 *             example:
 *               error: Modul tidak ditemukan.
 */
/**
 * GET /api/modules/:id
 */
async function getModuleById(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: 'Modul tidak ditemukan.' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}


/**
 * @swagger
 * /api/modules/{id}/exercises:
 *   get:
 *     summary: Ambil semua exercise dalam modul
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID modul
 *     responses:
 *       200:
 *         description: List exercise dalam modul
 *         content:
 *           application/json:
 *             example:
 *               - id: ex_1
 *                 title: Huruf A
 *                 module_id: mod_1
 *                 sort_order: 1
 *               - id: ex_2
 *                 title: Huruf B
 *                 module_id: mod_1
 *                 sort_order: 2
 */
/**
 * GET /api/modules/:id/exercises
 */
async function getModuleExercises(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('module_id', id)
      .order('sort_order');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getModules, getModuleById, getModuleExercises };