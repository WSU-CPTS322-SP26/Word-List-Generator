package main

import (
	"Word-List-Generator/backend"
	"context"
	"fmt"
)

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

func (a *App) StartPipeline(spec [][]src.MutSpec) string {
	go func() {
		pipeline, err := src.BuildPipeline(spec)
		if err != nil {
			fmt.Printf("Pipeline Build Error: %v\n", err)
			return
		}
		src.RunGenerator(pipeline)
	}()
	
	return "Pipeline Built and Started"
}


