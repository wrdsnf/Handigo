const pool = require('../config/db'); // Diimpor jika kamu ingin menyimpan riwayat ke Neon

/**
 * POST /api/auth/verify-sign
 * Verifikasi hasil tangkapan isyarat tangan
 */
async function verifySign(req, res, next) {
  try {
    const { image_base64, expected_sign, exercise_id } = req.body;
    
    // Mengambil user ID dari middleware authentication jika kamu memasangnya di route
    const userId = req.user?.id; 

    if (!expected_sign) {
      return res.status(400).json({ error: 'expected_sign wajib diisi.' });
    }

    // ============================================================
    // SIMULASI — ganti bagian ini dengan model AI sungguhan
    // ============================================================
    const accuracy = Math.floor(Math.random() * 40) + 55; // 55-95
    const detected = accuracy >= 60;
    const detected_sign = detected ? expected_sign : null;
    // ============================================================

    // ============================================================
    // OPSI NEON DB: Menyimpan riwayat percobaan user (Buka komen jika tabelnya ada)
    // ============================================================
    /*
    if (userId && exercise_id) {
      await pool.query(
        `INSERT INTO user_attempts (user_id, exercise_id, accuracy, is_success, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, exercise_id, accuracy, detected]
      );
    }
    */

    return res.json({
      detected,
      detected_sign,
      expected_sign,
      accuracy,
      message: detected
        ? `Isyarat "${expected_sign}" terdeteksi dengan akurasi ${accuracy}%`
        : 'Isyarat tidak terdeteksi, coba lagi.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/detection-status
 * Cek status sistem deteksi
 */
async function getDetectionStatus(req, res) {
  return res.json({
    status: 'simulation', // Ganti jadi 'active' kalau sudah pakai model AI nyata
    message: 'Deteksi berjalan dalam mode simulasi. Integrasikan MediaPipe untuk deteksi nyata.',
    recommendation: 'Gunakan @mediapipe/hands di frontend untuk real-time detection tanpa membebani server.',
  });
}

module.exports = { 
  verifySign, 
  getDetectionStatus 
};