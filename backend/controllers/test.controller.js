const pool = require('../config/db');

// 1. Mulai Test & Generate 5 Soal Random dengan URL Mapping Aman
const startTest = async (req, res, next) => {
  try {
    const userId = req.user.id; 
    const { moduleId } = req.params;

    // Menggunakan m.target_signs::text[] agar aman baik berupa tipe array maupun string array format text
    // Ditambahkan kondisi 'AND tq.question_text = ANY(...)' untuk mencegah duplikasi baris akibat join module_id
    const questionsQuery = await pool.query(`
      SELECT 
        tq.id, 
        tq.question_text, 
        (m.reference_url::text[])[array_position(m.target_signs::text[], tq.question_text)] AS reference_image_url
      FROM test_questions tq
      JOIN exercises m ON tq.module_id = m.module_id 
        AND tq.question_text = ANY(m.target_signs::text[]) -- Ganti 'exercises' sesuai nama tabel modul/target tanda kamu
      WHERE tq.module_id = $1
      ORDER BY RANDOM()
      LIMIT 5
    `, [moduleId]);

    const questions = questionsQuery.rows;

    if (questions.length === 0) {
      return res.status(404).json({ error: "Tidak ada soal ditemukan untuk modul ini." });
    }

    // Buat session baru
    const session = await pool.query(`
      INSERT INTO test_sessions (user_id, module_id)
      VALUES ($1, $2)
      RETURNING id, started_at
    `, [userId, moduleId]);

    return res.json({
      session: session.rows[0],
      questions: questions
    });
  } catch (err) {
    next(err);
  }
};

// 2. Simpan Jawaban per Soal (Mendukung Fitur Skip)
const submitAnswer = async (req, res, next) => {
  try {
    const {
      sessionId,
      questionId,
      questionOrder,
      durationMs,
      peekCount,
      screenshotUrl,
      isSkipped // Frontend harus mengirimkan true/false di field ini
    } = req.body;

    const skipStatus = isSkipped || false;

    const result = await pool.query(`
      INSERT INTO test_answers (
        session_id, question_id, question_order, duration_ms, peek_count, screenshot_url, is_skipped
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [sessionId, questionId, questionOrder, durationMs, peekCount, screenshotUrl, skipStatus]);

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// 3. Akhiri Test, Hitung Skor Proporsional & Return Jumlah Benar/Skip
const finishTest = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Ambil semua jawaban untuk sesi ini
    const answersQuery = await pool.query(`
      SELECT 
        a.duration_ms, 
        a.peek_count,
        a.is_skipped, 
        q.question_text AS target
      FROM test_answers a
      JOIN test_questions q ON a.question_id = q.id
      WHERE a.session_id = $1
      ORDER BY a.question_order ASC
    `, [sessionId]);

    const answers = answersQuery.rows;

    if (answers.length === 0) {
      return res.status(400).json({ error: "Belum ada jawaban yang tersimpan untuk sesi ini." });
    }

    // Evaluasi status pengerjaan soal
    const answeredQuestions = answers.filter(a => !a.is_skipped);
    const correctCount = answeredQuestions.length; // Soal yang tidak di-skip dihitung benar
    const skippedCount = answers.filter(a => a.is_skipped).length;
    const totalQuestions = answers.length; 

    // Kalkulasi rata-rata durasi hanya dari soal yang tidak di-skip (valid dikerjakan)
    const totalDurationMs = answeredQuestions.reduce((sum, row) => sum + parseInt(row.duration_ms || 0), 0);
    const totalPeeks = answers.reduce((sum, row) => sum + (row.peek_count || 0), 0);
    const avgDuration = correctCount > 0 ? totalDurationMs / correctCount : 0;

    // Aturan Penilaian Dasar (Base Score) berdasarkan kecepatan respons jawaban benar
    let baseScore = 0;
    if (correctCount > 0) {
      if (avgDuration <= 3000) baseScore = 100;
      else if (avgDuration <= 5000) baseScore = 90;
      else if (avgDuration <= 8000) baseScore = 80;
      else if (avgDuration <= 12000) baseScore = 70;
      else baseScore = 60;
    }

    // Skor akhir disesuaikan dengan rasio jawaban benar (Skip tidak mendapat poin)
    // Rumus: (Skor Waktu * (Jumlah Benar / Total Soal)) - Penalti Intip
    let finalScore = totalQuestions > 0 ? (baseScore * (correctCount / totalQuestions)) - (totalPeeks * 2) : 0;
    finalScore = Math.max(0, Math.round(finalScore)); // Memastikan nilai tidak minus dan bulat

    // Update data Session di DB termasuk metrik correct & skipped
    await pool.query(`
      UPDATE test_sessions
      SET total_duration_ms = $1, 
          total_peeks = $2, 
          score = $3, 
          correct_count = $4, 
          skipped_count = $5, 
          finished_at = NOW()
      WHERE id = $6
    `, [totalDurationMs, totalPeeks, finalScore, correctCount, skippedCount, sessionId]);

    // Format Response JSON untuk kebutuhan Dashboard
    const dashboardResult = {
      score: finalScore,
      correctCount: correctCount,
      skippedCount: skippedCount,
      totalQuestions: totalQuestions,
      totalDurationMs: totalDurationMs,
      totalPeeks: totalPeeks,
      questions: answers.map(ans => ({
        target: ans.target,
        durationMs: parseInt(ans.duration_ms || 0),
        peekCount: ans.peek_count,
        isSkipped: ans.is_skipped
      }))
    };

    return res.json(dashboardResult);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startTest,
  submitAnswer,
  finishTest
};