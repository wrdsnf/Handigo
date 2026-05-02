import Container from '@/components/Container';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, Image as ImageIcon, Lightbulb } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { fetchExercises, saveExerciseResult, upsertProgress, fetchModuleById, fetchModuleProgress } from '../lib/database';

const LatihanPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [exercise, setExercise] = useState(null);
  const [allExercises, setAllExercises] = useState([]);
  const [module, setModule] = useState(null);
  const [existingProgress, setExistingProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [isScanning, setIsScanning] = useState(true);
  const startTime = useRef(Date.now());

  const videoRef = useRef(null);
const streamRef = useRef(null);

useEffect(() => {
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  startCamera();

  return () => {
    // stop camera saat keluar halaman
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };
}, []);

  // Get exerciseId from navigation state, or default to first exercise
  const exerciseId = location.state?.exerciseId;
  const exerciseIndex = location.state?.exerciseIndex;

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [mod, exs] = await Promise.all([
          fetchModuleById(id),
          fetchExercises(id),
        ]);
        if (cancelled) return;
        setModule(mod);
        setAllExercises(exs);

        // Fetch existing progress to preserve it
        if (user) {
          const prog = await fetchModuleProgress(user.id, id);
          if (!cancelled) setExistingProgress(prog);
        }

        // Determine which exercise to show
        if (exerciseId) {
          const ex = exs.find(e => e.id === exerciseId);
          setExercise(ex || exs[0]);
        } else if (exerciseIndex) {
          const ex = exs.find(e => e.exercise_index === exerciseIndex);
          setExercise(ex || exs[0]);
        } else {
          // Resume: use existing progress to find next exercise
          if (user) {
            const prog = await fetchModuleProgress(user.id, id);
            if (prog && prog.completed_exercises > 0) {
              const nextIdx = prog.completed_exercises + 1;
              const nextEx = exs.find(e => e.exercise_index === nextIdx);
              setExercise(nextEx || exs[0]);
            } else {
              setExercise(exs[0]);
            }
          } else {
            setExercise(exs[0]);
          }
        }

        startTime.current = Date.now();
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, exerciseId, exerciseIndex, authLoading]);

  // Simulate AI scanning with random accuracy
  useEffect(() => {
    if (!exercise || !isScanning) return;
    const interval = setInterval(() => {
      setAccuracy(prev => {
        const delta = Math.random() * 10 - 3;
        return Math.max(0, Math.min(100, prev + delta));
      });
    }, 500);

    // Auto-complete after 4-6 seconds
    const timeout = setTimeout(() => {
      setIsScanning(false);
      setAccuracy(Math.floor(Math.random() * 40) + 55); // 55-95 final score
    }, 4000 + Math.random() * 2000);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [exercise, isScanning]);

  const handleNext = async () => {
    if (!user || !exercise || isProcessing) return;
    setIsProcessing(true);

    try {
      const timeSeconds = Math.round((Date.now() - startTime.current) / 1000);
      const finalAccuracy = Math.round(accuracy);
      const score = finalAccuracy;

      // Save exercise result
      await saveExerciseResult({
        userId: user.id,
        moduleId: id,
        exerciseId: exercise.id,
        score,
        accuracy: finalAccuracy,
        attempts: 1,
        timeSeconds,
      });

      // Update progress — NEVER go backward!
      const currentIndex = exercise.exercise_index;
      const totalExercises = module?.total_exercises || allExercises.length;
      const previousCompleted = existingProgress?.completed_exercises || 0;
      const previousLastIndex = existingProgress?.last_exercise_index || 0;

      // Only advance if this exercise is beyond what was previously completed
      const newCompleted = Math.max(previousCompleted, currentIndex);
      const newLastIndex = Math.max(previousLastIndex, currentIndex);
      const newPct = Math.min(100, (newCompleted / totalExercises) * 100);

      await upsertProgress(user.id, id, {
        completed_exercises: newCompleted,
        progress_percentage: newPct,
        last_exercise_index: newLastIndex,
      });

      // Update local state so subsequent saves are aware
      setExistingProgress(prev => ({
        ...prev,
        completed_exercises: newCompleted,
        progress_percentage: newPct,
        last_exercise_index: newLastIndex,
      }));

      // Navigate to result page
      navigate(`/modul/${id}/hasil`, {
        state: {
          score,
          accuracy: finalAccuracy,
          timeSeconds,
          exerciseTitle: exercise.title,
          exerciseIndex: currentIndex,
          totalExercises,
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setAccuracy(0);
    setIsScanning(true);
    startTime.current = Date.now();
  };

  if (authLoading || loading) return <LoadingSpinner text="Memuat latihan..." />;
  if (!exercise) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Latihan tidak ditemukan.</p>
    </div>
  );

  const currentExIdx = exercise.exercise_index;
  const totalEx = module?.total_exercises || allExercises.length;

  return (
    <div className="flex-1 flex flex-col bg-white text-gray-800 antialiased pt-6 pb-20">
      <Container>

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
            ← Kembali
          </button>

          <div className="bg-light-blue text-primary-blue text-xs px-3 py-1 rounded-full font-semibold">
            {currentExIdx}/{totalEx}
          </div>
        </div>

        {/* INSTRUKSI */}
        <div className="bg-light-blue rounded-2xl p-4 sm:p-6 text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-blue mb-2">
            Instruksi
          </h1>

          <p className="text-gray-600 text-sm max-w-xl mx-auto">
            {exercise.instruction || `Tunjukkan isyarat untuk ${exercise.title}. Posisikan tanganmu di dalam bingkai kamera dan tahan selama 2 detik.`}
          </p>
        </div>

        {/* REFERENSI & KAMERA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">

          {/* REFERENSI */}
          <div>
            <p className="text-sm font-semibold text-center mb-3 text-gray-600">
              REFERENSI
            </p>

            <div className="w-full h-36 sm:h-100 bg-light-blue rounded-2xl flex items-center justify-center">
              <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center text-white">
                <ImageIcon size={24} />
              </div>
            </div>
          </div>

          {/* KAMERA */}
          <div>
            <p className="text-sm font-semibold text-center mb-3 text-gray-600">
              KAMERA ANDA
            </p>

            <div className="w-full h-100 sm:h-100 bg-light-blue rounded-2xl flex items-center justify-center relative overflow-hidden">
              <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="absolute inset-0 w-full h-full object-cover rounded-2xl"
/>
              <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none" />
            </div>
          </div>
        </div>

        {/* FEEDBACK AI */}
        <div className="text-center mb-8">
          <p className="text-primary-blue font-semibold mb-2">
            Feedback AI
          </p>

          {isScanning ? (
            <div className="flex justify-center mb-2">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-dark-gray rounded-full animate-spin" />
            </div>
          ) : (
            <p className="text-sm font-semibold text-green-600 mb-2">✓ Terdeteksi</p>
          )}

          <p className="text-xs text-gray-500 mb-4">Akurasi</p>

          <div className="w-full h-3 bg-gray-200 rounded-full">
            <div
              className="h-3 bg-primary-blue rounded-full transition-all duration-300"
              style={{ width: `${Math.round(accuracy)}%` }}
            ></div>
          </div>

          <p className="text-xs text-gray-600 mt-2">{Math.round(accuracy)}%</p>
        </div>

        {/* ACTION */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <button
            onClick={handleRetry}
            disabled={isProcessing}
            className="bg-white border border-primary-blue text-primary-blue px-6 py-3 rounded-full text-sm font-semibold hover:bg-light-blue active:scale-95 transition-all disabled:opacity-50"
          >
            Coba Lagi
          </button>

          <button
            onClick={handleNext}
            disabled={isScanning || isProcessing}
            className="bg-primary-blue text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Menyimpan...' : 'Selanjutnya'}
          </button>
        </div>

        {/* TIPS */}
        <div className="flex items-start gap-2 text-sm text-gray-500 max-w-xl mx-auto">
          <Lightbulb size={18} className="text-secondary shrink-0 mt-0.5" />
          <p>
            Tips: Pastikan pencahayaan cukup dan latar belakang tidak terlalu ramai
            agar deteksi lebih akurat.
          </p>
        </div>

      </Container>
    </div>
  );
};

export default LatihanPage;