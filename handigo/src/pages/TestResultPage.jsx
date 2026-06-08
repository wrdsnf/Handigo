import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Container from '@/components/Container';
import { 
  Trophy, 
  Clock, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Home,
  HelpCircle
} from 'lucide-react';

const TestResultPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // ID Modul
  const location = useLocation();

  // Ambil state kiriman dari TestPage dengan fallback nilai default jika diakses langsung
  const resultData = useMemo(() => {
    return location.state || {
      score: 0,
      correctCount: 0,
      skippedCount: 0,
      totalQuestions: 0,
      totalDurationMs: 0,
      totalPeeks: 0,
      stats: []
    };
  }, [location.state]);

  const { 
    score, 
    correctCount, 
    skippedCount, 
    totalQuestions, 
    totalDurationMs, 
    totalPeeks, 
    stats 
  } = resultData;

  // Helper formatting waktu (ms -> Menit & Detik)
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

  // Jika user masuk ke page ini tanpa state (misal refresh manual), arahkan kembali
  if (!location.state) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <HelpCircle size={64} className="text-gray-400 mb-4 animate-pulse" />
        <p className="text-gray-600 mb-4 font-medium">Sesi ujian tidak ditemukan atau telah kedaluwarsa.</p>
        <button 
          onClick={() => navigate(`/modul/${id}/test`)} 
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
        >
          Kembali ke Ujian
        </button>
      </div>
    );
  }

  // Tentukan badge/pesan kelulusan berdasarkan nilai
  const getPerformanceMessage = (score) => {
    if (score >= 80) return { title: "Luar Biasa!", desc: "Kamu menguasai materi isyarat ini dengan sangat baik.", color: "text-emerald-600" };
    if (score >= 60) return { title: "Kerja Bagus!", desc: "Sedikit latihan lagi dan kamu akan sempurna.", color: "text-blue-600" };
    return { title: "Tetap Semangat!", desc: "Jangan menyerah, coba lagi untuk mengasah memori ototmu.", color: "text-amber-600" };
  };

  const performance = getPerformanceMessage(score);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-gray-800 antialiased pt-24 pb-16 min-h-screen">
      <Container>
        
        {/* HERO BANNER - SKOR UTAMA */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100 text-center mb-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-2xl opacity-70 pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-50 rounded-full blur-2xl opacity-70 pointer-events-none"></div>

          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-2xl mb-4 text-amber-500 shadow-sm border border-amber-100">
            <Trophy size={44} className="animate-bounce" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
            Hasil Ujian Selesai
          </h1>
          <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base mb-6">
            Hasil rekam sensor kamera dan kecocokan gerakan AI YOLOv8 kamu telah berhasil dihitung.
          </p>

          <div className="inline-block bg-slate-900 text-white rounded-2xl px-8 py-4 mb-4 shadow-md">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">Skor Akhir</span>
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-400">{score}</span>
            <span className="text-gray-400 font-semibold"> / 100</span>
          </div>

          <h3 className={`text-xl font-bold ${performance.color} mt-2`}>{performance.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{performance.desc}</p>
        </div>

        {/* GRID UTAMA STATISTIK LENGKAP */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          
          {/* Benar */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 block">Jawaban Tepat</span>
              <span className="text-lg sm:text-xl font-bold text-gray-800">{correctCount} <span className="text-xs text-gray-400 font-normal">Soal</span></span>
            </div>
          </div>

          {/* Dilewati */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
              <XCircle size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 block">Dilewati (Skip)</span>
              <span className="text-lg sm:text-xl font-bold text-gray-800">{skippedCount} <span className="text-xs text-gray-400 font-normal">Soal</span></span>
            </div>
          </div>

          {/* Total Durasi */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 block">Total Waktu</span>
              <span className="text-lg sm:text-xl font-bold text-gray-800">{formatDuration(totalDurationMs)}</span>
            </div>
          </div>

          {/* Mengintip */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Eye size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 block">Frekuensi Intip</span>
              <span className="text-lg sm:text-xl font-bold text-gray-800">{totalPeeks} <span className="text-xs text-gray-400 font-normal">Kali</span></span>
            </div>
          </div>

        </div>

        {/* TABEL BREAKDOWN PER SOAL */}
        {stats && stats.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-100 bg-slate-50/50">
              <h2 className="font-bold text-gray-800 text-lg">Analisis Jawaban Tiap Soal</h2>
              <p className="text-xs text-gray-500">Review performa gerakan isyarat tangan Anda di setiap urutan nomor.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-400 bg-slate-50/20">
                    <th className="py-4 px-6 text-center w-16">No</th>
                    <th className="py-4 px-6">Nama Isyarat (Target)</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Durasi Nyata</th>
                    <th className="py-4 px-6 text-center">Jumlah Intip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {stats.map((item, idx) => {
                    const isSkipped = item.is_skipped || item.isSkipped || item.status === 'skipped';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-gray-400 text-center">{idx + 1}</td>
                        <td className="py-4 px-6 font-semibold text-gray-800">
                          {item.question_text || item.target || `Soal ${idx + 1}`}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {isSkipped ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 font-semibold px-3 py-1 rounded-full text-xs border border-amber-100">
                              <XCircle size={14} /> Skipped
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 font-semibold px-3 py-1 rounded-full text-xs border border-emerald-100">
                              <CheckCircle2 size={14} /> Berhasil
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-gray-600 font-medium">
                          {formatDuration(item.duration_ms || item.durationMs)}
                        </td>
                        <td className="py-4 px-6 text-center text-gray-500">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-xs ${item.peek_count > 0 || item.peekCount > 0 ? 'bg-red-50 text-red-500 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                            {item.peek_count ?? item.peekCount ?? 0}x
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NAVIGATION / ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(`/modul/${id}/test`)}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white border border-gray-200 font-bold text-gray-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition shadow-sm"
          >
            <RotateCcw size={18} />
            Ulangi Ujian Ini
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-gray-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-black transition shadow-md"
          >
            <Home size={18} />
            Kembali ke Dashboard
          </button>
        </div>

      </Container>
    </div>
  );
};

export default TestResultPage;