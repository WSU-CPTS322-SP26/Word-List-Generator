package src_test

import (
	src "Mutalist/backend"
	"os"
	"path/filepath"
	"testing"
)

func runLoader(path string) ([]string, error) {
	ch := make(chan string, 64)
	status := make(chan error, 4)
	go src.StartLoader(ch, status, path)
	var words []string
	for w := range ch {
		words = append(words, w)
	}
	select {
	case err := <-status:
		return words, err
	default:
		return words, nil
	}
}

func TestLoader_Basic(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "words.txt")
	os.WriteFile(f, []byte("apple\nbanana\ncherry\n"), 0644)

	words, err := runLoader(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(words) != 3 {
		t.Errorf("expected 3 words, got %d: %v", len(words), words)
	}
}

func TestLoader_TrimsWhitespace(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "words.txt")
	os.WriteFile(f, []byte("  apple  \n\t banana \n"), 0644)

	words, err := runLoader(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if words[0] != "apple" || words[1] != "banana" {
		t.Errorf("whitespace not trimmed: %v", words)
	}
}

func TestLoader_SkipsBlankLines(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "words.txt")
	os.WriteFile(f, []byte("apple\n\n\nbanana\n"), 0644)

	words, err := runLoader(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(words) != 2 {
		t.Errorf("expected 2 words (blank lines skipped), got %d", len(words))
	}
}

func TestLoader_EmptyFile(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "empty.txt")
	os.WriteFile(f, []byte(""), 0644)

	words, err := runLoader(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(words) != 0 {
		t.Errorf("expected 0 words for empty file, got %d", len(words))
	}
}

func TestLoader_NonExistentFile(t *testing.T) {
	_, err := runLoader("/nonexistent/path/file.txt")
	if err == nil {
		t.Error("expected error for non-existent file")
	}
}

func TestLoader_EmptyPath(t *testing.T) {
	_, err := runLoader("")
	if err == nil {
		t.Error("expected error for empty path")
	}
}

func TestLoader_Unicode(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "unicode.txt")
	os.WriteFile(f, []byte("café\nnaïve\nÅngström\n"), 0644)

	words, err := runLoader(f)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(words) != 3 {
		t.Errorf("expected 3 words, got %d", len(words))
	}
	if words[0] != "café" {
		t.Errorf("unicode word mangled: %q", words[0])
	}
}
