const jwt = require('jsonwebtoken');

async function authenticate(req, res, next) {
  try {
    console.log('=== AUTH DEBUG ===');
    console.log('Cookies:', req.cookies);

    const token = req.cookies?.access_token;

    console.log('Token:', token);

    if (!token) {
      return res.status(401).json({
        error: 'Belum login'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log('Decoded:', decoded);

    req.user = decoded;
    req.accessToken = token;

    next();
  } catch (err) {
    console.error('JWT ERROR:', err);

    return res.status(401).json({
      error: err.message
    });
  }
}

module.exports = { authenticate };