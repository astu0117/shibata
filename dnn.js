const fs = require('fs');

class Matrix {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.data = Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  static random(rows, cols) {
    const m = new Matrix(rows, cols);
    // Xavier/He-ish initialization
    const std = Math.sqrt(2 / (rows + cols));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        m.data[i][j] = (Math.random() * 2 - 1) * std * 0.1; // Extra small for stability
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

const softmax = (arr) => {
  const maxVal = Math.max(...arr.filter(v => !isNaN(v)));
  const exp = arr.map(v => isNaN(v) ? 0 : Math.exp(v - (isNaN(maxVal) ? 0 : maxVal)));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => sum === 0 ? 1/arr.length : v / sum);
};

class DNN {
  constructor(layers, lr = 0.01, momentum = 0.5) {
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
        this.biases.push(new Matrix(layers[i + 1], 1));
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
        current = Matrix.fromArray(softmax(current.toArray()));
      } else {
        current = current.map(relu);
      }
    }
    return current.toArray();
  }

  train(inputArray, targetArray) {
    let current = Matrix.fromArray(inputArray);
    let layerInputs = [];
    let activations = [current];

    // Forward
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
    let output = activations[activations.length - 1];
    let dLoss = output.subtract(targets);
    
    // Backprop
    for (let i = this.weights.length - 1; i >= 0; i--) {
      let gradients;
      if (i === this.weights.length - 1) {
        gradients = dLoss;
      } else {
        gradients = layerInputs[i].map(drelu).multiply(dLoss);
      }

      // Gradient Clipping
      gradients = gradients.map(v => Math.max(-1, Math.min(1, v)));

      let prevActivationsT = activations[i].transpose();
      let weightGradients = gradients.dot(prevActivationsT);

      // Update Velocities
      this.weightVelocities[i] = this.weightVelocities[i].scalarMultiply(this.momentum).subtract(weightGradients.scalarMultiply(this.lr));
      this.biasVelocities[i] = this.biasVelocities[i].scalarMultiply(this.momentum).subtract(gradients.scalarMultiply(this.lr));

      // Update Weights
      this.weights[i] = this.weights[i].add(this.weightVelocities[i]);
      this.biases[i] = this.biases[i].add(this.biasVelocities[i]);

      if (i > 0) {
        dLoss = this.weights[i].transpose().dot(gradients);
      }
    }

    // Return MSE
    let errors = output.subtract(targets);
    return errors.toArray().reduce((sum, e) => sum + e * e, 0) / errors.rows;
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
      const nn = new DNN(data.layers, data.lr, data.momentum || 0.5);
      nn.weights = data.weights.map(w => Matrix.deserialize(w));
      nn.biases = data.biases.map(b => Matrix.deserialize(b));
      nn.weightVelocities = nn.weights.map(w => new Matrix(w.rows, w.cols));
      nn.biasVelocities = nn.biases.map(b => new Matrix(b.rows, 1));
      return nn;
    } catch (e) {
      return null;
    }
  }

  getWeights() {
    return this.weights.map(w => w.serialize());
  }
}

module.exports = { DNN };
