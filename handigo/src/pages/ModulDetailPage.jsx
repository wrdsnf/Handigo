import Container from '@/components/Container';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Camera, Check, Trophy, Clock, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchModuleById, fetchExercises, fetchTestHistory } from '../lib/api';

const ModulDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [module, setModule] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testHistory, setTestHistory] = useState([]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        const promises = [
          fetchModuleById(id),
          fetchExercises(id),
        ];

        if (user) {
          promises.push(fetchTestHistory(id));
        }

        const results = await Promise.all(promises);

        if (!cancelled) {
          setModule(results[0]);
          setExercises(results[1]);

          if (user && results[2]) {
            // Memastikan data array history tertangkap dengan benar
            setTestHistory(results[2].data || results[2] || []);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data modul:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

  if (loading || authLoading) return <LoadingSpinner text="Memuat modul..." />;

  if (!module) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Modul tidak ditemukan.</p>
      </div>
    );
  }

  const handleStartPractice = () => {
    if (!user) return;
    const first = exercises[0];

    if (first) {
      navigate(`/modul/${id}/latihan`, {
        state: {
          exerciseId: first.id,
          exerciseIndex: first.sort_order,
        },
      });
    }
  };

  const handleStartTest = () => {
    if (!user) return;
    navigate(`/modul/${id}/test`);
  };

  // Format durasi (ms -> Menit & Detik)
  const formatDuration = (ms) => {
    if (!ms || ms <= 0) return '0d';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}d`;
    }
    return `${seconds}d`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-white text-gray-800 antialiased pt-20 pb-12">
      <Container>

        {/* BACK */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/modul')}
            className="text-sm text-gray-500 hover:text-primary-blue transition-colors"
          >
            ← Kembali ke Modul
          </button>
        </div>

        {/* COVER */}
        <div className="w-full h-40 sm:h-56 bg-gray-100 rounded-3xl overflow-hidden mb-8 shadow-sm">
          {module.image_url ? (
            <img
              src={module.image_url}
              alt={module.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold text-gray-300">
                {module.title?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* META & TITLE */}
        <div className="mb-10">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs px-3 py-1.5 rounded-full bg-light-blue text-primary-blue font-semibold">
              {module.total_exercises} Latihan Tersedia
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-blue mb-4 leading-tight">
            {module.title}
          </h1>

          <p className="text-gray-600 max-w-3xl text-base sm:text-lg leading-relaxed">
            {module.description}
          </p>
        </div>

        {/* === SECTION LATIHAN REGULER === */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Daftar Latihan
            </h2>
            <button
              onClick={handleStartPractice}
              disabled={!user}
              className="hidden sm:flex items-center gap-2 bg-primary-blue text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {!user && <Lock size={16} />}
              {user ? 'Mulai dari Awal' : 'Login untuk memulai'}
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                moduleId={id}
                user={user}
              />
            ))}
          </div>

          <button
            onClick={handleStartPractice}
            disabled={!user}
            className="sm:hidden flex items-center justify-center gap-2 bg-primary-blue text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 w-full"
          >
            {!user && <Lock size={16} />}
            {user ? 'Mulai Latihan' : 'Login untuk memulai'}
          </button>
        </div>

        <hr className="border-gray-200 mb-12" />

        {/* === SECTION TEST MODE === */}
        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
                
                Test Kemampuan Mode
              </h2>
              <p className="text-gray-600">
                Uji kecepatan dan ingatanmu tanpa petunjuk. Sistem akan memberikan 5 soal acak dari modul ini.
              </p>
            </div>
            
            <button
              onClick={handleStartTest}
              disabled={!user}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-full text-base font-bold hover:bg-emerald-700 hover:shadow-md transition-all disabled:opacity-50 shrink-0 w-full md:w-auto"
            >
              {!user && <Lock size={18} />}
              {user ? 'Mulai Ujian Sekarang' : 'Login untuk Ujian'}
            </button>
          </div>

          {/* TABEL RIWAYAT TEST */}
          <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
      
            Riwayat Test Terakhir
          </h3>
          
          <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="w-1/5 p-4 text-sm font-semibold text-gray-600">No</th>
                    
                    <th className="w-1/5 p-4 text-sm font-semibold text-gray-600">Soal Benar</th>
                    <th className="w-1/5 p-4 text-sm font-semibold text-gray-600">Skor</th>
                    <th className="w-1/5 p-4 text-sm font-semibold text-gray-600">Durasi</th>
                    <th className="w-1/5 p-4 text-sm font-semibold text-gray-600">Frekuensi Intip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!user ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                        Silakan login untuk melihat riwayat test kamu.
                      </td>
                    </tr>
                  ) : testHistory.length > 0 ? (
                    testHistory.map((session, index) => {
                      const correctCount = session.correct_count ?? session.correctCount ?? null;
                      const score = session.score ?? 0;
                      const totalDuration = session.total_duration_ms ?? session.totalDurationMs ?? session.duration ?? 0;
                      const totalPeeks = session.total_peeks ?? session.totalPeeks ?? 0;

                      return (
                        <tr key={session.id || index} className="hover:bg-slate-50 transition-colors">
                          <td className="w-1/5 p-4 text-sm text-gray-600">{index + 1}</td>
                          
                          <td className="w-1/5 p-4 text-sm text-gray-700 font-semibold">
                            {correctCount !== null ? `${correctCount} Soal` : '-'}
                          </td>
                          <td className="w-1/5 p-4 text-sm text-gray-700 font-semibold">
                            {score}
                          </td>
                          <td className="w-1/5 p-4 text-sm text-gray-600">
                            {formatDuration(totalDuration)}
                          </td>
                          <td className="w-1/5 p-4 text-sm text-gray-600">
                            {totalPeeks} Kali
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                        Belum ada riwayat ujian di modul ini. Ayo mulai ujian pertamamu!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </Container>
    </div>
  );
};

const ExerciseCard = ({ exercise, moduleId, user }) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    if (!user) return;

    navigate(`/modul/${moduleId}/latihan`, {
      state: {
        exerciseId: exercise.id,
        exerciseIndex: exercise.sort_order,
      },
    });
  };

  return (
    <div className="rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-default">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-light-blue text-primary-blue flex items-center justify-center font-bold text-lg">
          {exercise.sort_order}
        </div>

        <div>
          <p className="font-semibold text-gray-800 text-base">
            {exercise.title}
          </p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Search size={12} />
            Mode Latihan Terpandu
          </p>
        </div>
      </div>

      <div className="flex gap-2 sm:justify-end">
        {!user ? (
          <span className="text-xs text-gray-400 italic flex items-center gap-1">
            <Lock size={12} /> Login untuk akses
          </span>
        ) : (
          <button
            onClick={handleOpen}
            className="bg-white border border-primary-blue text-primary-blue px-6 py-2 rounded-full text-sm font-semibold hover:bg-primary-blue hover:text-white transition-colors w-full sm:w-auto text-center"
          >
            Latihan
          </button>
        )}
      </div>
    </div>
  );
};

export default ModulDetailPage;