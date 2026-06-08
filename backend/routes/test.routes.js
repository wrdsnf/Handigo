const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/:moduleId/start', testController.startTest);
router.post('/answer', testController.submitAnswer);
router.post('/:sessionId/finish', testController.finishTest);

router.get('/:moduleId/history', async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        id,
        total_duration_ms,
        total_peeks,
        score,
        correct_count,
        skipped_count,
        finished_at
      FROM test_sessions
      WHERE module_id = $1 AND user_id = $2
      ORDER BY finished_at DESC
    `, [moduleId, userId]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;