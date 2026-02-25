package main

import (
	"strings"
	"unicode"
)

type Mutation func(word string, scratchpad []string) []string

// 1-to-Many Mutations: Taking one word and making multiple variants //

func CreateAppendMutation(charset string) Mutation {
	//Create a new slice of individual characters
	//Doing this now means that each worker doesn't need to do this themselves
	characters := make([]string, len(charset))

	//Transferring all the characters to the new slice
	for i, r := range charset {
		characters[i] = string(r)
	}

	//Note that this part right here is the actual reversing logic
	//Returning an anonymous function that matches our type Mutation
	//This is expecting scratchpad to be length 0 with some capacity
	return func(word string, scratchpad []string) []string {

		//Appending to the pre-used, length 0 buffer
		for _, c := range characters {
			scratchpad = append(scratchpad, word+c)
		}

		return scratchpad
	}
}

func CreatePrependMutation(charset string) Mutation {
	characters := make([]string, len(charset))

	for i, r := range charset {
		characters[i] = string(r)
	}

	return func(word string, scratchpad []string) []string {

		//Appending to the pre-used, length 0 buffer
		//Closure allows this anonymous function to access the charset
		for _, c := range characters {
			scratchpad = append(scratchpad, c+word)
		}

		return scratchpad
	}
}

// 1-to-1 Mutations: Only one output //

func CreateUpperCaseMutation() Mutation {
	return func(word string, scratchpad []string) []string {
		//appends new word to scratchpad and returns it
		return append(scratchpad, strings.ToUpper(word))
	}
}

func CreateLowerCaseMutation() Mutation {
	return func(word string, scratchpad []string) []string {
		return append(scratchpad, strings.ToLower(word))
	}
}

// These take a unicode language case, then apply that specific variant of toUpper or toLower
// This is a useful option for niche language cases, like the Turkish undotted lowercase i
func CreateSpecialUpperCaseMutation(language unicode.SpecialCase) Mutation {
	return func(word string, scratchpad []string) []string {
		//appends new word to scratchpad and returns it
		return append(scratchpad, strings.ToUpperSpecial(language, word))
	}
}
func CreateSpecialLowerCaseMutation(language unicode.SpecialCase) Mutation {
	return func(word string, scratchpad []string) []string {
		//appends new word to scratchpad and returns it
		return append(scratchpad, strings.ToUpperSpecial(language, word))
	}
}
