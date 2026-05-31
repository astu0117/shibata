package main

import (
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"
)

// Matrix for DNN operations
type Matrix struct {
	Rows, Cols int
	Data       [][]float64
}

func NewMatrix(rows, cols int) *Matrix {
	data := make([][]float64, rows)
	for i := range data {
		data[i] = make([]float64, cols)
	}
	return &Matrix{Rows: rows, Cols: cols, Data: data}
}

func RandomMatrix(rows, cols int) *Matrix {
	m := NewMatrix(rows, cols)
	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			m.Data[i][j] = rand.Float64()*2 - 1
		}
	}
	return m
}

func (m *Matrix) Dot(n *Matrix) *Matrix {
	res := NewMatrix(m.Rows, n.Cols)
	var wg sync.WaitGroup
	for i := 0; i < m.Rows; i++ {
		wg.Add(1)
		go func(r int) {
			defer wg.Done()
			for j := 0; j < n.Cols; j++ {
				sum := 0.0
				for k := 0; k < m.Cols; k++ {
					sum += m.Data[r][k] * n.Data[k][j]
				}
				res.Data[r][j] = sum
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

type DNN struct {
	wIH, wHO *Matrix
	bH, bO   *Matrix
	lr       float64
}

func NewDNN(in, hid, out int, lr float64) *DNN {
	return &DNN{
		wIH: RandomMatrix(hid, in),
		wHO: RandomMatrix(out, hid),
		bH:  RandomMatrix(hid, 1),
		bO:  RandomMatrix(out, 1),
		lr:  lr,
	}
}

func (nn *DNN) FeedForward(input []float64) []float64 {
	inputs := NewMatrix(len(input), 1)
	for i, v := range input { inputs.Data[i][0] = v }
	hidden := nn.wIH.Dot(inputs).Add(nn.bH).Map(sigmoid)
	output := nn.wHO.Dot(hidden).Add(nn.bO).Map(sigmoid)
	return []float64{output.Data[0][0]}
}

func (nn *DNN) Train(input, target []float64) {
	inputs := NewMatrix(len(input), 1)
	for i, v := range input { inputs.Data[i][0] = v }
	targets := NewMatrix(len(target), 1)
	for i, v := range target { targets.Data[i][0] = v }

	hidden := nn.wIH.Dot(inputs).Add(nn.bH).Map(sigmoid)
	outputs := nn.wHO.Dot(hidden).Add(nn.bO).Map(sigmoid)

	outErr := NewMatrix(targets.Rows, 1)
	outErr.Data[0][0] = targets.Data[0][0] - outputs.Data[0][0]

	grad := outputs.Map(dsigmoid)
	grad.Data[0][0] *= outErr.Data[0][0] * nn.lr

	nn.wHO = nn.wHO.Add(grad.Dot(hidden.Transpose()))
	nn.bO = nn.bO.Add(grad)

	hidErr := nn.wHO.Transpose().Dot(outErr)
	hidGrad := hidden.Map(dsigmoid)
	for i := 0; i < hidGrad.Rows; i++ {
		hidGrad.Data[i][0] *= hidErr.Data[i][0] * nn.lr
	}

	nn.wIH = nn.wIH.Add(hidGrad.Dot(inputs.Transpose()))
	nn.bH = nn.bH.Add(hidGrad)
}

func main() {
	rand.Seed(time.Now().UnixNano())
	nn := NewDNN(2, 16, 1, 0.1)

	fmt.Println("Deep Learning Pi Estimator (based on plot.py)")
	fmt.Println("Training DNN to classify points inside/outside circle...")

	trainIter := 500000
	start := time.Now()
	for i := 0; i < trainIter; i++ {
		x, y := rand.Float64()*2-1, rand.Float64()*2-1
		target := 0.0
		if x*x+y*y <= 1.0 { target = 1.0 }
		nn.Train([]float64{x, y}, []float64{target})
	}
	fmt.Printf("Training complete in %v\n", time.Since(start))

	fmt.Println("Estimating Pi using 10 parallel goroutines...")
	testCount := 100000
	workers := 10
	var wg sync.WaitGroup
	var mu sync.Mutex
	inside := 0

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			localInside := 0
			for i := 0; i < testCount/workers; i++ {
				x, y := rand.Float64()*2-1, rand.Float64()*2-1
				if nn.FeedForward([]float64{x, y})[0] >= 0.5 {
					localInside++
				}
			}
			mu.Lock()
			inside += localInside
			mu.Unlock()
		}()
	}
	wg.Wait()

	pi := (float64(inside) / float64(testCount)) * 4
	fmt.Printf("\nResult: Pi ≈ %.6f (Actual: %.6f, Error: %.6f)\n", pi, math.Pi, math.Abs(math.Pi-pi))
}
