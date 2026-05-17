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

// NewMatrix creates a new matrix with specified dimensions
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

// Dot computes the dot product of two matrices using goroutines for parallelism
func (m *Matrix) Dot(n *Matrix) *Matrix {
	if m.Cols != n.Rows {
		panic(fmt.Sprintf("invalid dimensions for dot product: %dx%d and %dx%d", m.Rows, m.Cols, n.Rows, n.Cols))
	}
	res := NewMatrix(m.Rows, n.Cols)
	var wg sync.WaitGroup

	// Use goroutines to calculate each row of the result matrix in parallel
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

// Add adds two matrices
func (m *Matrix) Add(n *Matrix) *Matrix {
	if m.Rows != n.Rows || m.Cols != n.Cols {
		panic("invalid dimensions for addition")
	}
	res := NewMatrix(m.Rows, m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[i][j] = m.Data[i][j] + n.Data[i][j]
		}
	}
	return res
}

// Map applies a function to every element of the matrix
func (m *Matrix) Map(f func(float64) float64) *Matrix {
	res := NewMatrix(m.Rows, m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[i][j] = f(m.Data[i][j])
		}
	}
	return res
}

// Transpose returns the transpose of the matrix
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
func sigmoid(x float64) float64 {
	return 1 / (1 + math.Exp(-x))
}

func dsigmoid(y float64) float64 {
	return y * (1 - y)
}

// DNN represents a simple Deep Neural Network
type DNN struct {
	weightsIH *Matrix
	weightsHO *Matrix
	biasH     *Matrix
	biasO     *Matrix
	lr        float64
}

// NewDNN initializes a new DNN
func NewDNN(input, hidden, output int, lr float64) *DNN {
	return &DNN{
		weightsIH: RandomMatrix(hidden, input),
		weightsHO: RandomMatrix(output, hidden),
		biasH:     RandomMatrix(hidden, 1),
		biasO:     RandomMatrix(output, 1),
		lr:        lr,
	}
}

// FeedForward performs the forward pass
func (nn *DNN) FeedForward(inputData []float64) []float64 {
	inputs := NewMatrix(len(inputData), 1)
	for i, v := range inputData {
		inputs.Data[i][0] = v
	}

	// Hidden layer
	hidden := nn.weightsIH.Dot(inputs).Add(nn.biasH).Map(sigmoid)
	// Output layer
	outputs := nn.weightsHO.Dot(hidden).Add(nn.biasO).Map(sigmoid)

	res := make([]float64, outputs.Rows)
	for i := 0; i < outputs.Rows; i++ {
		res[i] = outputs.Data[i][0]
	}
	return res
}

// Train performs one iteration of backpropagation
func (nn *DNN) Train(inputData, targetData []float64) {
	inputs := NewMatrix(len(inputData), 1)
	for i, v := range inputData {
		inputs.Data[i][0] = v
	}

	targets := NewMatrix(len(targetData), 1)
	for i, v := range targetData {
		targets.Data[i][0] = v
	}

	// Feedforward
	hidden := nn.weightsIH.Dot(inputs).Add(nn.biasH).Map(sigmoid)
	outputs := nn.weightsHO.Dot(hidden).Add(nn.biasO).Map(sigmoid)

	// Output error = targets - outputs
	outputErrors := NewMatrix(targets.Rows, 1)
	for i := 0; i < targets.Rows; i++ {
		outputErrors.Data[i][0] = targets.Data[i][0] - outputs.Data[i][0]
	}

	// Calculate output gradient
	gradients := outputs.Map(dsigmoid)
	for i := 0; i < gradients.Rows; i++ {
		gradients.Data[i][0] *= outputErrors.Data[i][0] * nn.lr
	}

	// Hidden to Output deltas
	hiddenT := hidden.Transpose()
	weightsHODeltas := gradients.Dot(hiddenT)

	// Adjust Weights and Biases
	nn.weightsHO = nn.weightsHO.Add(weightsHODeltas)
	nn.biasO = nn.biasO.Add(gradients)

	// Calculate hidden layer error
	weightsHOT := nn.weightsHO.Transpose()
	hiddenErrors := weightsHOT.Dot(outputErrors)

	// Calculate hidden gradient
	hiddenGradients := hidden.Map(dsigmoid)
	for i := 0; i < hiddenGradients.Rows; i++ {
		hiddenGradients.Data[i][0] *= hiddenErrors.Data[i][0] * nn.lr
	}

	// Input to Hidden deltas
	inputsT := inputs.Transpose()
	weightsIHDeltas := hiddenGradients.Dot(inputsT)

	// Adjust Weights and Biases
	nn.weightsIH = nn.weightsIH.Add(weightsIHDeltas)
	nn.biasH = nn.biasH.Add(hiddenGradients)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// Create a DNN with 2 inputs (x, y), 16 hidden neurons, and 1 output
	nn := NewDNN(2, 16, 1, 0.1)

	fmt.Println("DNN Pi Estimator (Monte Carlo based Deep Learning)")
	fmt.Println("Converting plot.py logic to Go with goroutines...")
	fmt.Println("Training DNN to recognize points inside the circle...")

	iterations := 500000
	start := time.Now()

	// Train the DNN
	for i := 0; i < iterations; i++ {
		x := rand.Float64()*2 - 1 // Normalized [-1, 1]
		y := rand.Float64()*2 - 1 // Normalized [-1, 1]
		target := 0.0
		if x*x+y*y <= 1.0 {
			target = 1.0
		}
		nn.Train([]float64{x, y}, []float64{target})

		if i%(iterations/10) == 0 && i > 0 {
			fmt.Printf("... %d%% trained\n", (i*100)/iterations)
		}
	}

	duration := time.Since(start)
	fmt.Printf("\nTraining complete in %v. Testing and estimating Pi...\n", duration)

	// Estimation using goroutines
	testCount := 100000
	numGoroutines := 10
	pointsPerGoroutine := testCount / numGoroutines
	
	var wg sync.WaitGroup
	var mu sync.Mutex
	insideCount := 0

	fmt.Printf("Using %d goroutines for parallel estimation...\n", numGoroutines)

	for g := 0; g < numGoroutines; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			localInside := 0
			for i := 0; i < pointsPerGoroutine; i++ {
				x := rand.Float64()*2 - 1
				y := rand.Float64()*2 - 1
				output := nn.FeedForward([]float64{x, y})
				// If the DNN predicts > 0.5, classify as "inside"
				if output[0] >= 0.5 {
					localInside++
				}
			}
			mu.Lock()
			insideCount += localInside
			mu.Unlock()
		}()
	}
	wg.Wait()

	pi := (float64(insideCount) / float64(testCount)) * 4
	fmt.Printf("\n--- Results ---\n")
	fmt.Printf("Estimated Pi = %.6f\n", pi)
	fmt.Printf("Actual Pi    = %.6f\n", math.Pi)
	fmt.Printf("Error        = %.6f\n", math.Abs(math.Pi-pi))
}
