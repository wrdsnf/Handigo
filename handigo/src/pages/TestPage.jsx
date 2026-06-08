import Container from '@/components/Container';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Image as ImageIcon, 
  Lightbulb, 
  Eye, 
  EyeOff, 
  SkipForward, 
  Flag,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// Update API import sesuai dengan endpoint BE yang baru
import { fetchModuleById, startTestSession, submitTestAnswer, finishTestSession } from '../lib/api';
import YOLOv8DetectorONNX from '@/components/YOLOv8DetectorONNX';

const TestPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [module, setModule] = useState(null);
  const [sessionId, setSessionId] = useState(null); // Menyimpan ID Sesi aktif dari BE
  const [testQuestions, setTestQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Ujian
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPeeking, setIsPeeking] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('Kamera aktif. Silakan peragakan...');
  
  // Status masing-masing soal: idle, skipped, done
  const [questionStats, setQuestionStats] = useState([]);

  const questionStartTimeRef = useRef(0);

  // ─── PENENTUAN PATH MODEL ───────────────────────────────────────
  const modelPath = useMemo(() => {
    if (!id) return '/models/yolov8/best.onnx';
    const idStr = String(id).toLowerCase();
    const titleStr = module?.title ? String(module.title).toLowerCase() : '';

    if (idStr === '2' || idStr.includes('number') || idStr.includes('angka') || titleStr.includes('angka') || titleStr.includes('number')) {
      return '/models/yolov8/numbers.onnx';
    }
    if (idStr === '3' || idStr.includes('word') || idStr.includes('kata') || titleStr.includes('kata') || titleStr.includes('kosakata') || titleStr.includes('word')) {
      return '/models/yolov8/words.onnx';
    }
    return '/models/yolov8/best.onnx';
  }, [id, module]);

  // ─── INIT SOAL LANGSUNG DARI BE ──────────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        // Memanggil API startTestSession (Menggantikan fetchExercises dan shuffle manual)
        const [mod, testData] = await Promise.all([
          fetchModuleById(id), 
          startTestSession(id) 
        ]);
        
        if (cancelled) return;

        setModule(mod);
        setSessionId(testData.session.id);
        setTestQuestions(testData.questions);

        // Buat struktur penampung statistik lokal sementara
        const initialStats = testData.questions.map(() => ({
          status: 'idle', 
          peeks: 0,
          durationMs: 0,
          accuracy: 0
        }));
        setQuestionStats(initialStats);

        questionStartTimeRef.current = Date.now();

      } catch (err) {
        console.error("Gagal memuat sesi ujian:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id, authLoading]);

  // Reset state spesifik setiap ganti soal
  useEffect(() => {
    if (testQuestions.length === 0) return;
    setIsPeeking(false);
    
    const currentStat = questionStats[currentIndex];
    if (currentStat?.status === 'done') {
      setDetectionMessage(`✓ Selesai! (Akurasi: ${currentStat.accuracy}%)`);
    } else {
      setDetectionMessage('Kamera aktif. Silakan peragakan...');
      questionStartTimeRef.current = Date.now(); // Mulai ulang timer per soal
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, testQuestions.length]);


  // ─── LOGIKA DETEKSI OTOMATIS ────────────────────────────────────
  const currentExercise = testQuestions[currentIndex];
  
  const expectedSigns = useMemo(() => {
    if (!currentExercise) return [];
    // BE mengembalikan data murni question_text tunggal untuk dicocokkan
    return [String(currentExercise.question_text).trim()];
  }, [currentExercise]);

  const targetLabel = useMemo(() => {
    return currentExercise?.question_text || 'Target tidak tersedia';
  }, [currentExercise]);

  const handleDetection = useCallback(async ({ detections }) => {
    // Abaikan jika sedang ngintip, loading, atau soal ini sudah selesai
    if (isPeeking || !questionStats[currentIndex] || questionStats[currentIndex].status === 'done') {
      return;
    }

    if (!detections || detections.length === 0) {
      setDetectionMessage('Mendeteksi...');
      return;
    }

    const matched = detections.filter((d) =>
      expectedSigns.some(target => target.toLowerCase() === String(d.className || '').trim().toLowerCase())
    );

    if (matched.length === 0) {
      const wrongNames = detections.map((d) => d.className).join(', ');
      setDetectionMessage(`⚠️ Terbaca "${wrongNames}"`);
      return;
    }

    const maxConfidence = Math.max(...matched.map((d) => d.confidence || 0));
    const pct = Math.max(0, Math.min(100, maxConfidence * 100));

    // FREEZE SCREEN LOKAL
    setDetectionMessage(`✓ "${matched[0].className}" Tepat!`);
    
    const elapsed = Date.now() - questionStartTimeRef.current;
    const finalDuration = questionStats[currentIndex].durationMs + elapsed;

    setQuestionStats(prev => {
      const newStats = [...prev];
      newStats[currentIndex] = {
        ...newStats[currentIndex],
        status: 'done',
        accuracy: Math.round(pct),
        durationMs: finalDuration
      };
      return newStats;
    });

    // KIRIM JAWABAN BENAR LANGSUNG KE BACKEND
    try {
      await submitTestAnswer({
        sessionId,
        questionId: currentExercise.id,
        questionOrder: currentIndex + 1,
        durationMs: finalDuration,
        peekCount: questionStats[currentIndex].peeks,
        screenshotUrl: '', // Isi url jika FE mengintegrasikan snapshot canvas
        isSkipped: false
      });
    } catch (err) {
      console.error("Gagal menyimpan jawaban ke DB:", err);
    }

  }, [currentIndex, expectedSigns, isPeeking, questionStats, sessionId, currentExercise]);


  // ─── ACTION HANDLERS ────────────────────────────────────────────

  const togglePeek = () => {
    if (questionStats[currentIndex].status === 'done') return;

    if (!isPeeking) {
      setQuestionStats(prev => {
        const newStats = [...prev];
        newStats[currentIndex].peeks += 1;
        return newStats;
      });
    }
    setIsPeeking(!isPeeking);
  };

  const handleSkip = async () => {
    const elapsed = Date.now() - questionStartTimeRef.current;
    const finalDuration = questionStats[currentIndex].durationMs + elapsed;

    setQuestionStats(prev => {
      const newStats = [...prev];
      if (newStats[currentIndex].status !== 'done') {
        newStats[currentIndex].status = 'skipped';
        newStats[currentIndex].durationMs = finalDuration;
      }
      return newStats;
    });

    // SIMPAN REKAMAN SKIP KE BACKEND
    try {
      await submitTestAnswer({
        sessionId,
        questionId: currentExercise.id,
        questionOrder: currentIndex + 1,
        durationMs: finalDuration,
        peekCount: questionStats[currentIndex].peeks,
        screenshotUrl: '',
        isSkipped: true
      });
    } catch (err) {
      console.error("Gagal menyimpan skip ke DB:", err);
    }

    if (currentIndex < testQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleJumpToQuestion = async (index) => {
    if (currentIndex === index) return;

    // Jika soal saat ini ditinggalkan dalam keadaan idle, otomatis anggap skipped di BE
    if (questionStats[currentIndex].status === 'idle') {
      const elapsed = Date.now() - questionStartTimeRef.current;
      const finalDuration = questionStats[currentIndex].durationMs + elapsed;

      setQuestionStats(prev => {
        const newStats = [...prev];
        newStats[currentIndex].status = 'skipped';
        newStats[currentIndex].durationMs = finalDuration;
        return newStats;
      });

      try {
        await submitTestAnswer({
          sessionId,
          questionId: currentExercise.id,
          questionOrder: currentIndex + 1,
          durationMs: finalDuration,
          peekCount: questionStats[currentIndex].peeks,
          screenshotUrl: '',
          isSkipped: true
        });
      } catch (err) {
        console.error(err);
      }
    }
    setCurrentIndex(index);
  };

  const handleFinish = async () => {
    try {
      setLoading(true);

      // 1. Amankan soal aktif jika user menekan tombol kumpul saat statusnya masih 'idle'
      if (questionStats[currentIndex].status === 'idle') {
        const elapsed = Date.now() - questionStartTimeRef.current;
        const finalDuration = questionStats[currentIndex].durationMs + elapsed;

        await submitTestAnswer({
          sessionId,
          questionId: currentExercise.id,
          questionOrder: currentIndex + 1,
          durationMs: finalDuration,
          peekCount: questionStats[currentIndex].peeks,
          screenshotUrl: '',
          isSkipped: true
        });
      }

      // 2. Loop sisa soal yang belum sempat tersentuh (masih idle) agar tercatat sebagai skip di DB
      for (let i = 0; i < testQuestions.length; i++) {
        if (questionStats[i].status === 'idle' && i !== currentIndex) {
          await submitTestAnswer({
            sessionId,
            questionId: testQuestions[i].id,
            questionOrder: i + 1,
            durationMs: 0,
            peekCount: questionStats[i].peeks,
            screenshotUrl: '',
            isSkipped: true
          });
        }
      }

      // 3. Panggil API global finishTest dari BE untuk kalkulasi dashboard final
      const dashboardData = await finishTestSession(sessionId);

      // Navigasi ke halaman hasil Test menggunakan payload data akurat dari database BE
      navigate(`/modul/${id}/test/hasil`, {
        state: {
          score: dashboardData.score,
          correctCount: dashboardData.correctCount,
          skippedCount: dashboardData.skippedCount,
          totalQuestions: dashboardData.totalQuestions || testQuestions.length,
          totalDurationMs: dashboardData.totalDurationMs,
          totalPeeks: dashboardData.totalPeeks,
          stats: dashboardData.questions // Membawa mapping list array soal dari BE
        }
      });
    } catch (err) {
      console.error("Gagal menyelesaikan ujian:", err);
      alert("Terjadi kendala saat memproses nilai ujian.");
    } finally {
      setLoading(false);
    }
  };

  // ─── HELPER MAPPING GAMBAR REFERENSI SEARAH BE ─────────────────
  const getReferenceUrl = () => {
    // BE saat ini sudah mengembalikan string URL bersih hasil mapping SQL array
    return currentExercise?.reference_image_url || null;
  };

  // ─── RENDER TAMPILAN ─────────────────────────────────────────────
  if (authLoading || loading) return <LoadingSpinner text="Menproses Data Ujian Ke Server..." />;
  if (testQuestions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">Tidak ada soal latihan untuk diuji.</p>
        <button onClick={() => navigate(-1)} className="text-primary-blue underline">Kembali</button>
      </div>
    );
  }

  const currentStat = questionStats[currentIndex];
  const isDone = currentStat?.status === 'done';
  const cameraActive = !isPeeking && !isDone; 

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-gray-800 antialiased pt-20 pb-10 min-h-screen">
      <Container>
        
        {/* HEADER & NAVIGASI SOAL */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-gray-400 hover:text-gray-800 transition-colors"
            >
              Batalkan Ujian
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800">Test Mode</h1>
              <p className="text-xs text-gray-500">{module?.title}</p>
            </div>
            <div className="hidden sm:block w-24"></div>
          </div>

          <div className="flex justify-center items-center gap-2 sm:gap-4 flex-wrap">
            {testQuestions.map((_, i) => {
              const status = questionStats[i]?.status;
              let bgClass = 'bg-gray-100 text-gray-500 border-gray-200';
              
              if (status === 'done') bgClass = 'bg-emerald-500 text-white border-emerald-600 shadow-md';
              else if (status === 'skipped') bgClass = 'bg-amber-400 text-white border-amber-500 shadow-sm';
              
              if (currentIndex === i && status !== 'done') {
                bgClass = 'bg-primary-blue text-white border-primary-hover shadow-md ring-4 ring-blue-100';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleJumpToQuestion(i)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full font-bold text-sm sm:text-base border transition-all ${bgClass}`}
                >
                  {status === 'done' ? <CheckCircle2 size={18} /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* KONTEN UTAMA */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* SISI KIRI: DISPLAY KAMERA / GAMBAR */}
          <div className="lg:col-span-3">
            <div className="h-[400px] sm:h-[500px] bg-gray-900 rounded-3xl overflow-hidden relative shadow-lg border-4 border-gray-800 flex items-center justify-center">
              
              {isDone && (
                <div className="absolute inset-0 z-20 bg-emerald-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <CheckCircle2 size={80} className="text-emerald-400 mb-4 animate-bounce" />
                  <h2 className="text-3xl font-bold">Luar Biasa!</h2>
                  <p className="text-emerald-100 mt-2">Soal ini berhasil dideteksi.</p>
                </div>
              )}

              <div className={`w-full h-full ${isPeeking ? 'hidden' : 'block'}`}>
                <YOLOv8DetectorONNX
                  modelPath={modelPath}
                  onDetection={handleDetection}
                  isEnabled={cameraActive}
                  confidenceThreshold={0.4}
                  fps={6}
                  className="w-full h-full object-cover"
                />
              </div>

              {isPeeking && (
                <div className="w-full h-full bg-white flex items-center justify-center p-4">
                  {getReferenceUrl() ? (
                    <img 
                      src={getReferenceUrl()} 
                      alt="Referensi Isyarat" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <ImageIcon size={48} />
                      <span>Gambar referensi tidak tersedia</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SISI KANAN: INSTRUKSI & KONTROL */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex-1 flex flex-col">
              
              <div className="mb-8 text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-blue bg-light-blue px-3 py-1 rounded-full">
                  Soal Ujian {currentIndex + 1}
                </span>
                <h2 className="text-3xl font-extrabold text-gray-800 mt-4 mb-2">
                  Target: {targetLabel}
                </h2>
                
                <div className={`inline-block px-4 py-2 rounded-xl text-sm font-bold mt-2 border ${
                  isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {detectionMessage}
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-auto">
                {!isDone && (
                  <button
                    onClick={togglePeek}
                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all border-2 ${
                      isPeeking 
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                        : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    {isPeeking ? <EyeOff size={20} /> : <Eye size={20} />}
                    {isPeeking ? 'Tutup Referensi (Kamera Nyala)' : 'Intip Referensi (Kamera Mati)'}
                  </button>
                )}

                <button
  onClick={() => {
    if (currentIndex < testQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }}
  disabled={currentIndex === testQuestions.length - 1}
  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
    isDone
      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  <SkipForward size={20} />
  {isDone
    ? 'Lanjut ke Soal Berikutnya'
    : currentIndex === testQuestions.length - 1
      ? 'Lewati & Tetap di Sini'
      : 'Skip ke Soal Berikutnya'}
</button>

                <button
                  onClick={handleFinish}
                  className="w-full py-4 mt-4 rounded-2xl bg-gray-900 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md"
                >
                  <Flag size={20} />
                  Kumpulkan & Selesai Ujian
                </button>
              </div>

            </div>

            <div className="mt-4 flex items-start gap-3 text-xs text-gray-500 bg-gray-100/50 p-4 rounded-2xl border border-gray-100">
              <Lightbulb size={18} className="text-amber-500 shrink-0" />
              <p className="leading-relaxed">
                Kamu bisa loncat ke soal mana pun dengan mengklik angka di atas. Menekan <strong>"Intip Referensi"</strong> akan menjeda pendeteksian kamera dan dihitung sebagai penalti intip.
              </p>
            </div>
          </div>

        </div>
      </Container>
    </div>
  );
};

export default TestPage;