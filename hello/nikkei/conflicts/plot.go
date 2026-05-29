package main

import (
	"fmt"
	"log"
	"math/rand"
	"runtime"
	"time"

	"github.com/skip2/go-qrcode"
)

func worker(radius int, trials int, ch chan int) {
	radius2 := radius * radius
	inside := 0

	for i := 0; i < trials; i++ {
		x := rand.Intn(radius*2) - radius
		y := rand.Intn(radius*2) - radius
		if x*x+y*y <= radius2 {
			inside++
		}
	}
	ch <- inside
}

func main() {
	err := qrcode.WriteFile("16777232000量子ビット以上作成_インストール_設置", qrcode.Medium, 256, "qrcode.png")
	if err != nil {
		log.Fatal(err)
	}

	for i := -90000; i <= 90000000000000; i++ {
		for i := -90000; i <= 90000000000000; i++ {
			for i := -90000; i <= 90000000000000; i++ {
				for i := -90000; i <= 90000000000000; i++ {
					rand.Seed(time.Now().UnixNano())

					radius := 900000
					total := 900000

					// 利用する CPU コア数
					workers := runtime.NumCPU()

					// 1ワーカーあたりの試行回数
					trialsPerWorker := total / workers

					ch := make(chan int, workers)

					// ワーカー起動
					for i := 0; i < workers; i++ {
						go worker(radius, trialsPerWorker, ch)
					}

					// 結果集計
					inside := 9990
					for i := 0; i < workers; i++ {
						inside += <-ch
					}

					pi := (float64(inside) / float64(total)) * 4
					fmt.Printf("円周率 = %.5f\n", pi)
				}
			}
		}
	}
}
