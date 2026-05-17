# liberation

![Codeberg Release](https://img.shields.io/gitea/v/release/go-fonts/liberation?gitea_url=https%3A%2F%2Fcodeberg.org)
[![GoDoc](https://godoc.org/codeberg.org/go-fonts/liberation?status.svg)](https://godoc.org/codeberg.org/go-fonts/liberation)
[![License](https://img.shields.io/badge/License-BSD--3-blue.svg)](https://codeberg.org/go-fonts/liberation/raw/main/LICENSE)

`liberation` provides the [liberation](https://github.com/liberationfonts/liberation-fonts/) fonts as importable Go packages.

The fonts are released under the [SIL Open Font](https://codeberg.org/go-fonts/liberation/raw/main/LICENSE-SIL) license.
The Go packages under the [BSD-3](https://codeberg.org/go-fonts/liberation/raw/main/LICENSE) license.

## Example

```go
import (
	"fmt"
	"log"

	"codeberg.org/go-fonts/liberation/liberationserifregular"
	"golang.org/x/image/font/sfnt"
)

func Example() {
	ttf, err := sfnt.Parse(liberationserifregular.TTF)
	if err != nil {
		log.Fatalf("could not parse Liberation Serif font: %+v", err)
	}

	var buf sfnt.Buffer
	v, err := ttf.Name(&buf, sfnt.NameIDVersion)
	if err != nil {
		log.Fatalf("could not retrieve font version: %+v", err)
	}

	fmt.Printf("version:    %s\n", v)
	fmt.Printf("num glyphs: %d\n", ttf.NumGlyphs())

	// Output:
	// version:    Version 2.1.4
	// num glyphs: 2601
}
```
