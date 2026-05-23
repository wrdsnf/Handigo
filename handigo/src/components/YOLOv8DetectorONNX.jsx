import { useEffect, useRef, useState } from 'react';
import WebcamCapture from './WebcamCapture';
import { loadONNXModel, postprocessOutput } from '@/lib/onnxInference';
import { AlertCircle, Loader } from 'lucide-react';

export default function YOLOv8DetectorONNX({
  modelPath,
  onDetection,
  isEnabled = true,
  confidenceThreshold = 0.5,
  fps = 10,
}) {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectionStats, setDetectionStats] = useState({ fps: 0, detections: 0 });

  const modelRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef(null);

  // Load ONNX model on mount
  useEffect(() => {
    const initModel = async () => {
      try {
        setLoading(true);
        const model = await loadONNXModel(modelPath);
        modelRef.current = model;
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    initModel();
  }, [modelPath]);

  // FPS counter
  useEffect(() => {
    lastFrameTimeRef.current = Date.now();
    fpsIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastFrameTimeRef.current) / 1000;
      if (elapsed > 0) {
        setDetectionStats((prev) => ({
          ...prev,
          fps: Math.round(frameCountRef.current / elapsed),
        }));
      }
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }, 1000);
    return () => clearInterval(fpsIntervalRef.current);
  }, []);

  // Keep overlay canvas pixel dimensions in sync with its rendered size.
  // Without this, the canvas internal buffer stays at the default 300×150
  // even when CSS stretches it to full width — so all drawings are invisible.
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    const container = containerRef.current;
    if (!overlay || !container) return;

    const observer = new ResizeObserver(() => {
      overlay.width = container.offsetWidth;
      overlay.height = container.offsetHeight;
    });
    observer.observe(container);
    // Set immediately on mount
    overlay.width = container.offsetWidth;
    overlay.height = container.offsetHeight;

    return () => observer.disconnect();
  }, [loading]); // re-run after loading state clears and DOM appears

  // Process each webcam frame through ONNX
  const handleFrame = async (canvas) => {
    if (!isEnabled || !modelRef.current) return;

    try {
      frameCountRef.current++;

      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Normalize into CHW float32 tensor expected by YOLOv8
      const data = new Float32Array(1 * 3 * 640 * 640);
      for (let i = 0; i < imageData.data.length; i += 4) {
        data[i / 4]                   = imageData.data[i]     / 255.0; // R
        data[640 * 640 + i / 4]       = imageData.data[i + 1] / 255.0; // G
        data[2 * 640 * 640 + i / 4]   = imageData.data[i + 2] / 255.0; // B
      }

      const { Tensor } = await import('onnxruntime-web');
      const results = await modelRef.current.run({
        images: new Tensor('float32', data, [1, 3, 640, 640]),
      });

      const detections = postprocessOutput(
        results,
        canvas.width,
        canvas.height,
        confidenceThreshold
      );

      setDetectionStats((prev) => ({ ...prev, detections: detections.length }));

      // Draw bounding boxes on overlay canvas
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        const ow = overlayCanvas.width;
        const oh = overlayCanvas.height;
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.clearRect(0, 0, ow, oh);

        detections.forEach((det) => {
          // Scale detection coords (from 640×640 inference space) to overlay size
          const x = (det.x / canvas.width)  * ow;
          const y = (det.y / canvas.height) * oh;
          const w = (det.width  / canvas.width)  * ow;
          const h = (det.height / canvas.height) * oh;

          // Bounding box
          overlayCtx.strokeStyle = '#3B82F6';
          overlayCtx.lineWidth = 2;
          overlayCtx.strokeRect(x, y, w, h);

          // Label
          const label = `${det.className} ${(det.confidence * 100).toFixed(1)}%`;
          overlayCtx.font = 'bold 14px Arial';
          const labelW = overlayCtx.measureText(label).width + 10;
          overlayCtx.fillStyle = '#3B82F6';
          overlayCtx.fillRect(x, y - 24, labelW, 24);
          overlayCtx.fillStyle = '#FFFFFF';
          overlayCtx.fillText(label, x + 5, y - 7);
        });
      }

      if (onDetection) {
        onDetection({ detections, fps: detectionStats.fps, timestamp: Date.now() });
      }
    } catch (err) {
      console.error('Detection error:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader size={20} className="animate-spin" />
          <span>Memuat model ONNX...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-2xl flex items-center justify-center">
        <div className="flex items-start gap-2 text-red-600">
          <AlertCircle size={20} className="mt-0.5" />
          <div>
            <p className="font-semibold">Model Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* container ref lets ResizeObserver track rendered size for canvas sync */}
      <div ref={containerRef} className="relative">
        <WebcamCapture
          isEnabled={isEnabled}
          onFrame={handleFrame}
          canvasRef={canvasRef}
          showDashedBorder={true}
        />
        {/* Overlay canvas — pixel dimensions are kept in sync via ResizeObserver above */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none"
          style={{ display: isEnabled ? 'block' : 'none' }}
        />
      </div>

      {/* Stats */}
      <div className="mt-4 flex gap-4 text-sm">
        <div className="bg-blue-50 px-3 py-2 rounded-lg">
          <p className="text-gray-600">FPS</p>
          <p className="font-semibold text-primary-blue">{detectionStats.fps}</p>
        </div>
        <div className="bg-blue-50 px-3 py-2 rounded-lg">
          <p className="text-gray-600">Deteksi</p>
          <p className="font-semibold text-primary-blue">{detectionStats.detections}</p>
        </div>
      </div>
    </div>
  );
}