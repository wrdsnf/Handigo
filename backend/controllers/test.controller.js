const pool = require('../config/db');

// Mulai Test & Generate Soal
const startTest = async (req, res, next) => {
  try {
    const userId = req.user.id; // Asumsi dari middleware authentication
    const { moduleId } = req.params;

    // Ambil 5 soal random
    const questions = await pool.query(`
      SELECT id, question_text, reference_image_url
      FROM test_questions
      WHERE module_id = $1
      ORDER BY RANDOM()
      LIMIT 5
    `, [moduleId]);

    // Buat session baru
    const session = await pool.query(`
      INSERT INTO test_sessions (user_id, module_id)
      VALUES ($1, $2)
      RETURNING id, started_at
    `, [userId, moduleId]);

    return res.json({
      session: session.rows[0],
      questions: questions.rows
    });
  } catch (err) {
    next(err);
  }
};

// Simpan Jawaban per Soal
const submitAnswer = async (req, res, next) => {
  try {
    const {
      sessionId,
      questionId,
      questionOrder,
      durationMs,
      peekCount,
      screenshotUrl
    } = req.body;

    const result = await pool.query(`
      INSERT INTO test_answers (
        session_id, question_id, question_order, duration_ms, peek_count, screenshot_url
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [sessionId, questionId, questionOrder, durationMs, peekCount, screenshotUrl]);

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// Akhiri Test, Hitung Skor & Return Format Dashboard
const finishTest = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Ambil jawaban beserta nama target/soalnya
    const answersQuery = await pool.query(`
      SELECT 
        a.duration_ms, 
        a.peek_count, 
        q.question_text AS target
      FROM test_answers a
      JOIN test_questions q ON a.question_id = q.id
      WHERE a.session_id = $1
      ORDER BY a.question_order ASC
    `, [sessionId]);

    const answers = answersQuery.rows;

    if (answers.length === 0) {
      return res.status(400).json({ error: "No answers found for this session." });
    }

    // Kalkulasi
    const totalDurationMs = answers.reduce((sum, row) => sum + parseInt(row.duration_ms), 0);
    const totalPeeks = answers.reduce((sum, row) => sum + row.peek_count, 0);
    const avgDuration = totalDurationMs / answers.length;

    // Logic Penilaian (seperti request)
    let score;
    if (avgDuration <= 3000) score = 100;
    else if (avgDuration <= 5000) score = 90;
    else if (avgDuration <= 8000) score = 80;
    else if (avgDuration <= 12000) score = 70;
    else score = 60;

    // Penalti
    score -= totalPeeks * 2;
    score = Math.max(0, score); // Cegah skor minus

    // Update Session
    await pool.query(`
      UPDATE test_sessions
      SET total_duration_ms = $1, total_peeks = $2, score = $3, finished_at = NOW()
      WHERE id = $4
    `, [totalDurationMs, totalPeeks, score, sessionId]);

    // Format output untuk Dashboard
    const dashboardResult = {
      score: score,
      totalDurationMs: totalDurationMs,
      totalPeeks: totalPeeks,
      questions: answers.map(ans => ({
        target: ans.target,
        durationMs: parseInt(ans.duration_ms),
        peekCount: ans.peek_count
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