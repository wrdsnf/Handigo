const { supabase } = require('../config/supabase');

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: API Progress User
 */

/**
 * @swagger
 * /api/progress:
 *   get:
 *     summary: Ambil semua progress user
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List progress semua modul
 *         content:
 *           application/json:
 *             example:
 *               - module_id: mod_1
 *                 completed_exercises: 5
 *                 progress_percentage: 50
 *                 last_exercise_index: 4
 */

/**
 * GET /api/progress
 * Ambil semua progress user untuk semua modul
 */
async function getAllProgress(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/progress/{moduleId}:
 *   get:
 *     summary: Ambil progress user untuk satu modul
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID modul
 *     responses:
 *       200:
 *         description: Data progress modul
 *         content:
 *           application/json:
 *             example:
 *               module_id: mod_1
 *               completed_exercises: 5
 *               progress_percentage: 50
 *               last_exercise_index: 4
 */

/**
 * GET /api/progress/:moduleId
 * Ambil progress user untuk 1 modul
 */
async function getModuleProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const { moduleId } = req.params;

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (error) throw error;

    res.json(data || null);
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/progress/{moduleId}:
 *   put:
 *     summary: Update atau simpan progress modul
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID modul
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed_exercises:
 *                 type: number
 *                 example: 6
 *               progress_percentage:
 *                 type: number
 *                 example: 60
 *               last_exercise_index:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Progress berhasil diupdate
 *         content:
 *           application/json:
 *             example:
 *               module_id: mod_1
 *               completed_exercises: 6
 *               progress_percentage: 60
 *               last_exercise_index: 5
 *               last_accessed_at: 2026-01-01T10:00:00Z
 */

/**
 * PUT /api/progress/:moduleId
 * Upsert progress — tidak pernah mundur
 */
async function upsertModuleProgress(req, res, next) {
  try {
    const userId = req.user.id;

    const { moduleId } = req.params;

    const {
      completed_exercises,
      progress_percentage,
      last_exercise_index
    } = req.body;

    // Ambil progress lama
    const { data: existing } = await supabase
      .from('user_progress')
      .select(
        'completed_exercises, progress_percentage, last_exercise_index'
      )
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .maybeSingle();

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

    const { data, error } = await supabase
      .from('user_progress')
      .upsert(
        {
          user_id: userId,
          module_id: moduleId,
          completed_exercises: safeCompleted,
          progress_percentage: safePct,
          last_exercise_index: safeLastIndex,
          last_accessed_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,module_id'
        }
      )
      .select()
      .single();

    if (error) throw error;

    res.json(data);

  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/progress/last-accessed:
 *   get:
 *     summary: Ambil modul terakhir yang diakses user
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Data modul terakhir
 *         content:
 *           application/json:
 *             example:
 *               module_id: mod_1
 *               last_accessed_at: 2026-01-01T10:00:00Z
 *               modules:
 *                 title: Modul Dasar
 */

/**
 * GET /api/progress/last-accessed
 * Modul terakhir yang diakses user
 */
async function getLastAccessed(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_progress')
      .select('*, modules(*)')
      .eq('user_id', userId)
      .order('last_accessed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    res.json(data || null);

  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/progress/dashboard:
 *   get:
 *     summary: Ambil statistik dashboard user
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Statistik dashboard
 *         content:
 *           application/json:
 *             example:
 *               completedModules: 3
 *               avgAccuracy: 87
 *               streak: 5
 *               totalResults: 20
 *               weekData:
 *                 - day: Mon
 *                   accuracy: 80
 *                 - day: Tue
 *                   accuracy: 85
 */

/**
 * GET /api/progress/dashboard
 * Statistik dashboard user
 */
async function getDashboardStats(req, res, next) {
  try {
    const userId = req.user.id;

    const [
      { data: progress, error: pErr },
      { data: results, error: rErr }
    ] = await Promise.all([
      supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId),

      supabase
        .from('exercise_results')
        .select('accuracy, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (pErr) throw pErr;
    if (rErr) throw rErr;

    const completedModules = (progress || [])
      .filter(p => p.progress_percentage >= 100)
      .length;

    const accuracies = (results || [])
      .map(r => r.accuracy)
      .filter(Boolean);

    const avgAccuracy = accuracies.length > 0
      ? Math.round(
          accuracies.reduce((a, b) => a + b, 0) /
          accuracies.length
        )
      : 0;

    // Hitung streak
    const daySet = new Set(
      (results || []).map(r =>
        new Date(r.created_at)
          .toISOString()
          .split('T')[0]
      )
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

    // Data chart 7 hari
    const dayNames = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat'
    ];

    const weekData = Array.from(
      { length: 7 },
      (_, i) => {
        const d = new Date();

        d.setDate(d.getDate() - (6 - i));

        const key = d.toISOString().split('T')[0];

        const dayResults = (results || []).filter(r =>
          new Date(r.created_at)
            .toISOString()
            .split('T')[0] === key
        );

        const dayAvg = dayResults.length > 0
          ? Math.round(
              dayResults.reduce(
                (a, r) => a + (r.accuracy || 0),
                0
              ) / dayResults.length
            )
          : 0;

        return {
          day: dayNames[d.getDay()],
          accuracy: dayAvg
        };
      }
    );

    res.json({
      completedModules,
      avgAccuracy,
      streak,
      weekData,
      totalResults: (results || []).length,
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