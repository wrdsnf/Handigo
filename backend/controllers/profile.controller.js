const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * GET /api/profile
 */
async function getProfile(req, res, next) {
  try {
    // 1. Ambil ID langsung dari req.user hasil decode Custom JWT kita
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - ID user tidak ditemukan' });
    }

    // 2. Ambil data dari tabel profiles menggunakan supabase biasa
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: 'Database error',
        detail: error.message,
      });
    }

    // Jika data profil tidak ditemukan di database
    if (!data) {
      return res.status(404).json({ error: 'Profil tidak ditemukan' });
    }

    // 3. Susun data yang aman (Source of Truth langsung dari baris tabel profiles)
    const safeData = {
      id: data.id,
      email: data.email || req.user.email, // Ambil dari DB, jika kosong fallback ke JWT
      full_name: data.full_name || '',
      avatar_url: data.avatar_url || null,
      created_at: data.created_at || null,
    };

    return res.json(safeData);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile
 */
async function updateProfile(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized - no user'
      });
    }

    const userId = req.user.id;
    const { full_name, avatar_url } = req.body;

    // Menghapus variable email dari req.body karena email bersifat unik 
    // dan tidak boleh diubah sembarangan tanpa validasi ulang.

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updatePayload.full_name = full_name;
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;

    // 4. Update data profil menggunakan kustom ID yang kita punya
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('SUPABASE UPDATE ERROR:', error);
      return res.status(500).json({
        error: 'Failed to update profile',
        detail: error.message,
      });
    }

    return res.json(data);

  } catch (err) {
    console.error('UPDATE PROFILE CRASH:', err);
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};