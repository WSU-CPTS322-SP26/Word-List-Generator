package main

import "fmt"

// Recursive function that takes a single word through all its mutations
func runPipeline(word string, stage int, pipeline [][]Mutation, scratchpads [][]string, outputChannel chan<- string) {
	//Base case
	if stage == len(pipeline) {
		outputChannel <- word
		return
	}

	//This outer loop iterates through every "or" alternative for this specific stage
	for _, mutation := range pipeline[stage] {

		//Runs mutation and collects every variant of the word output by the current mutation
		//This also resets that stage's scratchpad to length 0 (effectively erasing its contents)
		variants := mutation(word, scratchpads[stage][:0])

		//The inner loop iterates through all the different variants produced and recurs them into their own next stage of the pipeline
		for _, variant := range variants {
			runPipeline(variant, stage+1, pipeline, scratchpads, outputChannel)
		}
	}
}
func worker(workerID int, pipeline [][]Mutation, inputChannel <-chan string, outputChannel chan<- string) {
	//Making buffers. These only serve this specific worker, one for each stage in the pipeline
	//Each stage needs its own buffer/scratchpad
	scratchpads := make([][]string, len(pipeline))
	for i := range scratchpads {
		//Capacity is preset
		scratchpads[i] = make([]string, 0, 256)
	}

	fmt.Printf("Running worker %d\n", workerID)
	//Now, begin running each word in the input channel through the pipeline of Mutations
	//Works until the inputChannel is closed and empty
	for word := range inputChannel {
		runPipeline(word, 0, pipeline, scratchpads, outputChannel)
	}
}
