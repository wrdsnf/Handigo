import * as ort from 'onnxruntime-web';

const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
  'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
  'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis',
  'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
  'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
  'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

let session = null;

export const loadONNXModel = async (modelPath) => {
  try {
    session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
    });
    console.log('ONNX model loaded successfully');
    return session;
  } catch (err) {
    console.error('Failed to load ONNX model:', err);
    throw err;
  }
};

export const preprocessImage = (canvas, inputSize = 640) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Resize canvas to model input size
  canvas.width = inputSize;
  canvas.height = inputSize;

  // Normalize and prepare tensor data
  const normalized = new Float32Array(inputSize * inputSize * 3);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    normalized[idx] = data[i] / 255.0; // R
    normalized[idx + inputSize * inputSize] = data[i + 1] / 255.0; // G
    normalized[idx + 2 * inputSize * inputSize] = data[i + 2] / 255.0; // B
  }

  return new ort.Tensor('float32', normalized, [1, 3, inputSize, inputSize]);
};

export const runInference = async (imageData, inputSize = 640) => {
  if (!session) {
    throw new Error('Model not loaded. Call loadONNXModel first.');
  }

  try {
    const feeds = { images: imageData };
    const results = await session.run(feeds);
    return results;
  } catch (err) {
    console.error('Inference error:', err);
    throw err;
  }
};

export const postprocessOutput = (output, originalWidth, originalHeight, confidenceThreshold = 0.5) => {
  const detections = [];
  const outputData = output.output0.data; // YOLOv8 output tensor

  // Parse YOLOv8 output format: [x, y, w, h, conf, class0_conf, class1_conf, ...]
  const boxesPerPrediction = 85; // 4 coords + 1 conf + 80 classes (COCO)
  const numPredictions = outputData.length / boxesPerPrediction;

  for (let i = 0; i < numPredictions; i++) {
    const offset = i * boxesPerPrediction;
    const confidence = outputData[offset + 4];

    if (confidence < confidenceThreshold) continue;

    const x = outputData[offset];
    const y = outputData[offset + 1];
    const w = outputData[offset + 2];
    const h = outputData[offset + 3];

    // Find class with highest confidence
    let maxClassConf = 0;
    let classId = 0;
    for (let j = 5; j < boxesPerPrediction; j++) {
      if (outputData[offset + j] > maxClassConf) {
        maxClassConf = outputData[offset + j];
        classId = j - 5;
      }
    }

    // Scale to original image size
    const bbox = {
      x: (x - w / 2) * (originalWidth / 640),
      y: (y - h / 2) * (originalHeight / 640),
      width: w * (originalWidth / 640),
      height: h * (originalHeight / 640),
      confidence: confidence * maxClassConf,
      className: COCO_CLASSES[classId] || 'unknown',
      classId,
    };

    detections.push(bbox);
  }

  return detections.sort((a, b) => b.confidence - a.confidence);
};

export { COCO_CLASSES };