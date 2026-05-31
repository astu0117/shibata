package main

import (
	"sort"
	"sync"
)

type TorRelay struct {
	No                  int
	Nickname            string
	Fingerprint         string
	Country             string
	Flags               []string
	ObservedBandwidth   float64
	AdvertisedBandwidth float64
	PrimaryRole         string
}

func torPrimaryRole(flags []string) string {
	has := func(target string) bool {
		for _, flag := range flags {
			if flag == target {
				return true
			}
		}
		return false
	}

	switch {
	case has("Exit"):
		return "exit"
	case has("Guard"):
		return "guard"
	case has("Authority") || has("V2Dir"):
		return "directory"
	default:
		return "relay"
	}
}

func SortAndNumberTorRelays(relays []TorRelay) []TorRelay {
	ordered := append([]TorRelay(nil), relays...)
	sort.SliceStable(ordered, func(i, j int) bool {
		return ordered[i].ObservedBandwidth > ordered[j].ObservedBandwidth
	})

	var wg sync.WaitGroup
	for i := range ordered {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			ordered[index].No = index + 1
			ordered[index].PrimaryRole = torPrimaryRole(ordered[index].Flags)
		}(i)
	}
	wg.Wait()

	return ordered
}
