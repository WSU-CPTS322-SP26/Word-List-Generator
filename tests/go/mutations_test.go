package src_test

import (
	src "Mutalist/backend"
	"strings"
	"testing"
	"unicode"
)

// ── Append ───────────────────────────────────────────────────────────────────

func TestAppendMutation_SingleChar(t *testing.T) {
	mut := src.CreateAppendMutation("0")
	got := mut("hello", []string{})
	want := []string{"hello0"}
	assertSliceEqual(t, got, want)
}

func TestAppendMutation_MultiChar(t *testing.T) {
	mut := src.CreateAppendMutation("01")
	got := mut("hi", []string{})
	assertSliceEqual(t, got, []string{"hi0", "hi1"})
}

func TestAppendMutation_EmptyCharset(t *testing.T) {
	mut := src.CreateAppendMutation("")
	got := mut("hello", []string{})
	if len(got) != 0 {
		t.Errorf("expected empty output for empty charset, got %v", got)
	}
}

func TestAppendMutation_EmptyWord(t *testing.T) {
	mut := src.CreateAppendMutation("abc")
	got := mut("", []string{})
	assertSliceEqual(t, got, []string{"a", "b", "c"})
}

func TestAppendMutation_Unicode(t *testing.T) {
	mut := src.CreateAppendMutation("é")
	got := mut("caf", []string{})
	assertSliceEqual(t, got, []string{"café"})
}

// ── Prepend ──────────────────────────────────────────────────────────────────

func TestPrependMutation_SingleChar(t *testing.T) {
	mut := src.CreatePrependMutation("!")
	got := mut("hello", []string{})
	assertSliceEqual(t, got, []string{"!hello"})
}

func TestPrependMutation_MultiChar(t *testing.T) {
	mut := src.CreatePrependMutation("12")
	got := mut("go", []string{})
	assertSliceEqual(t, got, []string{"1go", "2go"})
}

func TestPrependMutation_EmptyCharset(t *testing.T) {
	mut := src.CreatePrependMutation("")
	got := mut("hello", []string{})
	if len(got) != 0 {
		t.Errorf("expected empty output for empty charset, got %v", got)
	}
}

// ── Uppercase / Lowercase ─────────────────────────────────────────────────────

func TestUpperCaseMutation_English(t *testing.T) {
	mut := src.CreateUpperCaseMutation(unicode.SpecialCase{})
	got := mut("hello world", []string{})
	assertSliceEqual(t, got, []string{"HELLO WORLD"})
}

func TestLowerCaseMutation_English(t *testing.T) {
	mut := src.CreateLowerCaseMutation(unicode.SpecialCase{})
	got := mut("HELLO WORLD", []string{})
	assertSliceEqual(t, got, []string{"hello world"})
}

func TestUpperCaseMutation_Turkish(t *testing.T) {
	// In Turkish, lowercase 'i' uppercases to 'İ' (dotted I), not 'I'
	mut := src.CreateUpperCaseMutation(unicode.TurkishCase)
	got := mut("istanbul", []string{})
	if len(got) == 0 {
		t.Fatal("expected output, got none")
	}
	if !strings.Contains(got[0], "İ") {
		t.Errorf("Turkish uppercase of 'istanbul' should contain İ, got %q", got[0])
	}
}

func TestLowerCaseMutation_Turkish(t *testing.T) {
	// In Turkish, 'I' lowercases to 'ı' (dotless i), not 'i'
	mut := src.CreateLowerCaseMutation(unicode.TurkishCase)
	got := mut("ISTANBUL", []string{})
	if len(got) == 0 {
		t.Fatal("expected output, got none")
	}
	if !strings.Contains(got[0], "ı") {
		t.Errorf("Turkish lowercase of 'ISTANBUL' should contain ı, got %q", got[0])
	}
}

// ── Leetspeak preset ─────────────────────────────────────────────────────────

func TestLeetspeakLevel1(t *testing.T) {
	mut := src.CreateLeetspeakMutation(1)
	got := mut("apple", []string{})
	// a→4, e→3
	assertSliceEqual(t, got, []string{"4ppl3"})
}

func TestLeetspeakLevel2(t *testing.T) {
	mut := src.CreateLeetspeakMutation(2)
	got := mut("site", []string{})
	// s→5, i→1, t→7, e→3
	assertSliceEqual(t, got, []string{"5173"})
}

func TestLeetspeakLevel3(t *testing.T) {
	mut := src.CreateLeetspeakMutation(3)
	got := mut("google", []string{})
	// g→9, o→0, o→0, g→9, l→1, e→3
	assertSliceEqual(t, got, []string{"900913"})
}

func TestLeetspeakCaseInsensitive(t *testing.T) {
	mut := src.CreateLeetspeakMutation(1)
	lower := mut("apple", []string{})
	upper := mut("Apple", []string{})
	// Both should produce same result since matching is case-insensitive
	// A→4 same as a→4
	assertSliceEqual(t, lower, upper)
}

func TestLeetspeakInvalidLevel_DefaultsToOne(t *testing.T) {
	// Levels below 1 or above 3 should default to level 1
	mut0 := src.CreateLeetspeakMutation(0)
	mut4 := src.CreateLeetspeakMutation(4)
	mut1 := src.CreateLeetspeakMutation(1)
	word := "apple"
	r0 := mut0(word, []string{})
	r4 := mut4(word, []string{})
	r1 := mut1(word, []string{})
	assertSliceEqual(t, r0, r1)
	assertSliceEqual(t, r4, r1)
}

// ── Custom leetspeak ──────────────────────────────────────────────────────────

func TestCustomLeetspeakMutation(t *testing.T) {
	table := map[rune]string{'a': "@", 'o': "0"}
	mut := src.CreateCustomLeetspeakMutation(table)
	got := mut("ao", []string{})
	assertSliceEqual(t, got, []string{"@0"})
}

func TestCustomLeetspeakMutation_EmptyTable(t *testing.T) {
	mut := src.CreateCustomLeetspeakMutation(map[rune]string{})
	got := mut("hello", []string{})
	// No substitutions, word passes through unchanged
	assertSliceEqual(t, got, []string{"hello"})
}

// ── Title case ───────────────────────────────────────────────────────────────

func TestTitleCaseMutation(t *testing.T) {
	// Import language in the actual test file
	// We test via BuildPipeline to avoid importing golang.org/x/text here
	spec := [][]src.MutSpec{
		{{Type: "title_case", Params: map[string]string{}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("BuildPipeline error: %v", err)
	}
	scratchpads := [][]string{make([]string, 0, 16)}
	result := pipeline[0][0]("hello world", scratchpads[0][:0])
	if len(result) == 0 {
		t.Fatal("expected output")
	}
	if result[0] != "Hello World" {
		t.Errorf("expected 'Hello World', got %q", result[0])
	}
}

// ── Scratchpad reuse ─────────────────────────────────────────────────────────

func TestAppendMutation_ScratchpadReuse(t *testing.T) {
	// Verifies the mutation correctly resets and reuses a pre-allocated scratchpad
	mut := src.CreateAppendMutation("ab")
	scratch := make([]string, 0, 8)

	first := mut("x", scratch[:0])
	if len(first) != 2 {
		t.Fatalf("expected 2 results, got %d", len(first))
	}

	second := mut("y", scratch[:0])
	if len(second) != 2 {
		t.Fatalf("expected 2 results on reuse, got %d", len(second))
	}
	if second[0] != "ya" || second[1] != "yb" {
		t.Errorf("scratchpad reuse corrupted results: %v", second)
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func assertSliceEqual(t *testing.T, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("length mismatch: got %d %v, want %d %v", len(got), got, len(want), want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("index %d: got %q, want %q", i, got[i], want[i])
		}
	}
}
