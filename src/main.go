package main

import (
	"fmt"
	"runtime"
	"sync"
)

func main() {
	//Check cores to determine the optimal amount of workers
	numWorkers := runtime.NumCPU()
	fmt.Printf("Detected %d cores \n", numWorkers)

	//Buffered channel for errors or the done signal, one potential error per process (each worker plus the collector and loader)
	statusChannel := make(chan error, numWorkers+2)
	defer close(statusChannel)

	//Buffered channels that hold words before and after reading/writing
	//inputChannel is closed when the loader finishes
	inputChannel := make(chan string, runtime.NumCPU()*2)
	//outputChannel is closed when both the loader and the workers finish
	outputChannel := make(chan string, 10000)

	//Placeholder hardcoded pipeline
	pipeline := BuildTestPipeline()

	//Begin listening to outputChannel and prepare to write words to file
	//Stops running when the file is fully read
	//Hardcoded for testing purposes
	go StartCollector(outputChannel, statusChannel, "wordlists/userGenerated", "newEnglish", true)

	//Initialize sync group for workers
	var wg sync.WaitGroup

	//Spawning worker goroutines
	for i := 0; i < numWorkers; i++ {
		//Incrementing sync group tracker
		wg.Add(1)

		//Launching a worker goroutine
		go func(workerID int) {
			//Updates sync group when finished
			defer wg.Done()
			//Workers will stop when inputChannel is closed an dempty
			worker(workerID, pipeline, inputChannel, outputChannel)
		}(i) // passing i in as workerID to prevent naming desync
	}

	//Begin reading the specified file and putting each word into the intputChannel
	//Stops running when the inputChannel is closed and empty
	//Hardcoded for testing purposes
	//StartLoader is in the sync group to prevent the outputChannel closing until all words are loaded and all workers are finished
	wg.Add(1)
	go func() {
		//Updates sync group when finished
		defer wg.Done()
		StartLoader(inputChannel, statusChannel, "wordlists/premade/englishWordlist")
	}()

	//Launching shutdown goroutine waiting for workers to finish
	go func() {
		wg.Wait()
		close(outputChannel)
	}()

	//Handling the two status cases: error or success
	for err := range statusChannel {
		//If we receive an error, print it but continue running to allow the program to exit properly
		if err != nil {
			fmt.Printf("Error reported: %v\n", err)
		} else {
			//Only exit When we receive the nil signal from collector meaning all read/write operations are done
			fmt.Printf("Exiting...\n")
			break
		}
	}
}
