

const pool = require('../config/db'); // Menggunakan config Neon pg kamu
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



/**
 * POST /api/auth/register
 * Register user baru (Custom Table Auth)
 */
async function register(req, res, next) {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // 1. Cek apakah email sudah terdaftar
    const existingUser = await pool.query(
      'SELECT email FROM profiles WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email sudah terdaftar'
      });
    }

    // 2. Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Insert profile baru
    const result = await pool.query(
      `
      INSERT INTO profiles (
        email,
        password,
        full_name,
        avatar_url
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [email, hashedPassword, full_name, null]
    );

    const newProfile = result.rows[0];

    return res.status(201).json({
      message: 'Register berhasil',
      user: {
        id: newProfile.id,
        email: newProfile.email,
        full_name: newProfile.full_name
      }
    });

  } catch (err) {
    // Error dari database pg akan langsung ditangkap di sini
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Login user menggunakan email & password
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email dan password wajib diisi'
      });
    }

    // 1. Cari user
    const result = await pool.query(
      'SELECT * FROM profiles WHERE email = $1 LIMIT 1',
      [email]
    );
    const profile = result.rows[0];

    if (!profile) {
      return res.status(401).json({
        error: 'Email atau password salah'
      });
    }

    // 2. Validasi akun Google
    if (!profile.password) {
      return res.status(400).json({
        error: 'Akun ini terdaftar menggunakan Google. Silakan login lewat Google.'
      });
    }

    // 3. Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      profile.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Email atau password salah'
      });
    }

    // 4. Generate JWT
    const myAccessToken = jwt.sign(
      {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // 5. Save cookie
    res.cookie('access_token', myAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Disesuaikan untuk keamanan standar
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Login sukses',
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Logout user
 */
async function logout(req, res) {
  res.clearCookie('access_token');

  res.json({
    message: 'Logout sukses'
  });
}

/**
 * POST /api/auth/google
 * Login / Register Google OAuth
 */
async function googleLogin(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        error: 'Credential tidak ditemukan'
      });
    }

    // VERIFY GOOGLE TOKEN
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const full_name = payload.name;
    const avatar_url = payload.picture;

    // CEK USER
    const userResult = await pool.query(
      'SELECT * FROM profiles WHERE email = $1 LIMIT 1',
      [email]
    );
    let profile = userResult.rows[0];
    let needProfile = false;

    // =========================
    // USER BARU
    // =========================
    if (!profile) {
      const insertResult = await pool.query(
        `INSERT INTO profiles (email, full_name, avatar_url, password) 
         VALUES ($1, $2, $3, NULL) 
         RETURNING *`,
        [email, full_name, avatar_url]
      );
      
      profile = insertResult.rows[0];
      needProfile = true; // user baru wajib complete profile
    }
    // =========================
    // UPDATE PROFILE
    // =========================
    else {
      const updateResult = await pool.query(
        `UPDATE profiles 
         SET full_name = $1, avatar_url = $2 
         WHERE email = $3 
         RETURNING *`,
        [full_name, avatar_url, email]
      );
      
      profile = updateResult.rows[0];

      // kalau belum punya password
      if (!profile.password) {
        needProfile = true;
      }
    }

    // =========================
    // JWT
    // =========================
    const myAccessToken = jwt.sign(
      {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // COOKIE
    res.cookie('access_token', myAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Login Google sukses',
      needProfile,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      }
    });

  } catch (err) {
    return res.status(401).json({
      error: 'Google token invalid atau kadaluarsa',
      detail: err.message
    });
  }
}

/**
 * POST /api/auth/complete-profile
 * Lengkapi akun Google dengan password
 */
async function completeProfile(req, res) {
  try {
    const { email, full_name, password } = req.body;

    if (!email || !full_name || !password) {
      return res.status(400).json({
        error: 'Data tidak lengkap'
      });
    }

    // 1. Cari profile
    const userResult = await pool.query(
      'SELECT * FROM profiles WHERE email = $1 LIMIT 1',
      [email]
    );
    const profile = userResult.rows[0];

    if (!profile) {
      return res.status(400).json({
        error: 'User belum terdaftar. Login Google terlebih dahulu.'
      });
    }

    // 2. Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Update profile
    const updateResult = await pool.query(
      `UPDATE profiles 
       SET password = $1, full_name = $2 
       WHERE email = $3 
       RETURNING *`,
      [hashedPassword, full_name, email]
    );
    
    const updatedProfile = updateResult.rows[0];

    // 4. Generate JWT
    const myAccessToken = jwt.sign(
      {
        id: updatedProfile.id,
        email: updatedProfile.email,
        full_name: updatedProfile.full_name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // 5. Save cookie
    res.cookie('access_token', myAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      message: 'Registrasi Google selesai',
      user: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        full_name: updatedProfile.full_name
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Terjadi kesalahan pada server',
      detail: err.message
    });
  }
}

/**
 * GET /api/auth/me
 * Ambil data user dari JWT middleware
 */
async function getMe(req, res) {
  res.json({
    user: req.user
  });
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  googleLogin,
  completeProfile
};