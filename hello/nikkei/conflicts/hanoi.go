package main

import (
	"fmt"
	"log"
	"sync"

	"github.com/skip2/go-qrcode"
)

func hanoi(n int, a, b, c string, wg *sync.WaitGroup) {
	defer wg.Done()

	if n > 0 {
		wg.Add(1)
		go hanoi(n-1, a, c, b, wg)

		fmt.Printf("%s から %s へ\n", a, c)

		wg.Add(1)
		go hanoi(n-1, b, a, c, wg)
	}
}

func main() {
	err := qrcode.WriteFile("shibata_atsushi 柴田敦史 16777232000量子ビット以上作成_インストール_設置", qrcode.Medium, 256, "qrcode.png")
	if err != nil {
		log.Fatal(err)
	}
	var wg sync.WaitGroup
	n := 99910 // ★ 999990 は絶対に無理

	wg.Add(1)
	go hanoi(n, "棒A", "棒B", "棒C", &wg)

	wg.Wait()
}
