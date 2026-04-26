package main

import (
	src "Mutalist/backend"
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx            context.Context
	lastCanvasPath string
}

func NewApp() *App { return &App{} }

func (a *App) startup(ctx context.Context) { a.ctx = ctx }

func execDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	resolved, err := filepath.EvalSymlinks(exe)
	if err != nil {
		return filepath.Dir(exe)
	}
	return filepath.Dir(resolved)
}

func resolveBaseDir() string {
	exe := execDir()
	if _, err := os.Stat(filepath.Join(exe, "wordlists")); err == nil {
		return exe
	}
	if wd, err := os.Getwd(); err == nil {
		return wd
	}
	return exe
}

// canvasSaveDir returns (and creates if needed) the ./canvas/ folder
// next to wherever the app is running from.
func canvasSaveDir() (string, error) {
	dir := filepath.Join(resolveBaseDir(), "canvas")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

func autoSavePath() (string, error) {
	dir, err := canvasSaveDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "autosave.json"), nil
}

// SelectFile opens a picker starting in wordlists/premade.
func (a *App) SelectFile() string {
	premadeDir := filepath.Join(resolveBaseDir(), "wordlists", "premade")
	os.MkdirAll(premadeDir, 0755)
	fp, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Select Wordlist",
		DefaultDirectory: premadeDir,
		Filters: []runtime.FileFilter{
			{DisplayName: "Text Files (*.txt)", Pattern: "*.txt"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return ""
	}
	return fp
}

func nonCollidingName(dir, base, ext string) string {
	if _, err := os.Stat(filepath.Join(dir, base+ext)); os.IsNotExist(err) {
		return base + ext
	}
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s(%d)%s", base, i, ext)
		if _, err := os.Stat(filepath.Join(dir, candidate)); os.IsNotExist(err) {
			return candidate
		}
	}
}

// SelectOutputFile opens a save picker defaulting to wordlists/userGenerated.
func (a *App) SelectOutputFile() string {
	outputDir, _ := filepath.Abs(filepath.Join(resolveBaseDir(), "wordlists", "userGenerated"))
	os.MkdirAll(outputDir, 0755)
	defaultName := nonCollidingName(outputDir, "mutated_results", ".txt") // add this
	fp, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            "Save Mutated Wordlist As",
		DefaultDirectory: outputDir,
		DefaultFilename:  defaultName, // use it here
		Filters: []runtime.FileFilter{
			{DisplayName: "Text Files (*.txt)", Pattern: "*.txt"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return ""
	}
	return fp
}

// SaveCanvas writes the auto-save file to ./canvas/autosave.json.
func (a *App) SaveCanvas(canvasJSON string) error {
	path, err := autoSavePath()
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte(canvasJSON), 0666)
}

// LoadCanvas is intentionally a no-op — the app always starts with a blank canvas.
// Canvas sessions are restored manually via File → Open Canvas.
// This binding is kept because removing it would require regenerating the frontend bindings.
func (a *App) LoadCanvas() string {
	return ""
}

func (a *App) SaveCanvasAs(canvasJSON string) string {
	dir, _ := canvasSaveDir()
	defaultName := nonCollidingName(dir, "canvas", ".json") // add this
	fp, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            "Export Canvas Config",
		DefaultDirectory: dir,
		DefaultFilename:  defaultName, // use it here
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil || fp == "" {
		return ""
	}
	if err := os.WriteFile(fp, []byte(canvasJSON), 0666); err != nil {
		return ""
	}
	return fp
}

// LoadCanvasFrom opens a native open dialog inside ./canvas/ and returns the file contents.
func (a *App) LoadCanvasFrom() string {
	dir, _ := canvasSaveDir()
	fp, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Import Canvas Config",
		DefaultDirectory: dir,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil || fp == "" {
		return ""
	}
	data, err := os.ReadFile(fp)
	if err != nil {
		return ""
	}
	a.lastCanvasPath = fp // store path for GetLastCanvasPath
	return string(data)
}

// StartPipeline builds and runs the mutation pipeline, emitting progress events.
func (a *App) StartPipeline(wordlistPath string, outputPath string, appendMode bool, manifest [][]src.MutSpec) string {
	go func() {
		pipeline, err := src.BuildPipeline(manifest)
		if err != nil {
			fmt.Printf("Pipeline Build Error: %v\n", err)
			runtime.EventsEmit(a.ctx, "pipeline:error", err.Error())
			return
		}
		runtime.EventsEmit(a.ctx, "pipeline:started", nil)
		outputDir := filepath.Dir(outputPath)
		outputFileName := filepath.Base(outputPath)
		src.RunGenerator(pipeline, wordlistPath, outputDir, outputFileName, !appendMode,
			func(update src.ProgressUpdate) {
				runtime.EventsEmit(a.ctx, "progress:update", update)
			},
		)
		runtime.EventsEmit(a.ctx, "pipeline:done", nil)
	}()
	return "Pipeline Started"
}

func (a *App) SaveCanvasToPath(path string, canvasJSON string) error {
	return os.WriteFile(path, []byte(canvasJSON), 0666)
}

// GetLastCanvasPath returns the path most recently loaded via LoadCanvasFrom.
func (a *App) GetLastCanvasPath() string {
	return a.lastCanvasPath
}

// FileExists reports whether the given path exists on disk.
func (a *App) FileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}
