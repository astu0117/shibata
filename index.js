require('dotenv').config();
const express = require('express');
const { DNN } = require('./dnn');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const bankNames = ["mizuho", "saitamarisona", "mitsuisumitomo", "sonybank"];
const weightsPath = path.join(__dirname, 'weights.json');

let nn;
let lossHistory = [];

const rawData = [
  { name: "mizuho", nums: [560, 2278648, 0] },
  { name: "saitamarisona", nums: [793, 0, 4366399] },
  { name: "mitsuisumitomo", nums: [200, 4902647, 0] },
  { name: "sonybank", nums: [1, 6774308, 0] },
];

const normalize = (nums) => {
  // Simple min-max style scaling based on domain knowledge
  // Branch code: 0-1000 -> 0-1
  // Account number: 0-10,000,000 -> 0-1
  // Others: 0-1
  return [
    nums[0] / 1000.0,
    nums[1] / 10000000.0,
    nums[2] / 1000.0
  ];
};

// Training function
const trainModel = (epochs = 10000) => {
  lossHistory = [];
  for (let i = 0; i < epochs; i++) {
    let epochLoss = 0;
    // Shuffle rawData for better training stability
    const shuffled = [...rawData].sort(() => Math.random() - 0.5);
    shuffled.forEach(data => {
      const target = new Array(bankNames.length).fill(0);
      const bankIdx = bankNames.indexOf(data.name);
      if (bankIdx !== -1) {
        target[bankIdx] = 1.0;
        epochLoss += nn.train(normalize(data.nums), target);
      }
    });
    if (i % 100 === 0) {
      lossHistory.push({ epoch: i, loss: epochLoss / rawData.length });
    }
  }
  nn.save(weightsPath);
};

// Initialization logic
const initDNN = () => {
  const loaded = DNN.load(weightsPath);
  // Check if loaded model matches current expectations (architecture might have changed)
  if (loaded && JSON.stringify(loaded.layers) === JSON.stringify([3, 16, 16, 4])) {
    console.log('Loaded existing weights.');
    nn = loaded;
  } else {
    console.log('Initializing and training new DNN (ReLU/Softmax architecture)...');
    nn = new DNN([3, 16, 16, 4], 0.01, 0.9); // Further reduced LR for stability
    trainModel(10000); // 10k epochs should be enough for 4 samples
    console.log('Training complete and weights saved.');
  }
};

initDNN();

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Gemini CLI Bank DNN Dashboard',
    status: 'running',
    banks: bankNames,
    lossHistory: lossHistory,
    datasetSize: rawData.length,
    weights: nn.getWeights(),
    layers: nn.layers,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/learn', (req, res) => {
  const { name, numbers } = req.body;
  if (!name || !numbers || !bankNames.includes(name)) {
    return res.status(400).json({ error: 'Invalid data provided.' });
  }

  // Add to raw data
  rawData.push({ name, nums: numbers });
  
  // Retrain slightly (Incremental learning)
  console.log(`Online learning: Adding new sample for ${name}...`);
  trainModel(2000); // Fewer epochs for quick update
  
  res.json({ success: true, datasetSize: rawData.length, lossHistory });
});

app.post('/api/predict', (req, res) => {
  const { numbers } = req.body;
  if (!numbers || !Array.isArray(numbers) || numbers.length !== 3) {
    return res.status(400).json({ error: 'Please provide an array of 3 numbers.' });
  }
  const normalized = normalize(numbers);
  const prediction = nn.feedForward(normalized);
  const maxIdx = prediction.indexOf(Math.max(...prediction));
  
  res.json({
    input: numbers,
    normalized: normalized,
    prediction: prediction,
    predicted_bank: bankNames[maxIdx],
    confidence: (prediction[maxIdx] * 100).toFixed(2) + '%'
  });
});

app.post('/api/reset', (req, res) => {
  console.log('Resetting model to random weights...');
  nn = new DNN([3, 16, 16, 4], 0.1);
  trainModel(100); // Quick initial training
  res.json({ success: true, message: 'Model reset to initial state.' });
});

app.get('/api/weights/raw', (req, res) => {
  res.json({
    layers: nn.layers,
    weights: nn.weights.map(w => w.data),
    biases: nn.biases.map(b => b.data)
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
