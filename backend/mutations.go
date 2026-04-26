package src

import (
	"strings"
	"unicode"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// Mutation Defines a Mutation function, allowing structural typing
type Mutation func(word string, scratchpad []string) []string

// 1-to-Many Mutations: Taking one word and making multiple variants //

func CreateAppendMutation(charset string) Mutation {
	runes := []rune(charset)
	//Create a new slice of individual characters
	//Doing this now means that each worker doesn't need to do this themselves
	characters := make([]string, len(runes))
	//Transferring all the characters to the new slice
	for i, r := range runes {
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
	runes := []rune(charset)
	characters := make([]string, len(runes))
	for i, r := range runes {
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

//These take a language, then apply that specific variant of toUpper or toLower
//Default is assumed to be English

// This is a useful option for niche language cases, like the Turkish undotted lowercase i
func CreateUpperCaseMutation(language unicode.SpecialCase) Mutation {
	return func(word string, scratchpad []string) []string {
		//appends new word to scratchpad and returns it
		return append(scratchpad, strings.ToUpperSpecial(language, word))
	}
}
func CreateLowerCaseMutation(language unicode.SpecialCase) Mutation {
	return func(word string, scratchpad []string) []string {
		//appends new word to scratchpad and returns it
		return append(scratchpad, strings.ToLowerSpecial(language, word))
	}
}

// CreateTitleCaseMutation capitalizes the first letter and proper nouns, based on the rules of the specified language
func CreateTitleCaseMutation(lang language.Tag) Mutation {
	return func(word string, scratchpad []string) []string {
		caser := cases.Title(lang)
		return append(scratchpad, caser.String(word))
	}
}

// L33tTable is an ordered list of substitution presets.
// Level index maps to the frontend dropdown value "1", "2", "3".
var L33tLevels = []map[rune]string{
	// Level 1 — minimal
	{'e': "3", 'a': "4"},
	// Level 2 — common
	{'e': "3", 'a': "4", 'i': "1", 'o': "0", 's': "5", 't': "7"},
	// Level 3 — full
	{
		'e': "3", 'a': "4", 'i': "1", 'o': "0",
		's': "5", 't': "7", 'b': "8", 'g': "9",
		'l': "1", 'z': "2", 'q': "0", 'x': "%",
	},
}

// CreateLeetspeakMutation creates a preset level leet mutation (levels 1-3, 1-indexed).
func CreateLeetspeakMutation(level int) Mutation {
	if level < 1 || level > len(L33tLevels) {
		level = 1
	}
	return createLeetFromTable(L33tLevels[level-1])
}

// CreateCustomLeetspeakMutation creates a leet mutation from a caller-supplied
// map of rune → replacement string. Used for the advanced per-letter UI.
func CreateCustomLeetspeakMutation(table map[rune]string) Mutation {
	return createLeetFromTable(table)
}

func createLeetFromTable(table map[rune]string) Mutation {
	return func(word string, scratchpad []string) []string {
		var sb strings.Builder
		sb.Grow(len(word))
		for _, r := range word {
			if sub, ok := table[unicode.ToLower(r)]; ok {
				sb.WriteString(sub)
			} else {
				sb.WriteRune(r)
			}
		}
		return append(scratchpad, sb.String())
	}
}
