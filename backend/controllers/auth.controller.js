const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * POST /api/auth/register
 * Register user baru (Supabase Admin)
 * Body: { email, password, full_name }
 */
async function register(req, res, next) {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (error) return res.status(400).json({ error: error.message });

    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name
    });

    res.status(201).json({
      message: 'Register berhasil',
      user: data.user
    });

  } catch (err) {
    next(err);
  }
}


/**
 * POST /api/auth/login
 * Login user menggunakan email & password
 * Body: { email, password }
 * Catatan: login sebaiknya langsung dari frontend via Supabase SDK.
 * Endpoint ini untuk keperluan API eksternal / testing.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return res.status(401).json({ error: error.message });

    res.cookie('access_token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login sukses',
      user: data.user
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Logout via cookie
 */
async function logout(req, res) {
  res.clearCookie('access_token');
  res.json({ message: 'Logout sukses' });
}

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Login / cek user Google OAuth
 * Body: { credential }
 */
async function googleLogin(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Credential tidak ditemukan" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const full_name = payload.name;

    console.log("GOOGLE USER:", { email, full_name });

    // cek user di profiles
    const { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      return res.json({
        needProfile: true,
        email,
        full_name
      });
    }

    return res.json({
      needProfile: false,
      user
    });

  } catch (err) {
    return res.status(401).json({
      error: "Google token invalid",
      detail: err.message
    });
  }
}

/**
 * POST /api/auth/complete-profile
 * Melengkapi akun setelah login Google
 * Body: { email, password, full_name }
 */
async function completeProfile(req, res) {
  try {
    const { email, full_name, password } = req.body;

    if (!email || !full_name || !password) {
      return res.status(400).json({
        error: "Data tidak lengkap"
      });
    }

    // 1. cari user (SUDAH ADA DI AUTH)
    const { data: users } =
      await supabaseAdmin.auth.admin.listUsers();

    const user = users.users.find(u => u.email === email);

    if (!user) {
      return res.status(400).json({
        error: "User Google belum ada di Auth (harus login dulu)"
      });
    }

    // 2. UPDATE → ini pengganti "register"
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        user_metadata: {
          full_name
        }
      });

    if (updateError) {
      return res.status(500).json({
        error: updateError.message
      });
    }

    // 3. upsert profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email,
        full_name
      });

    if (profileError) {
      return res.status(500).json({
        error: "Gagal simpan profile",
        detail: profileError
      });
    }

    return res.json({
      message: "Registrasi via Google selesai (password dibuat)"
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}

/**
 * GET /api/auth/me
 * Mengambil data user dari middleware auth (JWT/cookie)
 */
async function getMe(req, res) {
  res.json({ user: req.user });
}

module.exports = { 
  register, 
  login, 
  logout, 
  getMe,
  googleLogin,
  completeProfile
};
