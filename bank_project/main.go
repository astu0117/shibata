package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Matrix represents a 2D matrix
type Matrix struct {
	Rows, Cols int         `json:"rows"`
	Data       [][]float64 `json:"data"`
}

// ... (Matrix methods remain the same)

// NewMatrix creates a new matrix
func NewMatrix(rows, cols int) *Matrix {
	data := make([][]float64, rows)
	for i := range data {
		data[i] = make([]float64, cols)
	}
	return &Matrix{Rows: rows, Cols: cols, Data: data}
}

// RandomMatrix creates a new matrix with random values (He initialization approximation)
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
		panic(fmt.Sprintf("invalid dimensions: %dx%d and %dx%d", m.Rows, m.Cols, n.Rows, n.Cols))
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

func (m *Matrix) ScalarMultiply(n float64) *Matrix {
	res := NewMatrix(m.Rows, m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res.Data[i][j] = m.Data[i][j] * n
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

func (m *Matrix) ToArray() []float64 {
	res := make([]float64, m.Rows*m.Cols)
	for i := 0; i < m.Rows; i++ {
		for j := 0; j < m.Cols; j++ {
			res[i*m.Cols+j] = m.Data[i][j]
		}
	}
	return res
}

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

func softmax(arr []float64) []float64 {
	maxVal := -math.MaxFloat64
	for _, v := range arr {
		if v > maxVal {
			maxVal = v
		}
	}
	exp := make([]float64, len(arr))
	sum := 0.0
	for i, v := range arr {
		exp[i] = math.Exp(v - maxVal)
		sum += exp[i]
	}
	for i := range exp {
		exp[i] /= sum
	}
	return exp
}

// DNN represents a Deep Neural Network with multiple layers
type DNN struct {
	Layers  []int     `json:"layers"`
	Weights []*Matrix `json:"weights"`
	Biases  []*Matrix `json:"biases"`
	LR      float64   `json:"lr"`
}

func (nn *DNN) Save(filePath string) error {
	data, err := json.MarshalIndent(nn, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, data, 0644)
}

func LoadDNN(filePath string) (*DNN, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	var nn DNN
	err = json.Unmarshal(data, &nn)
	if err != nil {
		return nil, err
	}
	return &nn, nil
}

func NewDNN(layers []int, lr float64) *DNN {
	weights := make([]*Matrix, len(layers)-1)
	biases := make([]*Matrix, len(layers)-1)
	for i := 0; i < len(layers)-1; i++ {
		weights[i] = RandomMatrix(layers[i+1], layers[i])
		biases[i] = NewMatrix(layers[i+1], 1)
	}
	return &DNN{Layers: layers, Weights: weights, Biases: biases, LR: lr}
}

func (nn *DNN) FeedForward(inputArray []float64) []float64 {
	current := NewMatrix(len(inputArray), 1)
	for i, v := range inputArray {
		current.Data[i][0] = v
	}

	for i := 0; i < len(nn.Weights); i++ {
		current = nn.Weights[i].Dot(current).Add(nn.Biases[i])
		if i == len(nn.Weights)-1 {
			// Output layer: Softmax
			soft := softmax(current.ToArray())
			current = NewMatrix(len(soft), 1)
			for j, v := range soft {
				current.Data[j][0] = v
			}
		} else {
			// Hidden layers: ReLU
			current = current.Map(relu)
		}
	}
	return current.ToArray()
}

func (nn *DNN) Train(inputArray, targetArray []float64) float64 {
	current := NewMatrix(len(inputArray), 1)
	for i, v := range inputArray {
		current.Data[i][0] = v
	}

	layerInputs := make([]*Matrix, len(nn.Weights))
	activations := make([]*Matrix, len(nn.Weights)+1)
	activations[0] = current

	for i := 0; i < len(nn.Weights); i++ {
		z := nn.Weights[i].Dot(current).Add(nn.Biases[i])
		layerInputs[i] = z
		if i == len(nn.Weights)-1 {
			soft := softmax(z.ToArray())
			current = NewMatrix(len(soft), 1)
			for j, v := range soft {
				current.Data[j][0] = v
			}
		} else {
			current = z.Map(relu)
		}
		activations[i+1] = current
	}

	targets := NewMatrix(len(targetArray), 1)
	for i, v := range targetArray {
		targets.Data[i][0] = v
	}

	// For Softmax + Cross-Entropy, error is (output - target)
	errors := activations[len(activations)-1].Subtract(targets)

	dLoss := errors // Gradient for the last layer

	for i := len(nn.Weights) - 1; i >= 0; i-- {
		var gradients *Matrix
		if i == len(nn.Weights)-1 {
			gradients = dLoss
		} else {
			gradients = layerInputs[i].Map(drelu).Multiply(dLoss)
		}

		gradientsLR := gradients.ScalarMultiply(nn.LR)
		prevT := activations[i].Transpose()
		weightDeltas := gradientsLR.Dot(prevT)

		nn.Weights[i] = nn.Weights[i].Subtract(weightDeltas)
		nn.Biases[i] = nn.Biases[i].Subtract(gradientsLR)

		if i > 0 {
			weightsT := nn.Weights[i].Transpose()
			dLoss = weightsT.Dot(gradients)
		}
	}

	// Calculate MSE for logging
	mse := 0.0
	for i := 0; i < errors.Rows; i++ {
		mse += errors.Data[i][0] * errors.Data[i][0]
	}
	return mse / float64(errors.Rows)
}

type BankData struct {
	Name    string
	Numbers []float64
}

type Prediction struct {
	Bank       string
	Confidence float64
	Scores     []float64
}

func normalize(nums []float64) []float64 {
	res := make([]float64, 3)
	res[0] = nums[0] / 1000.0
	res[1] = nums[1] / 10000000.0
	res[2] = nums[2] / 10000000.0
	return res
}

func makeNameIndex(bankNames []string) map[string]int {
	nameToID := make(map[string]int)
	for i, name := range bankNames {
		nameToID[name] = i
	}
	return nameToID
}

func defaultTrainingData() []BankData {
	return []BankData{
		{Name: "mizuho", Numbers: []float64{560, 2278648, 0}},
		{Name: "saitamarisona", Numbers: []float64{793, 0, 4366399}},
		{Name: "mitsuisumitomo", Numbers: []float64{200, 4902647, 0}},
		{Name: "sonybank", Numbers: []float64{1, 6774308, 0}},
	}
}

func trainModel(nn *DNN, rawData []BankData, bankNames []string, epochs int, r *rand.Rand) bool {
	nameToID := makeNameIndex(bankNames)
	for e := 0; e < epochs; e++ {
		epochLoss := 0.0
		r.Shuffle(len(rawData), func(i, j int) {
			rawData[i], rawData[j] = rawData[j], rawData[i]
		})

		for _, data := range rawData {
			target := make([]float64, len(bankNames))
			target[nameToID[data.Name]] = 1.0
			loss := nn.Train(normalize(data.Numbers), target)
			if math.IsNaN(loss) {
				fmt.Printf("\nNaN detected at epoch %d. Aborting training.\n", e)
				return false
			}
			epochLoss += loss
		}
		if e%(epochs/10) == 0 {
			fmt.Printf("Epoch %5d/%d | Loss: %.8f\n", e, epochs, epochLoss/float64(len(rawData)))
		}
	}
	return true
}

func predictBank(nn *DNN, bankNames []string, numbers []float64) Prediction {
	scores := nn.FeedForward(normalize(numbers))
	maxIdx := 0
	maxVal := -1.0
	for i, val := range scores {
		if val > maxVal {
			maxVal = val
			maxIdx = i
		}
	}
	return Prediction{Bank: bankNames[maxIdx], Confidence: maxVal, Scores: scores}
}

func parseNumbers(args []string) ([]float64, error) {
	if len(args) != 3 {
		return nil, fmt.Errorf("expected 3 numeric values: branch account1 account2")
	}
	nums := make([]float64, 3)
	for i, raw := range args {
		value, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid number %q", raw)
		}
		nums[i] = value
	}
	return nums, nil
}

func printHelp() {
	fmt.Println("Commands:")
	fmt.Println("  predict <branch> <account1> <account2>  Run DNN prediction")
	fmt.Println("  learn <bank> <branch> <account1> <account2>  Add sample and retrain")
	fmt.Println("  banks                                   List known bank labels")
	fmt.Println("  save                                    Save weights_go.json")
	fmt.Println("  help                                    Show commands")
	fmt.Println("  exit                                    Quit")
}

func runChat(nn *DNN, rawData []BankData, bankNames []string, r *rand.Rand) {
	scanner := bufio.NewScanner(os.Stdin)
	fmt.Println("\nConversational AI DNN CLI is ready. Type help for commands.")
	for {
		fmt.Print("ai-dnn> ")
		if !scanner.Scan() {
			fmt.Println()
			return
		}

		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		cmd := strings.ToLower(fields[0])

		switch cmd {
		case "exit", "quit":
			fmt.Println("bye")
			return
		case "help":
			printHelp()
		case "banks":
			fmt.Println(strings.Join(bankNames, ", "))
		case "predict":
			nums, err := parseNumbers(fields[1:])
			if err != nil {
				fmt.Println("error:", err)
				continue
			}
			prediction := predictBank(nn, bankNames, nums)
			fmt.Printf("Predicted: %s (confidence %.2f%%)\n", prediction.Bank, prediction.Confidence*100)
			fmt.Printf("Scores: %v\n", prediction.Scores)
		case "learn":
			if len(fields) != 5 {
				fmt.Println("error: expected learn <bank> <branch> <account1> <account2>")
				continue
			}
			bank := strings.ToLower(fields[1])
			if _, ok := makeNameIndex(bankNames)[bank]; !ok {
				fmt.Println("error: unknown bank. Use banks to list labels.")
				continue
			}
			nums, err := parseNumbers(fields[2:])
			if err != nil {
				fmt.Println("error:", err)
				continue
			}
			rawData = append(rawData, BankData{Name: bank, Numbers: nums})
			fmt.Println("Learning from new sample...")
			trainModel(nn, rawData, bankNames, 2000, r)
			fmt.Println("Learning complete.")
		case "save":
			if err := nn.Save("weights_go.json"); err != nil {
				fmt.Printf("Error saving weights: %v\n", err)
			} else {
				fmt.Println("Weights saved to weights_go.json.")
			}
		default:
			fmt.Println("unknown command. Type help for commands.")
		}
	}
}

func main() {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	bankNames := []string{"mizuho", "saitamarisona", "mitsuisumitomo", "sonybank"}
	rawData := defaultTrainingData()

	nn := NewDNN([]int{3, 16, 16, 4}, 0.01)

	fmt.Println("=== Conversational Bank Prediction DNN (Go) ===")
	fmt.Println("Concurrency: goroutines are used for matrix dot products")
	fmt.Println("Architecture: 3 inputs -> 16 -> 16 -> 4 outputs")
	fmt.Println("Training...")

	if !trainModel(nn, rawData, bankNames, 10000, r) {
		return
	}

	fmt.Println("\nTraining Complete. Verification:")

	for _, data := range rawData {
		prediction := predictBank(nn, bankNames, data.Numbers)
		fmt.Printf("Input: %-15s %v -> Predicted: %-15s (Confidence: %6.2f%%)\n",
			data.Name, data.Numbers, prediction.Bank, prediction.Confidence*100)
	}

	fmt.Println("\nSaving weights to weights_go.json...")
	if err := nn.Save("weights_go.json"); err != nil {
		fmt.Printf("Error saving weights: %v\n", err)
	} else {
		fmt.Println("Weights saved.")
	}

	runChat(nn, rawData, bankNames, r)
}
