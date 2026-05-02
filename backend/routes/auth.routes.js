const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, googleLogin, completeProfile } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/google', googleLogin);
router.post('/complete-profile', completeProfile);

module.exports = router;

