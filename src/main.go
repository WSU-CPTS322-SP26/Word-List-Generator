package main

import (
	"fmt"
	"runtime"
	"sync"
)

func main() {
	//Buffered channel for errors or the done signal
	statusChan := make(chan error, 1)

	//Buffered channels that hold words before and after reading/writing
	inputChan := make(chan string, runtime.NumCPU()*2)
	outputChan := make(chan string, 10000)

	//Check cores to determine the optimal amount of workers
	numWorkers := runtime.NumCPU()
	fmt.Printf("Detected %d cores \n", numWorkers)

	//Placeholder
	pipeline := [][]Mutation{}

	//Initialize sync group for workers
	var wg sync.WaitGroup

	//Spawning worker goroutines
	for i := 0; i < numWorkers; i++ {

		//Incrementing sync group tracker
		wg.Add(1)

		//Launching a worker goroutine
		go func(workerID int) {
			defer wg.Done()
			worker(workerID, pipeline, inputChan, outputChan)
		}(i) // passing i in as workerID to prevent naming desync
	}

	//Launching shutdown goroutine waiting for workers to finish
	go func() {
		wg.Wait()
		close(outputChan)
	}()

	//Begin listening to outputChan and prepare to write words to file
	//Hardcoded for testing purposes
	go StartCollector(outputChan, statusChan, "wordlists/userGenerated", "namesNew", true)

}
