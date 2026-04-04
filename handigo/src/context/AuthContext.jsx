import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Build a basic user object from session only (no DB calls — always fast)
  const buildUserFromSession = (session) => {
    if (!session?.user) return null;
    const su = session.user;
    return {
      id: su.id,
      email: su.email,
      name: su.user_metadata?.name || 'User',
      avatar_url: null,
      created_at: su.created_at,
    };
  };

  // Enrich user with profile data from DB (called separately, never blocks auth)
  const enrichUserWithProfile = async (userId, currentUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[Auth] profile fetch (non-fatal):', error.message);
        return;
      }

      if (profile && mountedRef.current) {
        setUser(prev => ({
          ...(prev || currentUser),
          name: profile.name || prev?.name || 'User',
          avatar_url: profile.avatar_url || null,
          created_at: profile.created_at || prev?.created_at,
        }));
      } else if (!profile) {
        // Profile doesn't exist — try to create one
        try {
          await supabase.from('profiles').upsert(
            { id: userId, name: currentUser?.name || 'User' },
            { onConflict: 'id' }
          );
        } catch (e) {
          console.warn('[Auth] profile create (non-fatal):', e);
        }
      }
    } catch (err) {
      console.warn('[Auth] enrichUserWithProfile (non-fatal):', err);
    }
  };

  // === INIT AUTH ===
  useEffect(() => {
    mountedRef.current = true;
    let authSubscription = null;

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('[Auth] getSession error:', error);

        if (session && mountedRef.current) {
          const userData = buildUserFromSession(session);
          setUser(userData);
          // Enrich with profile data in background (non-blocking)
          enrichUserWithProfile(session.user.id, userData);
        }
      } catch (err) {
        console.error('[Auth] init error:', err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    init();

    // Listen for auth changes
    // IMPORTANT: This callback must NOT await Supabase DB calls!
    // Doing so causes a deadlock because the callback holds a lock.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const userData = buildUserFromSession(session);
        setUser(userData);
        setLoading(false);
        // Enrich in background — DO NOT await this
        enrichUserWithProfile(session.user.id, userData);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });
    authSubscription = data.subscription;

    return () => {
      mountedRef.current = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  // === LOGIN ===
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'Email atau password salah.'
        : error.message;
      toast.error(msg);
      throw error;
    }
    const userData = buildUserFromSession(data.session);
    setUser(userData);
    toast.success('Berhasil login!');
    // Enrich with profile in background
    enrichUserWithProfile(data.session.user.id, userData);
    return userData;
  };

  // === REGISTER ===
  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Email sudah terdaftar. Silakan login.');
      } else {
        toast.error(error.message);
      }
      throw error;
    }
    if (data.session) {
      const userData = buildUserFromSession(data.session);
      setUser(userData);
      toast.success('Berhasil mendaftar!');
      enrichUserWithProfile(data.session.user.id, userData);
      return userData;
    } else {
      toast.success('Berhasil mendaftar! Cek email untuk konfirmasi.');
      return null;
    }
  };

  // === LOGOUT ===
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] logout error:', err);
    }
    setUser(null);
    toast.success('Berhasil keluar!');
  };

  // === UPDATE PROFILE ===
  const updateProfile = async (newData) => {
    if (!user?.id) throw new Error('Not authenticated');

    const { data: updated, error } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, name: newData.name, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select()
      .single();
    if (error) {
      toast.error('Gagal update profil: ' + error.message);
      throw error;
    }

    if (newData.password) {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newData.password });
      if (pwErr) {
        toast.error('Gagal update password: ' + pwErr.message);
        throw pwErr;
      }
    }

    const newUser = { ...user, name: updated?.name || newData.name || user.name };
    setUser(newUser);
    toast.success('Profil berhasil diperbarui!');
    return newUser;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
