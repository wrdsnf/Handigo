/**
 * Detection Controller
 * 
 * Saat ini menggunakan simulasi di sisi server.
 * Untuk produksi, ganti dengan integrasi model AI:
 * 
 * Opsi 1 (Recommended): MediaPipe di frontend (browser)
 *   - Tidak perlu kirim gambar ke server
 *   - Real-time, latensi rendah
 *   - Pakai: @mediapipe/hands + TensorFlow.js
 * 
 * Opsi 2: Kirim frame ke Python microservice
 *   - Lebih akurat, bisa pakai model custom
 *   - Endpoint ini forward ke Python service
 */

/**
 * @swagger
 * /api/detection/verify:
 *   post:
 *     summary: Verifikasi isyarat tangan (simulasi AI)
 *     tags: [Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expected_sign
 *             properties:
 *               image_base64:
 *                 type: string
 *                 description: Gambar dalam format base64 (opsional untuk simulasi)
 *                 example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...
 *               expected_sign:
 *                 type: string
 *                 example: A
 *               exercise_id:
 *                 type: string
 *                 example: ex_123
 *     responses:
 *       200:
 *         description: Hasil deteksi isyarat
 *         content:
 *           application/json:
 *             example:
 *               detected: true
 *               detected_sign: A
 *               expected_sign: A
 *               accuracy: 87
 *               message: Isyarat "A" terdeteksi dengan akurasi 87%
 *       400:
 *         description: Input tidak valid
 *         content:
 *           application/json:
 *             example:
 *               error: expected_sign wajib diisi.
 */

/**
 * POST /api/detection/verify
 * Body: { image_base64, expected_sign, exercise_id }
 * 
 * Untuk production: ganti simulasi dengan:
 * 1. Decode base64 image
 * 2. Kirim ke Python AI service atau
 * 3. Pakai MediaPipe Node.js binding
 */
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

/**
 * @swagger
 * /api/detection/status:
 *   get:
 *     summary: Cek status AI detection service
 *     tags: [Detection]
 *     responses:
 *       200:
 *         description: Status service
 *         content:
 *           application/json:
 *             example:
 *               status: simulation
 *               message: Deteksi berjalan dalam mode simulasi. Integrasikan MediaPipe untuk deteksi nyata.
 *               recommendation: Gunakan @mediapipe/hands di frontend untuk real-time detection tanpa server.
 */
/**
 * GET /api/detection/status
 * Cek apakah AI service aktif
 */
async function getDetectionStatus(req, res) {
  res.json({
    status: 'simulation', // Ganti jadi 'active' kalau sudah pakai model AI
    message: 'Deteksi berjalan dalam mode simulasi. Integrasikan MediaPipe untuk deteksi nyata.',
    recommendation: 'Gunakan @mediapipe/hands di frontend untuk real-time detection tanpa server.',
  });
}

module.exports = { verifySign, getDetectionStatus };