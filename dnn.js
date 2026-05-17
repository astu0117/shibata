const fs = require('fs');

class Matrix {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.data = Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  static random(rows, cols, type = 'he') {
    const m = new Matrix(rows, cols);
    // He initialization: variance = 2 / fan_in (better for ReLU)
    const std = type === 'he' ? Math.sqrt(2 / cols) : Math.sqrt(2 / (rows + cols));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        m.data[i][j] = (Math.random() * 2 - 1) * std;
      }
    }
    return m;
  }

  static fromArray(arr) {
    const m = new Matrix(arr.length, 1);
    arr.forEach((v, i) => (m.data[i][0] = v));
    return m;
  }

  dot(n) {
    if (this.cols !== n.rows) throw new Error(`Invalid dimensions: ${this.rows}x${this.cols} dot ${n.rows}x${n.cols}`);
    const res = new Matrix(this.rows, n.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < n.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.data[i][k] * n.data[k][j];
        }
        res.data[i][j] = sum;
      }
    }
    return res;
  }

  add(n) {
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j] + n.data[i][j];
      }
    }
    return res;
  }

  subtract(n) {
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j] - n.data[i][j];
      }
    }
    return res;
  }

  multiply(n) {
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j] * n.data[i][j];
      }
    }
    return res;
  }

  scalarMultiply(n) {
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j] * n;
      }
    }
    return res;
  }

  map(f) {
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = f(this.data[i][j], i, j);
      }
    }
    return res;
  }

  transpose() {
    const res = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[j][i] = this.data[i][j];
      }
    }
    return res;
  }

  toArray() {
    return this.data.flat();
  }

  serialize() {
    return { rows: this.rows, cols: this.cols, data: this.data };
  }

  static deserialize(obj) {
    const m = new Matrix(obj.rows, obj.cols);
    m.data = obj.data;
    return m;
  }
}

const relu = (x) => Math.max(0, x);
const drelu = (x) => x > 0 ? 1 : 0;

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const dsigmoid = (y) => y * (1 - y);

const softmax = (arr) => {
  const maxVal = Math.max(...arr);
  const exp = arr.map(v => Math.exp(v - maxVal));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / sum);
};

class DNN {
  constructor(layers, lr = 0.1, momentum = 0.9) {
    this.layers = layers;
    this.lr = lr;
    this.momentum = momentum;
    this.weights = [];
    this.biases = [];
    this.weightVelocities = [];
    this.biasVelocities = [];

    if (layers) {
      for (let i = 0; i < layers.length - 1; i++) {
        this.weights.push(Matrix.random(layers[i + 1], layers[i]));
        this.biases.push(new Matrix(layers[i + 1], 1)); // Initialize biases to 0
        this.weightVelocities.push(new Matrix(layers[i + 1], layers[i]));
        this.biasVelocities.push(new Matrix(layers[i + 1], 1));
      }
    }
  }

  feedForward(inputArray) {
    let current = Matrix.fromArray(inputArray);
    for (let i = 0; i < this.weights.length; i++) {
      current = this.weights[i].dot(current).add(this.biases[i]);
      if (i === this.weights.length - 1) {
        // Output layer: Softmax
        const arr = current.toArray();
        const soft = softmax(arr);
        current = Matrix.fromArray(soft);
      } else {
        // Hidden layers: ReLU
        current = current.map(relu);
      }
    }
    return current.toArray();
  }

  train(inputArray, targetArray) {
    let current = Matrix.fromArray(inputArray);
    let layerInputs = [];
    let activations = [current];

    for (let i = 0; i < this.weights.length; i++) {
      let z = this.weights[i].dot(current).add(this.biases[i]);
      layerInputs.push(z);
      if (i === this.weights.length - 1) {
        current = Matrix.fromArray(softmax(z.toArray()));
      } else {
        current = z.map(relu);
      }
      activations.push(current);
    }

    const targets = Matrix.fromArray(targetArray);
    // For Softmax + Cross-Entropy, error is (output - target)
    let errors = targets.subtract(activations[activations.length - 1]);
    const mse = errors.toArray().reduce((sum, e) => sum + e * e, 0) / errors.rows;

    // Gradient of loss w.r.t. output is (target - activation) if we want to minimize loss
    // Wait, usually we use (activation - target). 
    // Let's use dLoss = activation - target
    let dLoss = activations[activations.length - 1].subtract(targets);

    for (let i = this.weights.length - 1; i >= 0; i--) {
      let gradients;
      if (i === this.weights.length - 1) {
        // Softmax + Cross-Entropy gradient is simply (a - t)
        gradients = dLoss;
      } else {
        // ReLU derivative
        gradients = layerInputs[i].map(drelu).multiply(dLoss);
      }

      let gradientsLR = gradients.scalarMultiply(this.lr);
      let prevT = activations[i].transpose();
      let weightDeltas = gradientsLR.dot(prevT);

      // Apply Momentum
      this.weightVelocities[i] = this.weightVelocities[i].scalarMultiply(this.momentum).subtract(weightDeltas);
      this.biasVelocities[i] = this.biasVelocities[i].scalarMultiply(this.momentum).subtract(gradientsLR);

      this.weights[i] = this.weights[i].add(this.weightVelocities[i]);
      this.biases[i] = this.biases[i].add(this.biasVelocities[i]);

      if (i > 0) {
        let weightsT = this.weights[i].transpose();
        dLoss = weightsT.dot(gradients);
      }
    }
    return mse;
  }

  save(filePath) {
    const data = {
      layers: this.layers,
      lr: this.lr,
      momentum: this.momentum,
      weights: this.weights.map(w => w.serialize()),
      biases: this.biases.map(b => b.serialize())
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
  }

  static load(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(filePath));
      const nn = new DNN(data.layers, data.lr, data.momentum || 0.9);
      nn.weights = data.weights.map(w => Matrix.deserialize(w));
      nn.biases = data.biases.map(b => Matrix.deserialize(b));
      // Re-initialize velocities
      nn.weightVelocities = nn.weights.map(w => new Matrix(w.rows, w.cols));
      nn.biasVelocities = nn.biases.map(b => new Matrix(b.rows, 1));
      return nn;
    } catch (e) {
      console.error('Failed to load weights:', e);
      return null;
    }
  }

  getWeights() {
    return this.weights.map(w => w.serialize());
  }
}

module.exports = { DNN };
