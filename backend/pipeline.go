package src

import (
	"fmt"
	"strings"
	"unicode"

	"golang.org/x/text/language"
)

// MutSpec represents a single mutation as deserialized from the JSON config
// Type is the name of the mutation, Params holds any additional configuration
type MutSpec struct {
	Type   string            `json:"type"`
	Params map[string]string `json:"params"`
}

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

	// every char from every preset above combined into one complete set
	charsetAll = charsetDigits + charsetAlphaAll + charsetSpecialAll
)

// Takes the charset value from the JSON config and returns the actual character string to pass into
// a mutation factory. Named presets like "digits" resolve to their constant string.
// If no preset matches, the value is treated as a raw custom string, allowing one-off charsets
// without needing a preset defined here.
// Empty string means the config is missing a required parameter and returns an error.
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
		// An empty charset means the config is missing a required param, return an error
		return "", fmt.Errorf("charset param is missing or empty")
	default:
		// No preset matched, treat the value as a literal custom charset string passed directly from the config
		return value, nil
	}
}

// Maps a language name string to a Go unicode special case rule set.
// Used by the uppercase and lowercase mutations when standard casing rules
// are not correct for the target language.
// To add a new language, add a new case here and map it to the appropriate unicode.SpecialCase value.
// Turkish and Azeri share the same unicode casing rules so both names map to the same value.
// added in english to handle the content sent from the gui.
func resolveSpecialCase(lang string) (unicode.SpecialCase, error) {
	switch lang {
	case "turkish", "azeri":
		return unicode.TurkishCase, nil
	case "english", "default":
		return unicode.SpecialCase{}, nil
	case "":
		return nil, fmt.Errorf("language param is missing or empty")
	default:
		return nil, fmt.Errorf("unsupported language %q (supported: english, turkish, azeri)", lang)
	}
}

// Takes one MutSpec from the parsed JSON config and returns a fully built Mutation ready to be
// placed in the pipeline. This is the only place in the codebase that maps the JSON type name
// string to factory functions in mutations.go.
// When a new mutation type is added to mutations.go, register it here with a new case.
// Type name strings here must match exactly what the GUI serializes into the JSON config.
func buildMutation(ms MutSpec) (Mutation, error) {
	switch ms.Type {

	case "append":
		// Resolves the charset param to its actual string, then passes it to the append factory.
		// The factory bakes the charset into the closure so workers never need to see it.
		charset, err := resolveCharset(ms.Params["charset"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreateAppendMutation(charset), nil

	case "prepend":
		// Same as append but characters are added to the front of the word instead of the end.
		charset, err := resolveCharset(ms.Params["charset"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreatePrependMutation(charset), nil

	case "uppercase":
		// Resolves the language param to a unicode rule set, then passes it to the factory.
		lang, err := resolveSpecialCase(ms.Params["language"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreateUpperCaseMutation(lang), nil

	case "lowercase":
		// Resolves the language param to a unicode rule set, then passes it to the factory.
		lang, err := resolveSpecialCase(ms.Params["language"])
		if err != nil {
			return nil, fmt.Errorf("mutation %q: %w", ms.Type, err)
		}
		return CreateLowerCaseMutation(lang), nil
	case "leetspeak":
		levelStr := ms.Params["level"]
		if levelStr == "custom" {
			// Parse "a:4,e:3,s:5" from the single "pairs" param
			table := make(map[rune]string)
			for _, pair := range strings.Split(ms.Params["pairs"], ",") {
				pair = strings.TrimSpace(pair)
				parts := strings.SplitN(pair, ":", 2)
				if len(parts) == 2 {
					runes := []rune(strings.TrimSpace(parts[0]))
					if len(runes) == 1 {
						table[unicode.ToLower(runes[0])] = strings.TrimSpace(parts[1])
					}
				}
			}
			return CreateCustomLeetspeakMutation(table), nil
		}
		level := 1
		switch levelStr {
		case "2":
			level = 2
		case "3":
			level = 3
		}
		return CreateLeetspeakMutation(level), nil
	case "title_case":
		// Resolves the language tag and passes it to the title case factory.
		return CreateTitleCaseMutation(language.English), nil

	default:
		return nil, fmt.Errorf("unknown mutation type %q", ms.Type)
	}
}

// Converts the full pipeline spec from the parsed JSON config into a concrete slice of slices
// of Mutations that workers can execute without any further decision making.
// The outer slice is serial stages executed left to right.
// The inner slice is OR alternatives within each stage, each running independently on
// the incoming word and producing its own variant tree.
// Any config error such as an unknown type or missing charset is caught here at startup so that
// the engine fails immediately with a clear message rather than producing wrong output mid run.
func BuildPipeline(spec [][]MutSpec) ([][]Mutation, error) {
	// Allocates the outer slice with one slot per stage in the spec
	pipeline := make([][]Mutation, len(spec))

	for stageIdx, alternatives := range spec {
		// Allocates the inner slice with one slot per OR alternative in this stage
		stage := make([]Mutation, len(alternatives))

		for altIdx, ms := range alternatives {
			mut, err := buildMutation(ms)
			if err != nil {
				// Include the stage and alternative index in the error message so the
				// problem is easy to locate in the config file
				return nil, fmt.Errorf("stage %d, alternative %d: %w", stageIdx, altIdx, err)
			}
			stage[altIdx] = mut
		}

		pipeline[stageIdx] = stage
	}

	return pipeline, nil
}
