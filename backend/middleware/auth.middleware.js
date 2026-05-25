const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase'); // Tetap di-import jika sewaktu-waktu butuh query DB tambahan

async function authenticate(req, res, next) {
  try {
    console.log('COOKIES ACCESSED:', req.cookies);
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ error: 'Belum login' });
    }

    // 🔥 VERIFIKASI PAKAI JWT SECRET MILIKMU (Bukan Supabase Auth)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Simpan data hasil decode token (id, email, full_name) ke objek req
      req.user = decoded; 
      req.accessToken = token; // 🔥 Tetap dipertahankan sesuai kebutuhanmu
      
      console.log('DECODED USER SUCCESS:', req.user);
      next();
    } catch (jwtError) {
      console.log('JWT VERIFY FAILED:', jwtError.message);
      return res.status(401).json({ error: 'Token invalid / expired' });
    }

  } catch (err) {
    console.log('SYSTEM AUTH ERROR:', err);
    return res.status(500).json({ error: 'Internal Server Error pada Middleware Auth' });
  }
}

module.exports = { authenticate };