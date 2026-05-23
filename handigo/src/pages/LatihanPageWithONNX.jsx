import Container from '@/components/Container';
import YOLOv8DetectorONNX from '@/components/YOLOv8DetectorONNX';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchExercises, saveExerciseResult, upsertProgress, fetchModuleById } from '../lib/database';

const LatihanPageWithONNX = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [exercise, setExercise] = useState(null);
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [maxAccuracy, setMaxAccuracy] = useState(0);

  // Load exercise data
  useEffect(() => {
    if (authLoading) return;

    const load = async () => {
      try {
        setLoading(true);
        const [mod, exs] = await Promise.all([
          fetchModuleById(id),
          fetchExercises(id),
        ]);
        setModule(mod);
        setExercise(exs[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, authLoading]);

  // Handle detections
  const handleDetection = ({ detections }) => {
    if (detections.length > 0) {
      const avgConfidence = (
        detections.reduce((sum, d) => sum + d.confidence, 0) /
        detections.length
      ) * 100;
      setMaxAccuracy((prev) => Math.max(prev, avgConfidence));
    }
  };

  const handleSubmit = async () => {
    if (!user || !exercise || isProcessing) return;

    setIsProcessing(true);
    try {
      const accuracy = Math.round(maxAccuracy);
      
      await saveExerciseResult({
        userId: user.id,
        moduleId: id,
        exerciseId: exercise.id,
        score: accuracy,
        accuracy,
        attempts: 1,
        timeSeconds: 10,
      });

      navigate(`/modul/${id}/hasil`, {
        state: {
          score: accuracy,
          accuracy,
          timeSeconds: 10,
          exerciseTitle: exercise.title,
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner text="Memuat latihan..." />;

  return (
    <div className="flex-1 flex flex-col bg-white text-gray-800 pt-6 pb-20">
      <Container>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          ← Kembali
        </button>

        <div className="bg-light-blue rounded-2xl p-6 mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-blue mb-2">
            Instruksi
          </h1>
          <p className="text-gray-600">
            {exercise?.instruction ||
              `Tunjukkan isyarat untuk ${exercise?.title}.`}
          </p>
        </div>

        {/* ONNX Detector */}
        <YOLOv8DetectorONNX
          modelPath="/models/yolov8/best.onnx"
          onDetection={handleDetection}
          isEnabled={true}
          confidenceThreshold={0.5}
          fps={10}
        />

        {/* Accuracy Display */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">Akurasi Tertinggi</p>
          <p className="text-4xl font-bold text-primary-blue">
            {Math.round(maxAccuracy)}%
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={() => setMaxAccuracy(0)}
            className="bg-white border border-primary-blue text-primary-blue px-6 py-3 rounded-full font-semibold hover:bg-light-blue"
          >
            Ulangi
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="bg-primary-blue text-white px-6 py-3 rounded-full font-semibold hover:bg-primary-hover disabled:opacity-50"
          >
            {isProcessing ? 'Menyimpan...' : 'Selanjutnya'}
          </button>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-500 mt-6">
          <Lightbulb size={18} className="mt-0.5 shrink-0" />
          <p>
            Tips: Pastikan pencahayaan cukup dan latar belakang tidak terlalu
            ramai untuk hasil deteksi yang lebih akurat.
          </p>
        </div>
      </Container>
    </div>
  );
};

export default LatihanPageWithONNX;