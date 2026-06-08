const jwt = require('jsonwebtoken');

async function authenticate(req, res, next) {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ error: 'Belum login' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;
    req.accessToken = token;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token invalid / expired'
    });
  }
}

module.exports = { authenticate };