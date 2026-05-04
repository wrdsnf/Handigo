const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Ambil data profil user yang sedang login
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Data profil berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               id: user_123
 *               email: user@mail.com
 *               full_name: Budi Santoso
 *               avatar_url: https://example.com/avatar.png
 *               created_at: 2026-01-01T10:00:00Z
 *       404:
 *         description: Profil tidak ditemukan
 *         content:
 *           application/json:
 *             example:
 *               error: Profil tidak ditemukan.
 */
/**
 * GET /api/profile
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return res.status(404).json({ error: 'Profil tidak ditemukan.' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update profil user
 *     tags: [Profile]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Budi Santoso
 *               avatar_url:
 *                 type: string
 *                 example: https://example.com/avatar.png
 *     responses:
 *       200:
 *         description: Profil berhasil diupdate
 *         content:
 *           application/json:
 *             example:
 *               id: user_123
 *               full_name: Budi Santoso
 *               avatar_url: https://example.com/avatar.png
 *               updated_at: 2026-01-01T10:00:00Z
 *       500:
 *         description: Gagal update profil
 */
/**
 * PUT /api/profile
 * Body: { full_name, avatar_url, ... }
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name, avatar_url, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };