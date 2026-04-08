package main

import (
	"Word-List-Generator/backend" // Assuming this contains your 'src' package
	"context"
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/runtime" // Make sure to add this import!
)

func (a *App) SelectFile() string {
	filepath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Wordlist",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Text Files (*.txt)",
				Pattern:     "*.txt",
			},
			{
				DisplayName: "All Files (*.*)",
				Pattern:     "*.*",
			},
		},
	})

	if err != nil {
		fmt.Printf("Error opening file dialog: %v\n", err)
		return ""
	}

	// This returns the absolute OS path (e.g., "C:\Users\Nathan\Documents\harrypotter.txt")
	return filepath
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// 1. Add wordlistPath to the function signature
func (a *App) StartPipeline(wordlistPath string, manifest [][]src.MutSpec) string {
	go func() {
		pipeline, err := src.BuildPipeline(manifest)
		if err != nil {
			fmt.Printf("Pipeline Build Error: %v\n", err)
			return
		}

		// 2. Define your output destination.
		// You can hardcode this for now, or later update your frontend to let the user pick a save location!
		outputDir := "wordlists/userGenerated"
		outputFileName := "mutated_results.txt"

		// 3. Pass the dynamic paths into the newly updated RunGenerator
		src.RunGenerator(pipeline, wordlistPath, outputDir, outputFileName)
	}()

	return "Pipeline Built and Started"
}
