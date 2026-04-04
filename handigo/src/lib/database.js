import { supabase } from './supabase';

// ============================================================
// MODULES
// ============================================================

export async function fetchModules() {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchModuleById(moduleId) {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchExercises(moduleId) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('module_id', moduleId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchExerciseById(exerciseId) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// USER PROGRESS
// ============================================================

export async function fetchAllUserProgress(userId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function fetchModuleProgress(userId, moduleId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProgress(userId, moduleId, updates) {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      module_id: moduleId,
      ...updates,
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchLastAccessedModule(userId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*, modules(*)')
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============================================================
// EXERCISE RESULTS
// ============================================================

export async function saveExerciseResult({ userId, moduleId, exerciseId, score, accuracy, attempts, timeSeconds }) {
  const { data, error } = await supabase
    .from('exercise_results')
    .insert({
      user_id: userId,
      module_id: moduleId,
      exercise_id: exerciseId,
      score,
      accuracy,
      attempts,
      time_seconds: timeSeconds,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchExerciseResults(userId, limit = 20) {
  const { data, error } = await supabase
    .from('exercise_results')
    .select('*, modules(title), exercises(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchWeeklyAccuracy(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('exercise_results')
    .select('accuracy, created_at')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at');
  if (error) throw error;
  return data || [];
}

// ============================================================
// STATS (for Dashboard)
// ============================================================

export async function fetchDashboardStats(userId) {
  // Fetch all progress records
  const { data: progress, error: pErr } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId);
  if (pErr) throw pErr;

  // Fetch all results
  const { data: results, error: rErr } = await supabase
    .from('exercise_results')
    .select('accuracy, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (rErr) throw rErr;

  // Completed modules
  const completedModules = (progress || []).filter(p => p.progress_percentage >= 100).length;

  // Average accuracy
  const accuracies = (results || []).map(r => r.accuracy).filter(Boolean);
  const avgAccuracy = accuracies.length > 0
    ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
    : 0;

  // Streak: count consecutive days with results
  const daySet = new Set();
  (results || []).forEach(r => {
    daySet.add(new Date(r.created_at).toISOString().split('T')[0]);
  });
  const sortedDays = [...daySet].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (daySet.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Weekly chart data (last 7 days)
  const weekData = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayResults = (results || []).filter(r =>
      new Date(r.created_at).toISOString().split('T')[0] === key
    );
    const dayAvg = dayResults.length > 0
      ? Math.round(dayResults.reduce((a, r) => a + (r.accuracy || 0), 0) / dayResults.length)
      : 0;
    weekData.push({
      day: dayNames[d.getDay()],
      accuracy: dayAvg,
    });
  }

  return {
    completedModules,
    avgAccuracy,
    streak,
    weekData,
    totalResults: (results || []).length,
  };
}

// ============================================================
// PROFILE
// ============================================================

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfileData(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
