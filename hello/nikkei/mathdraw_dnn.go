package main

import (
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"
)

// Matrix represents a 2D matrix
type Matrix struct {
	Rows, Cols int
	Data       [][]float64
}

// NewMatrix creates a new matrix
func NewMatrix(rows, cols int) *Matrix {
	data := make([][]float64, rows)
	for i := range data {
		data[i] = make([]float64, cols)
	}
	return &Matrix{Rows: rows, Cols: cols, Data: data}
}

// RandomMatrix creates a new matrix with random values
func RandomMatrix(rows, cols int) *Matrix {
	m := NewMatrix(rows, cols)
	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			m.Data[i][j] = rand.Float64()*2 - 1
		}
	}
	return m
}

// Dot computes the dot product of two matrices using goroutines
func (m *Matrix) Dot(n *Matrix) *Matrix {
	if m.Cols != n.Rows {
		panic("invalid dimensions")
	}
	res := NewMatrix(m.Rows, n.Cols)
	var wg sync.WaitGroup
	for i := 0; i < m.Rows; i++ {
		wg.Add(1)
		go func(row int) {
			defer wg.Done()
			for j := 0; j < n.Cols; j++ {
				sum := 0.0
				for k := 0; k < m.Cols; k++ {
					sum += m.Data[row][k] * n.Data[k][j]
				}
				res.Data[row][j] = sum
			}
		}(i)
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

func sigmoid(x float64) float64 { return 1 / (1 + math.Exp(-x)) }
func dsigmoid(y float64) float64 { return y * (1 - y) }

// DNN represents a Deep Neural Network
type DNN struct {
	weightsIH *Matrix
	weightsHO *Matrix
	biasH     *Matrix
	biasO     *Matrix
	lr        float64
	mu        sync.Mutex // For thread-safe updates if multiple goroutines train the same NN
}

func NewDNN(input, hidden, output int, lr float64) *DNN {
	return &DNN{
		weightsIH: RandomMatrix(hidden, input),
		weightsHO: RandomMatrix(output, hidden),
		biasH:     RandomMatrix(hidden, 1),
		biasO:     RandomMatrix(output, 1),
		lr:        lr,
	}
}

func (nn *DNN) FeedForward(inputData []float64) []float64 {
	inputs := NewMatrix(len(inputData), 1)
	for i, v := range inputData {
		inputs.Data[i][0] = v
	}
	hidden := nn.weightsIH.Dot(inputs).Add(nn.biasH).Map(sigmoid)
	outputs := nn.weightsHO.Dot(hidden).Add(nn.biasO).Map(sigmoid)
	res := make([]float64, outputs.Rows)
	for i := 0; i < outputs.Rows; i++ {
		res[i] = outputs.Data[i][0]
	}
	return res
}

func (nn *DNN) Train(inputData, targetData []float64) {
	nn.mu.Lock()
	defer nn.mu.Unlock()

	inputs := NewMatrix(len(inputData), 1)
	for i, v := range inputData {
		inputs.Data[i][0] = v
	}
	targets := NewMatrix(len(targetData), 1)
	for i, v := range targetData {
		targets.Data[i][0] = v
	}

	hidden := nn.weightsIH.Dot(inputs).Add(nn.biasH).Map(sigmoid)
	outputs := nn.weightsHO.Dot(hidden).Add(nn.biasO).Map(sigmoid)

	outputErrors := NewMatrix(targets.Rows, 1)
	for i := 0; i < targets.Rows; i++ {
		outputErrors.Data[i][0] = targets.Data[i][0] - outputs.Data[i][0]
	}

	gradients := outputs.Map(dsigmoid)
	for i := 0; i < gradients.Rows; i++ {
		gradients.Data[i][0] *= outputErrors.Data[i][0] * nn.lr
	}

	hiddenT := hidden.Transpose()
	weightsHODeltas := gradients.Dot(hiddenT)
	nn.weightsHO = nn.weightsHO.Add(weightsHODeltas)
	nn.biasO = nn.biasO.Add(gradients)

	weightsHOT := nn.weightsHO.Transpose()
	hiddenErrors := weightsHOT.Dot(outputErrors)
	hiddenGradients := hidden.Map(dsigmoid)
	for i := 0; i < hiddenGradients.Rows; i++ {
		hiddenGradients.Data[i][0] *= hiddenErrors.Data[i][0] * nn.lr
	}

	inputsT := inputs.Transpose()
	weightsIHDeltas := hiddenGradients.Dot(inputsT)
	nn.weightsIH = nn.weightsIH.Add(weightsIHDeltas)
	nn.biasH = nn.biasH.Add(hiddenGradients)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	fmt.Println("MathDraw DNN Deep Learning (Function Approximation)")
	fmt.Println("Approximating functions like y = ax + b and y = ax^2 + b")

	// NN for Linear: y = 0.5x + 0.2
	nnLinear := NewDNN(1, 10, 1, 0.1)
	// NN for Quadratic: y = 0.8x^2 + 0.1
	nnQuad := NewDNN(1, 16, 1, 0.1)

	iterations := 200000
	var wg sync.WaitGroup

	fmt.Println("Training linear and quadratic models in parallel using goroutines...")
	start := time.Now()

	// Train Linear Model in goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < iterations; i++ {
			x := rand.Float64()
			y := 0.5*x + 0.2
			nnLinear.Train([]float64{x}, []float64{y})
		}
		fmt.Println("Linear model training complete.")
	}()

	// Train Quadratic Model in goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < iterations; i++ {
			x := rand.Float64()
			y := 0.8*x*x + 0.1
			nnQuad.Train([]float64{x}, []float64{y})
		}
		fmt.Println("Quadratic model training complete.")
	}()

	wg.Wait()
	duration := time.Since(start)
	fmt.Printf("All training completed in %v\n\n", duration)

	// Results
	fmt.Println("Testing Models:")
	testPoints := []float64{0.2, 0.5, 0.8}

	fmt.Printf("\n%-10s | %-20s | %-20s\n", "Input (x)", "Linear Pred (Actual)", "Quad Pred (Actual)")
	fmt.Println("-----------|----------------------|----------------------")
	for _, x := range testPoints {
		linOut := nnLinear.FeedForward([]float64{x})[0]
		linAct := 0.5*x + 0.2
		quadOut := nnQuad.FeedForward([]float64{x})[0]
		quadAct := 0.8*x*x + 0.1
		fmt.Printf("%-10.2f | %-8.4f (%-8.4f) | %-8.4f (%-8.4f)\n", x, linOut, linAct, quadOut, quadAct)
	}
}
