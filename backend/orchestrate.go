package src

import (
	"fmt"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

type ProgressUpdate struct {
	WordsProcessed int64   `json:"wordsProcessed"`
	ElapsedSec     float64 `json:"elapsedSec"`
	BytesWritten   int64   `json:"bytesWritten"`
}

type ProgressCallback func(update ProgressUpdate)

// RunGenerator runs the full pipeline. overwrite=true truncates the output file,
// overwrite=false appends to it (used for the append-to-existing feature).
func RunGenerator(
	pipeline [][]Mutation,
	inputWordlistPath string,
	outputDir string,
	outputFileName string,
	overwrite bool,
	onProgress ProgressCallback,
) {
	numWorkers := runtime.NumCPU()

	var wordsIn atomic.Int64
	var bytesOut atomic.Int64

	statusChannel := make(chan error, numWorkers+2)
	inputChannel := make(chan string, numWorkers*2)
	outputChannel := make(chan string, 10000)

	// countingLoader wraps StartLoader and counts every word dispatched.
	// StartLoader only sends to its status channel on error, never on success.
	// The non-blocking select avoids deadlocking on the status channel read.
	countingLoader := func() {
		defer close(inputChannel)
		innerStatus := make(chan error, 4)
		innerInput := make(chan string, numWorkers*2)
		go StartLoader(innerInput, innerStatus, inputWordlistPath)
		for word := range innerInput {
			inputChannel <- word
			wordsIn.Add(1)
		}
		select {
		case err := <-innerStatus:
			if err != nil {
				statusChannel <- err
			}
		default:
		}
	}

	// 2. Pass the dynamic output variables to StartCollector
	go StartCollector(outputChannel, statusChannel, outputDir, outputFileName, overwrite, &bytesOut)

	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			Worker(id, pipeline, inputChannel, outputChannel)
		}(i)
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		// 3. Pass the dynamic input variable to StartLoader
		countingLoader()
	}()

	go func() {
		wg.Wait()
		close(outputChannel)
	}()

	start := time.Now()
	done := make(chan struct{})

	go func() {
		ticker := time.NewTicker(250 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				if onProgress != nil {
					onProgress(ProgressUpdate{
						WordsProcessed: wordsIn.Load(),
						ElapsedSec:     time.Since(start).Seconds(),
						BytesWritten:   bytesOut.Load(),
					})
				}
			}
		}
	}()

	for err := range statusChannel {
		if err != nil {
			fmt.Printf("pipeline error: %v\n", err)
		} else {
			break
		}
	}
	close(done)

	if onProgress != nil {
		onProgress(ProgressUpdate{
			WordsProcessed: wordsIn.Load(),
			ElapsedSec:     time.Since(start).Seconds(),
			BytesWritten:   bytesOut.Load(),
		})
	}
}
