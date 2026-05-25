
async function verifySign(req, res, next) {
  try {
    const { image_base64, expected_sign, exercise_id } = req.body;

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

    res.json({
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


async function getDetectionStatus(req, res) {
  res.json({
    status: 'simulation', // Ganti jadi 'active' kalau sudah pakai model AI
    message: 'Deteksi berjalan dalam mode simulasi. Integrasikan MediaPipe untuk deteksi nyata.',
    recommendation: 'Gunakan @mediapipe/hands di frontend untuk real-time detection tanpa server.',
  });
}

module.exports = { verifySign, getDetectionStatus };