package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
)

//TODO: User progress update
//TODO: alt error report: status <- fmt.Errorf("collector create: %w", err)

// Function to write words from the outputChannel to file, then sends a done signal to the status channel
// Expects the output channel, the done channel, the path, and the name of the file. Also checks if the file is to be overwritten with new data
func StartCollector(outputChannel <-chan string, status chan<- error, filename string, path string, overwrite bool) {

	//Tracker for initializing the filepaths only if words are put into the buffer
	fileCreated := false
	//Various variables
	var outFile *os.File
	var outFileBuffer *bufio.Writer
	var err error
	var flags int

	//Requiring a non-empty name
	if filename == "" {
		status <- fmt.Errorf("collector error: filename cannot be empty")
		return
	}

	//Extracting the extension and checking to see if we need to apply the default .txt extension
	extension := filepath.Ext(filename)
	if extension == "" {
		filename += ".txt"
	}

	//Using filepath.Join helps with cross-compatability by cleaning and formatting for the specific current operating system
	fullPath := filepath.Join(path, filename)

	//Runs until outputChannel is closed
	for word := range outputChannel {
		//Only undergoes file creation/checking the first time the outputChannel receives something
		//This prevents unnecessary operations on empty outputChannels
		if !fileCreated {
			//Attempting to repair broken folder structure in case wordlists and/or userGenerated was moved/deleted
			//0755 perms provides necessary perms for a folder (being able to execute it is mandatory)
			if err := os.MkdirAll(path, 0755); err != nil {
				status <- fmt.Errorf("Failed to create directory: %v", err)
				return
			}

			//Change the flags of the OpenFile call based on whether we want to overwrite or not
			if overwrite {
				flags = os.O_TRUNC | os.O_CREATE | os.O_WRONLY
			} else {
				flags = os.O_APPEND | os.O_CREATE | os.O_WRONLY
			}

			//Create the file or append to it
			outFile, err = os.OpenFile(fullPath, flags, 0666)

			if err != nil {
				status <- fmt.Errorf("Failed to create file: %v", err)
				return
			}

			outFileBuffer = bufio.NewWriter(outFile)
			fileCreated = true
		}
		//Now that we're ready to write, start filling up the outFileBuffer and skip previous logic
		_, err := outFileBuffer.WriteString(word + "\n")
		if err != nil {
			status <- fmt.Errorf("Failed to write to buffer: %v", err)
			break
		}
	}

	//Flushes any remaining data in the outFileBuffer, writing it to file
	if fileCreated {
		if err := outFileBuffer.Flush(); err != nil {
			status <- fmt.Errorf("Failed to flush buffer: %v", err)
			outFile.Close()
			return
		}
		outFile.Close()
	}

	//report done, which signals that main can continue (among other things probably)
	status <- nil
}
