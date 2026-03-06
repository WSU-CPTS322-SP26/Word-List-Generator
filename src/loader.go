package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

// StartLoader is a function to take words from the baseline wordlist and write them to the inputChannel
// Expects open inputChannel, open statusChannel, and a filepath properly formatted for the user system
func StartLoader(inputChannel chan<- string, statusChannel chan<- error, filepath string) {

	//Close input file on return
	defer close(inputChannel)

	//Requiring a non-empty filepath
	if filepath == "" {
		statusChannel <- fmt.Errorf("loader error: filepath cannot be empty")
		return
	}

	//File interaction error handler
	file, err := os.Open(filepath)
	if err != nil {
		statusChannel <- fmt.Errorf("loader error: failed to open %s: %v", filepath, err)
		return
	}

	//Defer closing to ensure the file closes when function returns
	//Using closures to allow us to give a deferred operation error handling logic
	defer func(file *os.File) {
		err := file.Close()
		if err != nil {
			statusChannel <- fmt.Errorf("loader error: failed to close %s: %v", filepath, err)
		}
	}(file)

	//Buffered scanner to minimize disk access
	scanner := bufio.NewScanner(file)

	//Reading each word
	for scanner.Scan() {
		//Trimming whitespace and newlines
		word := strings.TrimSpace(scanner.Text())

		if word != "" {
			inputChannel <- word
		}
	}

	//Checking if the scanner loop ended due to an error
	if err := scanner.Err(); err != nil {
		statusChannel <- fmt.Errorf("loader error: failed to scan %s: %v", filepath, err)
	}
}
