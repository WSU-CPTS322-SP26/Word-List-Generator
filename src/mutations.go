package main

import (
	"strings"
	"unicode"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

//TODO
//X case up
//X case down
//Leetspeak (multiple versions
//-
//alternate caps
//reverse string

// Mutation Defines a Mutation function, allowing structural typing
type Mutation func(word string, scratchpad []string) []string

// Helper Mutations: Mutations that alter mutations, or assist in some way //

// MakeOptional takes a Mutation, then returns a modified version of the mutation that also returns the unaltered word
func MakeOptional(mut Mutation) Mutation {
	return func(word string, scratchpad []string) []string {
		//Put original unchanged word in scratchpad
		scratchpad = append(scratchpad, word)

		//Run the mutation and append its new word to the same scratchpad
		temp := mut(word, []string{})
		scratchpad = append(scratchpad, temp...)

		return scratchpad
	}
}

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
		//Throwing away the slice index label with _
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
		//Throwing away the slice index label with _
		for _, c := range characters {
			scratchpad = append(scratchpad, c+word)
		}

		return scratchpad
	}
}

// 1-to-1 Mutations: Only one output //

//These take a Unicode language case, then apply that specific variant of toUpper or toLower
// This is a useful option for niche language cases, like the Turkish undotted lowercase i
//Default is assumed to be English

func CreateUpperCaseMutation(language unicode.SpecialCase) Mutation {
	return func(word string, scratchpad []string) []string {
		//appends new word to scratchpad and returns it
		return append(scratchpad, strings.ToUpperSpecial(language, word))
	}
}
func CreateLowerCaseMutation(language unicode.SpecialCase) Mutation {
	return func(word string, scratchpad []string) []string {
		//appends new word to scratchpad and returns it
		return append(scratchpad, strings.ToUpperSpecial(language, word))
	}
}

func CreateTitleMutation(lang language.Tag) Mutation {
	caser := cases.Title(lang)
	return func(word string, scratchpad []string) []string {
		return append(scratchpad, caser.String(word))
	}
}
