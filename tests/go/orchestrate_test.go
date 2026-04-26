package src_test

import (
	src "Mutalist/backend"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

func TestRunGenerator_BasicAppend(t *testing.T) {
	dir := t.TempDir()
	inputFile := filepath.Join(dir, "input.txt")
	outputFile := "output.txt"

	words := []string{"apple", "banana", "cherry"}
	if err := os.WriteFile(inputFile, []byte(strings.Join(words, "\n")), 0644); err != nil {
		t.Fatalf("failed to create input: %v", err)
	}

	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{"charset": "1"}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("BuildPipeline: %v", err)
	}

	var lastUpdate src.ProgressUpdate
	src.RunGenerator(pipeline, inputFile, dir, outputFile, true, func(u src.ProgressUpdate) {
		lastUpdate = u
	})

	outputPath := filepath.Join(dir, outputFile)
	data, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("failed to read output: %v", err)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	if len(lines) != 3 {
		t.Errorf("expected 3 output lines, got %d: %v", len(lines), lines)
	}
	for _, line := range lines {
		if !strings.HasSuffix(line, "1") {
			t.Errorf("expected line to end with '1', got %q", line)
		}
	}
	if lastUpdate.WordsProcessed == 0 {
		t.Error("expected progress callback to be called with non-zero word count")
	}
}

func TestRunGenerator_OverwriteVsAppend(t *testing.T) {
	dir := t.TempDir()
	inputFile := filepath.Join(dir, "input.txt")
	os.WriteFile(inputFile, []byte("word\n"), 0644)

	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{"charset": "0"}}},
	}
	pipeline, _ := src.BuildPipeline(spec)

	src.RunGenerator(pipeline, inputFile, dir, "out.txt", true, nil)
	src.RunGenerator(pipeline, inputFile, dir, "out.txt", true, nil)

	data, _ := os.ReadFile(filepath.Join(dir, "out.txt"))
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	if len(lines) != 1 {
		t.Errorf("overwrite: expected 1 line, got %d", len(lines))
	}

	src.RunGenerator(pipeline, inputFile, dir, "appended.txt", true, nil)
	src.RunGenerator(pipeline, inputFile, dir, "appended.txt", false, nil)

	data2, _ := os.ReadFile(filepath.Join(dir, "appended.txt"))
	lines2 := strings.Split(strings.TrimSpace(string(data2)), "\n")
	if len(lines2) != 2 {
		t.Errorf("append: expected 2 lines, got %d", len(lines2))
	}
}

func TestRunGenerator_EmptyInput(t *testing.T) {
	dir := t.TempDir()
	inputFile := filepath.Join(dir, "empty.txt")
	os.WriteFile(inputFile, []byte(""), 0644)

	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{"charset": "0"}}},
	}
	pipeline, _ := src.BuildPipeline(spec)
	src.RunGenerator(pipeline, inputFile, dir, "out.txt", true, nil)

	if _, err := os.Stat(filepath.Join(dir, "out.txt")); !os.IsNotExist(err) {
		t.Error("expected no output file for empty input")
	}
}

func TestRunGenerator_ProgressCallbackFires(t *testing.T) {
	dir := t.TempDir()
	inputFile := filepath.Join(dir, "input.txt")
	lines := make([]string, 100)
	for i := range lines {
		lines[i] = "word"
	}
	os.WriteFile(inputFile, []byte(strings.Join(lines, "\n")), 0644)

	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{"charset": "01"}}},
	}
	pipeline, _ := src.BuildPipeline(spec)

	callCount := 0
	src.RunGenerator(pipeline, inputFile, dir, "out.txt", true, func(u src.ProgressUpdate) {
		callCount++
	})

	if callCount == 0 {
		t.Error("progress callback was never called")
	}
}

func TestRunGenerator_Deterministic(t *testing.T) {
	dir := t.TempDir()
	inputFile := filepath.Join(dir, "input.txt")
	os.WriteFile(inputFile, []byte("alpha\nbeta\ngamma\n"), 0644)

	spec := [][]src.MutSpec{
		{{Type: "uppercase", Params: map[string]string{"language": "english"}}},
		{{Type: "append", Params: map[string]string{"charset": "123"}}},
	}

	run := func(outName string) []string {
		pipeline, _ := src.BuildPipeline(spec)
		src.RunGenerator(pipeline, inputFile, dir, outName, true, nil)
		data, _ := os.ReadFile(filepath.Join(dir, outName))
		lines := strings.Split(strings.TrimSpace(string(data)), "\n")
		sort.Strings(lines)
		return lines
	}

	r1 := run("out1.txt")
	r2 := run("out2.txt")

	if strings.Join(r1, "\n") != strings.Join(r2, "\n") {
		t.Errorf("non-deterministic output:\nrun1: %v\nrun2: %v", r1, r2)
	}
}

func TestRunGenerator_NonExistentInput(t *testing.T) {
	dir := t.TempDir()
	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{"charset": "0"}}},
	}
	pipeline, _ := src.BuildPipeline(spec)

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("RunGenerator panicked on missing input: %v", r)
		}
	}()
	src.RunGenerator(pipeline, "/nonexistent/path/file.txt", dir, "out.txt", true, nil)
}
