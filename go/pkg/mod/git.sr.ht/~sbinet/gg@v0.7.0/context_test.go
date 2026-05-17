// Copyright ©2022 The gg Authors. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package gg

import (
	"image/color"
	"math/rand"
	"os"
	"path/filepath"
	"testing"

	"git.sr.ht/~sbinet/cmpimg"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
)

func saveImage(dc *Context, name string) error {
	return SavePNG(name, dc.Image())
}

func chkimg(fn func(), t *testing.T, fname string) {
	t.Helper()
	cmpimg.CheckPlot(fn, t, fname)
	if !t.Failed() {
		_ = os.Remove(filepath.Join("testdata", fname))
	}
}

func TestBlank(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			saveImage(dc, "testdata/blank.png")
		}, t, "blank.png",
	)
}

func TestGrid(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			for i := 10; i < 100; i += 10 {
				x := float64(i) + 0.5
				dc.DrawLine(x, 0, x, 100)
				dc.DrawLine(0, x, 100, x)
			}
			dc.SetRGB(0, 0, 0)
			dc.Stroke()
			saveImage(dc, "testdata/grid.png")
		}, t, "grid.png",
	)
}

func TestLines(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(0.5, 0.5, 0.5)
			dc.Clear()
			rnd := rand.New(rand.NewSource(99))
			for i := 0; i < 100; i++ {
				x1 := rnd.Float64() * 100
				y1 := rnd.Float64() * 100
				x2 := rnd.Float64() * 100
				y2 := rnd.Float64() * 100
				dc.DrawLine(x1, y1, x2, y2)
				dc.SetLineWidth(rnd.Float64() * 3)
				dc.SetRGB(rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.Stroke()
			}
			saveImage(dc, "testdata/lines.png")
		}, t, "lines.png",
	)
}

func TestCircles(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			rnd := rand.New(rand.NewSource(99))
			for i := 0; i < 10; i++ {
				x := rnd.Float64() * 100
				y := rnd.Float64() * 100
				r := rnd.Float64()*10 + 5
				dc.DrawCircle(x, y, r)
				dc.SetRGB(rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.FillPreserve()
				dc.SetRGB(rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.SetLineWidth(rnd.Float64() * 3)
				dc.Stroke()
			}
			saveImage(dc, "testdata/circles.png")
		}, t, "circles.png",
	)
}

func TestQuadratic(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(0.25, 0.25, 0.25)
			dc.Clear()
			rnd := rand.New(rand.NewSource(99))
			for i := 0; i < 100; i++ {
				x1 := rnd.Float64() * 100
				y1 := rnd.Float64() * 100
				x2 := rnd.Float64() * 100
				y2 := rnd.Float64() * 100
				x3 := rnd.Float64() * 100
				y3 := rnd.Float64() * 100
				dc.MoveTo(x1, y1)
				dc.QuadraticTo(x2, y2, x3, y3)
				dc.SetLineWidth(rnd.Float64() * 3)
				dc.SetRGB(rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.Stroke()
			}
			saveImage(dc, "testdata/quadratic.png")
		}, t, "quadratic.png",
	)
}

func TestCubic(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(0.75, 0.75, 0.75)
			dc.Clear()
			rnd := rand.New(rand.NewSource(99))
			for i := 0; i < 100; i++ {
				x1 := rnd.Float64() * 100
				y1 := rnd.Float64() * 100
				x2 := rnd.Float64() * 100
				y2 := rnd.Float64() * 100
				x3 := rnd.Float64() * 100
				y3 := rnd.Float64() * 100
				x4 := rnd.Float64() * 100
				y4 := rnd.Float64() * 100
				dc.MoveTo(x1, y1)
				dc.CubicTo(x2, y2, x3, y3, x4, y4)
				dc.SetLineWidth(rnd.Float64() * 3)
				dc.SetRGB(rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.Stroke()
			}
			saveImage(dc, "testdata/cubic.png")
		}, t, "cubic.png",
	)
}

func TestFill(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			rnd := rand.New(rand.NewSource(99))
			for i := 0; i < 10; i++ {
				dc.NewSubPath()
				for j := 0; j < 10; j++ {
					x := rnd.Float64() * 100
					y := rnd.Float64() * 100
					dc.LineTo(x, y)
				}
				dc.ClosePath()
				dc.SetRGBA(rnd.Float64(), rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.Fill()
			}
			saveImage(dc, "testdata/fill.png")
		}, t, "fill.png",
	)
}

func TestClip(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			dc.DrawCircle(50, 50, 40)
			dc.Clip()
			rnd := rand.New(rand.NewSource(99))
			for i := 0; i < 1000; i++ {
				x := rnd.Float64() * 100
				y := rnd.Float64() * 100
				r := rnd.Float64()*10 + 5
				dc.DrawCircle(x, y, r)
				dc.SetRGBA(rnd.Float64(), rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.Fill()
			}
			saveImage(dc, "testdata/clip.png")
		}, t, "clip.png",
	)
}

func TestPushPop(t *testing.T) {
	chkimg(
		func() {
			const S = 100
			dc := NewContext(S, S)
			dc.SetRGBA(0, 0, 0, 0.1)
			for i := 0; i < 360; i += 15 {
				dc.Push()
				dc.RotateAbout(Radians(float64(i)), S/2, S/2)
				dc.DrawEllipse(S/2, S/2, S*7/16, S/8)
				dc.Fill()
				dc.Pop()
			}
			saveImage(dc, "testdata/push_pop.png")
		}, t, "push_pop.png",
	)
}

func TestDrawStringWrapped(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			dc.SetRGB(0, 0, 0)
			dc.DrawStringWrapped("Hello, world! How are you?", 50, 50, 0.5, 0.5, 90, 1.5, AlignCenter)
			saveImage(dc, "testdata/draw_string_wrapped.png")
		}, t, "draw_string_wrapped.png",
	)
}

func TestDrawStringGoFont(t *testing.T) {
	chkimg(
		func() {
			font, err := opentype.Parse(goregular.TTF)
			if err != nil {
				t.Fatalf("could not parse Gofont: %+v", err)
			}

			face, err := opentype.NewFace(font, &opentype.FaceOptions{
				Size: 12,
				DPI:  72,
			})
			if err != nil {
				t.Fatalf("could not create face for Gofont: %+v", err)
			}
			defer face.Close()

			dc := NewContext(200, 200)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			dc.SetColor(color.Black)
			dc.SetFontFace(face)
			dc.DrawStringAnchored("Hello, world!", 100, 100, 0.5, 0.5)

			saveImage(dc, "testdata/draw_string_gofont.png")
		}, t, "draw_string_gofont.png",
	)
}

func TestDrawImage(t *testing.T) {
	chkimg(
		func() {
			src := NewContext(100, 100)
			src.SetRGB(1, 1, 1)
			src.Clear()
			for i := 10; i < 100; i += 10 {
				x := float64(i) + 0.5
				src.DrawLine(x, 0, x, 100)
				src.DrawLine(0, x, 100, x)
			}
			src.SetRGB(0, 0, 0)
			src.Stroke()

			dc := NewContext(200, 200)
			dc.SetRGB(0, 0, 0)
			dc.Clear()
			dc.DrawImage(src.Image(), 50, 50)
			saveImage(dc, "testdata/draw_image.png")
		}, t, "draw_image.png",
	)
}

func TestSetPixel(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(0, 0, 0)
			dc.Clear()
			dc.SetRGB(0, 1, 0)
			i := 0
			for y := 0; y < 100; y++ {
				for x := 0; x < 100; x++ {
					if i%31 == 0 {
						dc.SetPixel(x, y)
					}
					i++
				}
			}
			saveImage(dc, "testdata/set_pixel.png")
		}, t, "set_pixel.png",
	)
}

func TestDrawPoint(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(0, 0, 0)
			dc.Clear()
			dc.SetRGB(0, 1, 0)
			dc.Scale(10, 10)
			for y := 0; y <= 10; y++ {
				for x := 0; x <= 10; x++ {
					dc.DrawPoint(float64(x), float64(y), 3)
					dc.Fill()
				}
			}
			saveImage(dc, "testdata/draw_point.png")
		}, t, "draw_point.png",
	)
}

func TestLinearGradient(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			g := NewLinearGradient(0, 0, 100, 100)
			g.AddColorStop(0, color.RGBA{0, 255, 0, 255})
			g.AddColorStop(1, color.RGBA{0, 0, 255, 255})
			g.AddColorStop(0.5, color.RGBA{255, 0, 0, 255})
			dc.SetFillStyle(g)
			dc.DrawRectangle(0, 0, 100, 100)
			dc.Fill()
			saveImage(dc, "testdata/linear_gradient.png")
		}, t, "linear_gradient.png",
	)
}

func TestRadialGradient(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			g := NewRadialGradient(30, 50, 0, 70, 50, 50)
			g.AddColorStop(0, color.RGBA{0, 255, 0, 255})
			g.AddColorStop(1, color.RGBA{0, 0, 255, 255})
			g.AddColorStop(0.5, color.RGBA{255, 0, 0, 255})
			dc.SetFillStyle(g)
			dc.DrawRectangle(0, 0, 100, 100)
			dc.Fill()
			saveImage(dc, "testdata/radial_gradient.png")
		}, t, "radial_gradient.png",
	)
}

func TestDashes(t *testing.T) {
	chkimg(
		func() {
			dc := NewContext(100, 100)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			rnd := rand.New(rand.NewSource(99))
			for i := 0; i < 100; i++ {
				x1 := rnd.Float64() * 100
				y1 := rnd.Float64() * 100
				x2 := rnd.Float64() * 100
				y2 := rnd.Float64() * 100
				dc.SetDash(rnd.Float64()*3+1, rnd.Float64()*3+3)
				dc.DrawLine(x1, y1, x2, y2)
				dc.SetLineWidth(rnd.Float64() * 3)
				dc.SetRGB(rnd.Float64(), rnd.Float64(), rnd.Float64())
				dc.Stroke()
			}
			saveImage(dc, "testdata/dashes.png")
		}, t, "dashes.png",
	)
}

func TestIssue85(t *testing.T) {
	chkimg(
		func() {
			// https://github.com/fogleman/gg/issues/85
			const (
				W  = 1024.0
				H  = 1024.0
				nn = 100000
			)

			var (
				N  = float64(nn)
				dx = float64(W) / float64(nn)

				ylow = H / 3.0
				yhi  = 2.0 * H / 3.0
			)

			dc := NewContext(W, H)
			dc.SetRGB(1, 1, 1)
			dc.Clear()
			dc.SetRGB(0, 0, 0)
			dc.SetLineWidth(1)
			var (
				x = 0.0
				y = ylow
			)
			dc.MoveTo(x, y)
			for i := 1; i < nn; i++ {
				j := float64(i)
				x += dx
				switch {
				case j < 0.1*N:
					y = ylow
				case 0.1*N <= j && j < 0.5*N:
					y = yhi
				case 0.5*N <= j && j < 0.55*N:
					y = ylow
				case 0.55*N <= j && j < 0.9*N:
					y = yhi
				default:
					y = ylow
				}

				dc.LineTo(x, y)
			}
			dc.Stroke()

			saveImage(dc, "testdata/issue85.png")
		}, t, "issue85.png",
	)
}

func TestSetInterpolator(t *testing.T) {
	ctx := NewContext(100, 100)
	defer func() {
		e := recover()
		if e == nil {
			t.Fatalf("expected a panic")
		}
		if got, want := e.(error).Error(), "gg: invalid interpolator"; got != want {
			t.Fatalf("invalid panic message:\ngot= %q\nwant=%q", got, want)
		}
	}()
	ctx.SetInterpolator(nil)
}

func BenchmarkCircles(b *testing.B) {
	dc := NewContext(1000, 1000)
	dc.SetRGB(1, 1, 1)
	dc.Clear()
	rnd := rand.New(rand.NewSource(99))
	for i := 0; i < b.N; i++ {
		x := rnd.Float64() * 1000
		y := rnd.Float64() * 1000
		dc.DrawCircle(x, y, 10)
		if i%2 == 0 {
			dc.SetRGB(0, 0, 0)
		} else {
			dc.SetRGB(1, 1, 1)
		}
		dc.Fill()
	}
}
