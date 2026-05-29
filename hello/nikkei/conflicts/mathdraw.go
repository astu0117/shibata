package main

import (
	"fmt"
	"image/color"
	"math"
	"os"
	"sync"

	"gonum.org/v1/plot"
	"gonum.org/v1/plot/plotter"
	"gonum.org/v1/plot/vg"
)

type LineConfig struct {
	Mode int // 1:y=ax+b  2:x=a  3:y=a  4:xy=a  5:y=a*x*x+b
	A    float64
	B    float64
}

func main() {
	// Python の LINES=5 に対応
	lines := []LineConfig{
		{Mode: 1, A: 1, B: 0},
		{Mode: 3, A: 2},
		{Mode: 2, A: -3},
		{Mode: 5, A: 0.1, B: -1},
		{Mode: 4, A: 5},
	}

	xMin, xMax := -10.0, 10.0
	yMin, yMax := -10.0, 10.0

	p := plot.New()
	p.Title.Text = "MathDraw (Go版)"
	p.X.Min, p.X.Max = xMin, xMax
	p.Y.Min, p.Y.Max = yMin, yMax
	p.Add(plotter.NewGrid())

	var wg sync.WaitGroup

	for _, ln := range lines {
		wg.Add(1)
		go func(cfg LineConfig) {
			defer wg.Done()
			addLine(p, cfg, xMin, xMax)
		}(ln)
	}

	wg.Wait()

	if err := p.Save(400*vg.Points, 400*vg.Points, "output.png"); err != nil {
		fmt.Println("保存エラー:", err)
		os.Exit(1)
	}

	fmt.Println("output.png を生成しました")
}

func addLine(p *plot.Plot, cfg LineConfig, xMin, xMax float64) {
	switch cfg.Mode {

	case 1: // y=ax+b
		f := plotter.NewFunction(func(x float64) float64 {
			return cfg.A*x + cfg.B
		})
		f.Color = color.Black
		p.Add(f)

	case 2: // x=a
		pts := make(plotter.XYs, 2)
		pts[0].X, pts[0].Y = cfg.A, -100
		pts[1].X, pts[1].Y = cfg.A, 100
		l, _ := plotter.NewLine(pts)
		l.Color = color.RGBA{255, 0, 0, 255}
		p.Add(l)

	case 3: // y=a
		pts := make(plotter.XYs, 2)
		pts[0].X, pts[0].Y = -100, cfg.A
		pts[1].X, pts[1].Y = 100, cfg.A
		l, _ := plotter.NewLine(pts)
		l.Color = color.RGBA{0, 0, 255, 255}
		p.Add(l)

	case 4: // xy=a → y=a/x
		f := plotter.NewFunction(func(x float64) float64 {
			if x == 0 {
				return math.NaN()
			}
			return cfg.A / x
		})
		f.Color = color.RGBA{0, 128, 0, 255}
		p.Add(f)

	case 5: // y=a*x*x + b
		f := plotter.NewFunction(func(x float64) float64 {
			return cfg.A*x*x + cfg.B
		})
		f.Color = color.RGBA{128, 0, 128, 255}
		p.Add(f)
	}
}
