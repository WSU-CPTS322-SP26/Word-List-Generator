package src_test

import (
	src "Mutalist/backend"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

func runCollector(words []string, dir, filename string, overwrite bool) (string, error) {
	ch := make(chan string, len(words)+1)
	status := make(chan error, 1)
	var bytesOut atomic.Int64

	for _, w := range words {
		ch <- w
	}
	close(ch)

	src.StartCollector(ch, status, dir, filename, overwrite, &bytesOut)
	if err := <-status; err != nil {
		return "", err
	}

	// Collector appends .txt if no extension 
	readName := filename
	if filepath.Ext(filename) == "" {
		readName = filename + ".txt"
	}
	data, err := os.ReadFile(filepath.Join(dir, readName))
	return string(data), err
}

func TestCollector_Basic(t *testing.T) {
	dir := t.TempDir()
	content, err := runCollector([]string{"apple", "banana"}, dir, "out.txt", true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(content, "apple") || !strings.Contains(content, "banana") {
		t.Errorf("output missing expected words: %q", content)
	}
}

func TestCollector_EmptyFilenameError(t *testing.T) {
	dir := t.TempDir()
	ch := make(chan string)
	close(ch)
	status := make(chan error, 1)
	var b atomic.Int64
	src.StartCollector(ch, status, dir, "", true, &b)
	err := <-status
	if err == nil {
		t.Error("expected error for empty filename")
	}
}

func TestCollector_DefaultsToTxt(t *testing.T) {
	dir := t.TempDir()
	_, err := runCollector([]string{"word"}, dir, "noext", true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "noext.txt")); os.IsNotExist(err) {
		t.Error("expected noext.txt to be created")
	}
}

func TestCollector_OverwriteVsAppend(t *testing.T) {
	dir := t.TempDir()
	runCollector([]string{"first"}, dir, "out.txt", true)
	runCollector([]string{"second"}, dir, "out.txt", true) // overwrite

	content, _ := os.ReadFile(filepath.Join(dir, "out.txt"))
	if strings.Contains(string(content), "first") {
		t.Error("overwrite should have removed 'first'")
	}

	runCollector([]string{"third"}, dir, "out.txt", false) // append
	content2, _ := os.ReadFile(filepath.Join(dir, "out.txt"))
	if !strings.Contains(string(content2), "second") || !strings.Contains(string(content2), "third") {
		t.Errorf("append should contain both 'second' and 'third': %q", string(content2))
	}
}

func TestCollector_ByteCount(t *testing.T) {
	dir := t.TempDir()
	ch := make(chan string, 2)
	status := make(chan error, 1)
	var bytesOut atomic.Int64

	ch <- "hi"
	ch <- "yo"
	close(ch)
	src.StartCollector(ch, status, dir, "out.txt", true, &bytesOut)
	<-status

	// "hi\n" = 3, "yo\n" = 3 → 6 total
	if bytesOut.Load() != 6 {
		t.Errorf("expected 6 bytes, got %d", bytesOut.Load())
	}
}

func TestCollector_NoFileCreatedForEmptyInput(t *testing.T) {
	dir := t.TempDir()
	ch := make(chan string)
	close(ch)
	status := make(chan error, 1)
	var b atomic.Int64
	src.StartCollector(ch, status, dir, "empty.txt", true, &b)
	<-status

	if _, err := os.Stat(filepath.Join(dir, "empty.txt")); !os.IsNotExist(err) {
		t.Error("file should not be created for empty input")
	}
}
