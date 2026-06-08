const pool = require('../config/db'); // Menggunakan config Neon pg kamu

/**
 * GET /api/profile
 * Mengambil profil user yang sedang login
 */
async function getProfile(req, res, next) {
  try {
    // 1. Ambil ID langsung dari req.user hasil decode Custom JWT kita
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - ID user tidak ditemukan' });
    }

    // 2. Ambil data dari tabel profiles menggunakan pool pg
    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1 LIMIT 1',
      [userId]
    );
    const data = result.rows[0];

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
 * Mengupdate data profil secara dinamis
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

    // Menyusun query update dinamis agar tidak menimpa data dengan 'undefined'
    const queryFields = [];
    const queryValues = [];
    let counter = 1;

    if (full_name !== undefined) {
      queryFields.push(`full_name = $${counter++}`);
      queryValues.push(full_name);
    }

    if (avatar_url !== undefined) {
      queryFields.push(`avatar_url = $${counter++}`);
      queryValues.push(avatar_url);
    }

    // Jika tidak ada data yang dikirim untuk diupdate
    if (queryFields.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diubah' });
    }

    // Selalu update kolom updated_at dengan penanda waktu saat ini di Postgres
    queryFields.push(`updated_at = NOW()`);

    // Tambahkan userId di akhir array parameter sebagai kondisi WHERE
    queryValues.push(userId);
    const userIdPosition = counter;

    // Gabungkan komponen menjadi kueri SQL utuh
    const queryText = `
      UPDATE profiles 
      SET ${queryFields.join(', ')} 
      WHERE id = $${userIdPosition} 
      RETURNING *
    `;

    // 4. Eksekusi update kueri ke Neon
    const result = await pool.query(queryText, queryValues);
    const updatedData = result.rows[0];

    if (!updatedData) {
      return res.status(404).json({ error: 'Gagal update, profil tidak ditemukan' });
    }

    return res.json(updatedData);

  } catch (err) {
    console.error('UPDATE PROFILE CRASH:', err);
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};