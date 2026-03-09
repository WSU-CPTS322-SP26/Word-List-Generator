package main

import (
	"Word-List-Generator/src"
	"context"
	//"fmt"
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

func (a *App) StartGenerator() string {
	// We run this in a goroutine so the UI doesn't freeze while waiting for the channels
	go src.RunGenerator()

	return "Wordlist generation started!"
}
