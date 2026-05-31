package main

import (
	"fmt"
	"math"
	"math/rand"
	"runtime"
	"sync"
	"time"
)

// Matrix represents a 2D matrix
type Matrix struct {
	Rows, Cols int
	Data       [][]float64
}

// NewMatrix creates a new matrix with specified dimensions
func NewMatrix(rows, cols int) *Matrix {
	data := make([][]float64, rows)
	for i := range data {
		data[i] = make([]float64, cols)
	}
	return &Matrix{Rows: rows, Cols: cols, Data: data}
}

// RandomMatrix creates a new matrix with He initialization
func RandomMatrix(rows, cols int) *Matrix {
	m := NewMatrix(rows, cols)
	std := math.Sqrt(2.0 / float64(cols))
	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			m.Data[i][j] = (rand.Float64()*2 - 1) * std
		}
	}
	return m
}

// Dot computes the dot product of two matrices using goroutines
func (m *Matrix) Dot(n *Matrix) *Matrix {
	if m.Cols != n.Rows {
		panic(fmt.Sprintf("invalid dimensions for dot product: %dx%d and %dx%d", m.Rows, m.Cols, n.Rows, n.Cols))
	}
	res := NewMatrix(m.Rows, n.Cols)
	var wg sync.WaitGroup

	numWorkers := runtime.NumCPU()
	rowsPerWorker := (m.Rows + numWorkers - 1) / numWorkers

	for w := 0; w < numWorkers; w++ {
		startRow := w * rowsPerWorker
		endRow := (w + 1) * rowsPerWorker
		if startRow >= m.Rows {
			break
		}
		if endRow > m.Rows {
			endRow = m.Rows
		}

		wg.Add(1)
		go func(s, e int) {
			defer wg.Done()
			for i := s; i < e; i++ {
				for j := 0; j < n.Cols; j++ {
					sum := 0.0
					for k := 0; k < m.Cols; k++ {
						sum += m.Data[i][k] * n.Data[k][j]
					}
					res.Data[i][j] = sum
				}
			}
		}(startRow, endRow)
	}
	wg.Wait()
	return res
}

func (m *Matrix) Add(n *Matrix) *Matrix {
	res := NewMatrix(m.Rows, m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[i][j] = m.Data[i][j] + n.Data[i][j]
		}
	}
	return res
}

func (m *Matrix) Subtract(n *Matrix) *Matrix {
	res := NewMatrix(m.Rows, m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[i][j] = m.Data[i][j] - n.Data[i][j]
		}
	}
	return res
}

func (m *Matrix) Multiply(n *Matrix) *Matrix {
	res := NewMatrix(m.Rows, m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[i][j] = m.Data[i][j] * n.Data[i][j]
		}
	}
	return res
}

func (m *Matrix) Map(f func(float64) float64) *Matrix {
	res := NewMatrix(m.Rows, m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[i][j] = f(m.Data[i][j])
		}
	}
	return res
}

func (m *Matrix) Transpose() *Matrix {
	res := NewMatrix(m.Cols, m.Rows)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[j][i] = m.Data[i][j]
		}
	}
	return res
}

// Activation functions
func relu(x float64) float64 {
	if x > 0 {
		return x
	}
	return 0
}

func drelu(x float64) float64 {
	if x > 0 {
		return 1
	}
	return 0
}

func softmax(inputs *Matrix) *Matrix {
	res := NewMatrix(inputs.Rows, inputs.Cols)
	for j := 0; j < inputs.Cols; j++ {
		maxVal := -math.MaxFloat64
		for i := 0; i < inputs.Rows; i++ {
			if inputs.Data[i][j] > maxVal {
				maxVal = inputs.Data[i][j]
			}
		}
		sum := 0.0
		for i := 0; i < inputs.Rows; i++ {
			val := math.Exp(inputs.Data[i][j] - maxVal)
			if math.IsInf(val, 0) || math.IsNaN(val) {
				val = 1e-10
			}
			res.Data[i][j] = val
			sum += val
		}
		if sum == 0 {
			sum = 1e-10
		}
		for i := 0; i < inputs.Rows; i++ {
			res.Data[i][j] /= sum
		}
	}
	return res
}

// DNN Architecture
type DNN struct {
	weights []*Matrix
	biases  []*Matrix
	lr      float64
	mu      sync.Mutex
}

func NewDNN(layers []int, lr float64) *DNN {
	nn := &DNN{
		weights: make([]*Matrix, len(layers)-1),
		biases:  make([]*Matrix, len(layers)-1),
		lr:      lr,
	}
	for i := 0; i < len(layers)-1; i++ {
		nn.weights[i] = RandomMatrix(layers[i+1], layers[i])
		nn.biases[i] = NewMatrix(layers[i+1], 1)
	}
	return nn
}

func (nn *DNN) FeedForward(inputData []float64) []float64 {
	current := NewMatrix(len(inputData), 1)
	for i, v := range inputData {
		current.Data[i][0] = v
	}

	for i := 0; i < len(nn.weights); i++ {
		current = nn.weights[i].Dot(current).Add(nn.biases[i])
		if i == len(nn.weights)-1 {
			current = softmax(current)
		} else {
			current = current.Map(relu)
		}
	}

	res := make([]float64, current.Rows)
	for i := 0; i < current.Rows; i++ {
		res[i] = current.Data[i][0]
	}
	return res
}

func (nn *DNN) Train(inputData, targetData []float64) {
	nn.mu.Lock()
	defer nn.mu.Unlock()

	current := NewMatrix(len(inputData), 1)
	for i, v := range inputData {
		current.Data[i][0] = v
	}

	activations := []*Matrix{current}
	layerInputs := []*Matrix{}

	// Forward pass
	for i := 0; i < len(nn.weights); i++ {
		z := nn.weights[i].Dot(current).Add(nn.biases[i])
		layerInputs = append(layerInputs, z)
		if i == len(nn.weights)-1 {
			current = softmax(z)
		} else {
			current = z.Map(relu)
		}
		activations = append(activations, current)
	}

	targets := NewMatrix(len(targetData), 1)
	for i, v := range targetData {
		targets.Data[i][0] = v
	}

	// Backpropagation
	dLoss := activations[len(activations)-1].Subtract(targets)

	for i := len(nn.weights) - 1; i >= 0; i-- {
		var gradients *Matrix
		if i == len(nn.weights)-1 {
			gradients = dLoss
		} else {
			gradients = layerInputs[i].Map(drelu).Multiply(dLoss)
		}

		weightDeltas := gradients.Dot(activations[i].Transpose())
		
		// Update weights and biases
		for r := 0; r < nn.weights[i].Rows; r++ {
			for c := 0; c < nn.weights[i].Cols; c++ {
				nn.weights[i].Data[r][c] -= weightDeltas.Data[r][c] * nn.lr
			}
			nn.biases[i].Data[r][0] -= gradients.Data[r][0] * nn.lr
		}

		if i > 0 {
			dLoss = nn.weights[i].Transpose().Dot(gradients)
		}
	}
}

// Data normalization
func normalize(nums []float64) []float64 {
	return []float64{
		nums[0] / 1000.0,
		nums[1] / 10000000.0,
		nums[2] / 10000000.0,
	}
}

func main() {
	rand.Seed(time.Now().UnixNano())

	bankNames := []string{"mizuho", "saitamarisona", "mitsuisumitomo", "sonybank"}
	rawData := []struct {
		name string
		nums []float64
	}{
		{"mizuho", []float64{560, 2278648, 0}},
		{"saitamarisona", []float64{793, 0, 4366399}},
		{"mitsuisumitomo", []float64{200, 4902647, 0}},
		{"sonybank", []float64{1, 6774308, 0}},
	}

	nn := NewDNN([]int{3, 16, 16, 4}, 0.1)

	fmt.Println("=== Ported Bank DNN (Go with Goroutines) ===")
	fmt.Println("Training classification model...")

	epochs := 100000
	start := time.Now()

	// Sequential training is often better for very small datasets to avoid noise from parallelism
	for e := 0; e < epochs; e++ {
		data := rawData[rand.Intn(len(rawData))]
		target := make([]float64, len(bankNames))
		for i, name := range bankNames {
			if name == data.name {
				target[i] = 1.0
				break
			}
		}
		nn.Train(normalize(data.nums), target)
		
		if e%(epochs/10) == 0 && e > 0 {
			fmt.Printf("... %d%% trained\n", (e*100)/epochs)
		}
	}
	fmt.Printf("Training complete in %v\n\n", time.Since(start))

	fmt.Println("Testing Predictions:")
	for _, data := range rawData {
		pred := nn.FeedForward(normalize(data.nums))
		maxIdx := 0
		for i, v := range pred {
			if v > pred[maxIdx] {
				maxIdx = i
			}
		}
		fmt.Printf("Input: %v | Target: %-15s | Predicted: %-15s (Confidence: %.2f%%)\n", 
			data.nums, data.name, bankNames[maxIdx], pred[maxIdx]*100)
	}
}
