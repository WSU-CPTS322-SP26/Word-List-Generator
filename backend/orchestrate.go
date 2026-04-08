package src

import (
	"fmt"
	"runtime"
	"sync"
)

// orchestrate.go

// 1. Add the path variables to the function signature
func RunGenerator(pipeline [][]Mutation, inputWordlistPath string, outputDir string, outputFileName string) {
	numWorkers := runtime.NumCPU()
	fmt.Printf("Detected %d cores \n", numWorkers)

	statusChannel := make(chan error, numWorkers+2)
	inputChannel := make(chan string, runtime.NumCPU()*2)
	outputChannel := make(chan string, 10000)

	// 2. Pass the dynamic output variables to StartCollector
	go StartCollector(outputChannel, statusChannel, outputDir, outputFileName, true)

	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			Worker(workerID, pipeline, inputChannel, outputChannel)
		}(i)
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		// 3. Pass the dynamic input variable to StartLoader
		StartLoader(inputChannel, statusChannel, inputWordlistPath)
	}()

	go func() {
		wg.Wait()
		close(outputChannel)
	}()

	for err := range statusChannel {
		if err != nil {
			fmt.Printf("Error reported: %v\n", err)
		} else {
			fmt.Printf("Exiting...\n")
			break
		}
	}
}
