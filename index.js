require('dotenv').config();
const express = require('express');
const { DNN } = require('./dnn');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const bankNames = ["mizuho", "saitamarisona", "mitsuisumitomo", "sonybank"];
const weightsPath = path.join(__dirname, 'weights.json');
const ragPath = path.join(__dirname, 'rag_data.json');

let nn;
let lossHistory = [];
let ragData = [];

try {
  if (fs.existsSync(ragPath)) {
    ragData = JSON.parse(fs.readFileSync(ragPath, 'utf8'));
  }
} catch (e) {
  console.error('Failed to load RAG data:', e.message);
}

const rawData = [
  { name: "mizuho", nums: [560, 2278648, 0] },
  { name: "saitamarisona", nums: [793, 0, 4366399] },
  { name: "mitsuisumitomo", nums: [200, 4902647, 0] },
  { name: "sonybank", nums: [1, 6774308, 0] },
];

const normalize = (nums) => {
  // Branch code: 0-1000
  // Account numbers: 0-10,000,000 (across both columns 2 and 3)
  return [
    nums[0] / 1000.0,
    nums[1] / 10000000.0,
    nums[2] / 10000000.0
  ];
};

const trainModel = (epochs = 2000) => {
  lossHistory = [];
  for (let i = 0; i < epochs; i++) {
    let epochLoss = 0;
    const shuffled = [...rawData].sort(() => Math.random() - 0.5);
    let hasNaN = false;
    shuffled.forEach(data => {
      const target = new Array(bankNames.length).fill(0);
      const bankIdx = bankNames.indexOf(data.name);
      if (bankIdx !== -1) {
        target[bankIdx] = 1.0;
        const loss = nn.train(normalize(data.nums), target);
        if (isNaN(loss)) hasNaN = true;
        epochLoss += loss;
      }
    });
    if (hasNaN) {
      console.error(`NaN detected at epoch ${i}. Stopping training.`);
      break;
    }
    if (i % 100 === 0) {
      lossHistory.push({ epoch: i, loss: epochLoss / rawData.length });
    }
  }
  nn.save(weightsPath);
};

const initDNN = () => {
  if (fs.existsSync(weightsPath)) {
    const content = fs.readFileSync(weightsPath, 'utf8');
    if (content.includes('null') || content.includes('NaN')) {
      fs.unlinkSync(weightsPath);
    }
  }

  const loaded = DNN.load(weightsPath);
  if (loaded && JSON.stringify(loaded.layers) === JSON.stringify([3, 16, 16, 4])) {
    console.log('Loaded existing weights.');
    nn = loaded;
  } else {
    console.log('Initializing and training new DNN...');
    nn = new DNN([3, 16, 16, 4], 0.01, 0.9); // Back to standard stable settings
    trainModel(5000);
    console.log('Training complete.');
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
    layers: nn.layers,
    weights: nn.getWeights(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/rag', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json(ragData);
  const query = q.toLowerCase();
  const filtered = ragData.filter(item => 
    item.name.toLowerCase().includes(query) || 
    item.description.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  );
  res.json(filtered);
});

app.post('/api/predict', (req, res) => {
  const { numbers } = req.body;
  if (!numbers || !Array.isArray(numbers) || numbers.length !== 3) {
    return res.status(400).json({ error: 'Please provide an array of 3 numbers.' });
  }
  const normalized = normalize(numbers);
  const prediction = nn.feedForward(normalized);
  const maxIdx = prediction.indexOf(Math.max(...prediction));
  const bankName = bankNames[maxIdx];
  
  const info = ragData.find(item => item.name.toLowerCase().includes(bankName.toLowerCase())) || {};

  res.json({
    input: numbers,
    normalized: normalized,
    predicted_bank: bankName,
    confidence: (prediction[maxIdx] * 100).toFixed(2) + '%',
    prediction: prediction,
    info: info
  });
});

app.post('/api/learn', (req, res) => {
  const { name, numbers } = req.body;
  if (!bankNames.includes(name)) {
    return res.status(400).json({ error: 'Unknown bank name.' });
  }
  if (!numbers || !Array.isArray(numbers) || numbers.length !== 3 || numbers.some(n => typeof n !== 'number' || Number.isNaN(n))) {
    return res.status(400).json({ error: 'Please provide an array of 3 numbers.' });
  }

  rawData.push({ name, nums: numbers });
  trainModel(2000);
  res.json({
    success: true,
    message: 'Training sample added.',
    datasetSize: rawData.length
  });
});

app.post('/api/reset', (req, res) => {
  console.log('Resetting model...');
  nn = new DNN([3, 16, 16, 4], 0.01, 0.9);
  trainModel(5000);
  res.json({ success: true, message: 'Model reset.' });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
