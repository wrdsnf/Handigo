const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');

// Middleware dummy untuk simulasi req.user.id (Hapus dan ganti dengan JWT auth sungguhan)
const mockAuth = (req, res, next) => {
  req.user = { id: 'uuid-user-anda-disini' };
  next();
};

router.use(mockAuth);

router.get('/:moduleId/start', testController.startTest);
router.post('/answer', testController.submitAnswer);
router.post('/:sessionId/finish', testController.finishTest);

module.exports = router;