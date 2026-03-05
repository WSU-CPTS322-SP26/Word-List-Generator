package main

func main() {
	//Buffered channels that hold words before and after reading/writing
	inputChan := make(chan string, 100)
	outputChan := make(chan string, 100)

	//Unbuffered error channel, also used for transmitting done
	statusChan := make(chan error)

	//Begin listening to outputChan and prepare to write words to file
	go StartCollector(outputChan, statusChan, "wordlists/userGenerated", "namesNew", true)

}
