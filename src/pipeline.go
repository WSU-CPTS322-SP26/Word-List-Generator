package main

// fmt is used for formatting error messages throughout the file.
// unicode is used by resolveSpecialCase to access language specific casing rule sets such as unicode.TurkishCase
//which are passed into the special case mutation factories.
import (
	"fmt"
	"unicode"
)

// Named character set presets. These are the string the JSON config references by name when
// it is specifying a charset for append or prepend mutations.
//Defined as constants so they are baked in at compile time.
// To add a new preset, we just add a constant here and a new case in resolveCharset below.

const (
	// all ten decimal chars
	charsetDigits = "0123456789"

	// all 26 lower case english letters
	charsetAlphaLower = "abcdefghijklmnopqrstuvwxyz"

	// all 26 uppercase english letters
	charsetAlphaUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

	// all 52 english letters built by combining upper and lower case, with lower case coming first
	charsetAlphaAll = charsetAlphaLower + charsetAlphaUpper

	// 16 hex chars using lowercase a-f
	charsetHexLower = "0123456789abcdef"

	// 16 hex chars using uppercase a-f
	charsetHexUpper = "0123456789ABCDEF"

	// all 32 printable non-alphanumeric ASCII special chars
	charsetSpecialAll = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"

	//every char from every preset above combined into one complete set
	charsetAll = charsetDigits + charsetAlphaAll + charsetSpecialAll
)

// Takes the charset value from the JSON file config and returns the actual character string to pass into
// a mutation factory. Named presets like digits resolve to thier constant string.
//If not presets match, the value is treated as a raw custom string allowing one-off charsets without needing
// a preset defined here.
// empty string case means the config is missing a required parameter returns an error.
// default case: no preset matched, treat the value as a literal custom charset string
//which is passed directly from the config.

func resolveCharset(value string) (string, error) {
	switch value {
	case "digits":
		return charsetDigits, nil
	case "alpha_lower":
		return charsetAlphaLower, nil
	case "alpha_upper":
		return charsetAlphaUpper, nil
	case "alpha_all":
		return charsetAlphaAll, nil
	case "hex_lower":
		return charsetHexLower, nil
	case "hex_upper":
		return charsetHexUpper, nil
	case "special_all":
		return charsetSpecialAll, nil
	case "all":
		return charsetAll, nil
	case "":
		//An empty charset means the config is missing a required param, return an error
		return "", fmt.Errorf("charset param is missing or empty")
	default:
		//No preset matched, treat the value as a literal custom charset string passed directly from the config
		return value, nil
	}
}

// Maps a language name string to a GO unicode special case rule set.
//Used by the special_uppercase and special_lowercase mutations when standard casing rules are not correct
// for the target language.
// To add a new language, add a new case here and map it to the appropriate unicode.SpecialCase value.
// turkish and Azeri share the same unicode casing rules so both names map to the same value.

func resolveSpecialCase(lang string) (unicode.SpecialCase, error) {
	switch lang {
	case "turkish", "azeri":
		//Turkish and Azeri share the same unicode casing rules so both names map to the same value.
		return unicode.TurkishCase, nil
	case "":
		return nil, fmt.Errorf("language param is missing or empty")
	default:
		return nil, fmt.Errorf("unsupported language %q (supported: turkish, azeri)", lang)
	}
}

// Takes one MutSpec form the parsed JASON config and returns a fully built Mutation ready to be placed in the pipeline.
// This is the only place in the codebase that maps the JASON typename string to
// factory functions in mutations.go
// When a new mutation type is added to mutations.go, register it here with a new case.
// Type name strings here must match exactly what the GUI serializes into the JASON config.

func buildMutation(ms MutSpec) (Mutation, error) {
	switch ms.Type {

	case "append":
		//Resolves the charset param to its actual string, then passes it to the append factory.
		// The factory bakes the charset into the closure so workers never need to see it.
		charset, err := resolveCharset(ms.Params["charset"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreateAppendMutation(charset), nil

	case "prepend":
		//Same as the append but characters are added to the front of the word instead of the end.
		charset, err := resolveCharset(ms.Params["charset"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreatePrependMutation(charset), nil

	case "uppercase":
		//No params needed here. Converts the entire word to uppercase.
		// should be placed before any append or prepend stages in the pipeline so case changes
		// do not affect added chars.
		return CreateUpperCaseMutation(), nil

	case "lowercase":
		//No params needed. converts the entire word to lower case.
		//should be placed before append or prepend just like the upper case, so changes dont affect added chars.
		return CreateLowerCaseMutation(), nil

	case "special_uppercase":
		//Resolves the language param to a unicode rule set, then passes it to the factory.
		// Used for languages where the standard unicode uppercasing produces incorrect results.

		lang, err := resolveSpecialCase(ms.Params["language"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreateSpecialUpperCaseMutation(lang), nil

	case "special_lowercase":
		//same as special_uppercase but lowercases instead.
		lang, err := resolveSpecialCase(ms.Params["language"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreateSpecialLowerCaseMutation(lang), nil

	default:
		return nil, fmt.Errorf("unknown mutation type %q", ms.Type)
	}
}

// Converts the full pipeline spec from the parsed JSON config into a concrete slices of slices
// of mutations that workers can execute without any further decision making.
//outer slices is serial stages executed left to right.
//Inner slices is OR alternatives within each stage, each running independently on
// the incoming word and producing its own variant tree.
// Any config error such as an unknown type or missing charset is caught here at startup so that
// the engine fails immediately with a clear message rather than producing wrong output mid run.

func BuildPipeline(spec [][]MutSpec) ([][]Mutation, error) {
	//Allocates the outer slices with one slot per stage in the spec
	pipeline := make([][]Mutation, len(spec))

	for stageIdx, alternatives := range spec {
		//Allocates the inner slices with one slot per OR alternative in this stage.
		stage := make([]Mutation, len(alternatives))

		for altIdx, ms := range alternatives {
			mut, err := buildMutation(ms)
			if err != nil {
				// Include the stage and alternative index in the error message so the problem is easy to locate in the config file.
				return nil, fmt.Errorf("stage %d, alternative %d: %w", stageIdx, altIdx, err)
			}
			stage[altIdx] = mut
		}

		pipeline[stageIdx] = stage
	}

	return pipeline, nil
}
