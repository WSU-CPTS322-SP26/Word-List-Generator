# Mutalist
## Adaptable Wordlist Generator

Easy-to-use, high-performance, cross-platform application for generating permutations
of wordlists for use in password auditing and hash cracking.

---

## Overview

Mutalist takes a wordlist — one word per line — and applies a visual pipeline of
mutation blocks to produce every possible variant of every word. Mutations can add
character sets to the front or back of words, change case, apply leetspeak
substitutions, or stack multiple operations in sequence. The result is written to
a new wordlist file of your choosing.

The pipeline is built visually by dragging blocks onto a canvas and connecting them.
No scripting or configuration files required.

---

## Features

- **Append / Prepend** — attach any character set to the start or end of words,
  with presets for digits, letters, hex, special characters, or a custom set
- **Capitalize** — UPPERCASE, lowercase, or Title Case variants, with correct
  handling of Turkish/Azeri casing rules
- **L33tspeak** — three preset substitution levels plus a fully custom mode using
  `a:4,e:3,s:5` syntax
- **OR branching** — stack multiple blocks vertically at any stage to produce
  parallel variant trees from a single word
- **Sequential stages** — chain blocks horizontally for multi-step mutations applied
  in order
- **Append to existing file** — run a new pipeline and add results to an existing
  wordlist instead of overwriting it
- **Canvas save / load** — save your pipeline layout as a `.json` file and reload it
  in a future session; auto-saves to `canvas/autosave.json` on every change
- **Progress tracking** — live word count, elapsed time, and output file size shown
  during a run
- **Premade wordlists** — bundled sets for common English words, names, passwords,
  sports teams, and keyboard patterns

---

## Prerequisites

- [Go](https://go.dev/dl/) 1.21 or later
- [Node.js](https://nodejs.org/) 18 or later (for the frontend build)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) v2.11 or later

Install Wails:
```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Verify your environment:
```bash
wails doctor
```

---

## Installation

### From source

```bash
git clone https://github.com/WSU-CPTS322-SP26/Word-List-Generator
cd Mutalist
wails build
```

The binary is placed in `build/bin/`. On macOS you get a `.app` bundle, on Windows
an `.exe`, on Linux an ELF binary.

### Platform-specific notes

**Windows** — the build produces a standalone `.exe`. The `wordlists/` and `canvas/`
directories are created next to the binary on first run.

**macOS** — right-click the `.app` and choose Open on first launch if you see a
Gatekeeper warning (unsigned build). For distribution, sign with:
```bash
codesign --deep --force --sign "Developer ID Application: Shane Ganz Josiah Norton Nathan Teh" \
    build/bin/Mutalist.app
```

**Linux** — the binary expects `wordlists/` and `canvas/` to exist alongside it.
Run from the `build/bin/` directory or set up a launcher that `cd`s there first.

---

## Usage

### Quick start

1. Launch Mutalist.
2. Click **Load Wordlist** on the central wordlist block and select a `.txt` file
   (one word per line). Premade lists are in `wordlists/premade/`.
3. Drag one or more blocks from the left sidebar onto the canvas.
4. Connect blocks to the wordlist node using the handles on its edges:
   - **Right handle** → append chain (characters added to the end of words)
   - **Left handle** → prepend chain (characters added to the front)
   - **Top / Bottom handles** → OR alternatives (each block runs independently
     and produces its own variants)
5. Click **▶ Run** and choose where to save the output file.

### Block types

| Block | Connection | Effect |
|---|---|---|
| Append / Prepend | Horizontal (left/right) | Adds every character in the chosen set to each word |
| Capitalize | Vertical (top/bottom) | Produces an uppercase, lowercase, or title case variant |
| L33tspeak | Vertical (top/bottom) | Substitutes characters per a preset or custom mapping |

### Chaining stages

Connect Append/Prepend blocks horizontally in sequence to add multiple character
sets one after another. Each additional block in the chain is applied to every
variant produced by the previous block, so the output grows multiplicatively.

### OR branching

Connect multiple blocks vertically (top/bottom handles) at any point in the chain
to run them as alternatives at that stage. Each branch produces its own variant
tree from the same input word.

### Saving your pipeline

Use **File → Save Canvas** (Ctrl+S) to save your current layout. If the canvas has
been saved before, this overwrites it in place. Use **File → Save Canvas As**
(Ctrl+Shift+S) to save to a new file. Use **File → Open Canvas** (Ctrl+O) to
restore a previously saved layout.

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New blank canvas |
| Ctrl+S | Save canvas |
| Ctrl+Shift+S | Save canvas as |
| Ctrl+O | Open canvas |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+B | Toggle sidebar |
| F11 | Toggle fullscreen |
| Delete | Delete selected block |

---

## Wordlist format

Input and output files are plain text, one word per line, UTF-8 encoded. Blank
lines and leading/trailing whitespace are ignored on input. Output lines are not
deduplicated — if the same variant can be produced by multiple paths through the
pipeline it will appear multiple times.

---

## Premade wordlists

| File | Contents |
|---|---|
| `common_english_words_10k.txt` | ~10,000 most frequent English words |
| `common_names_10k.txt` | Common first names (male and female) |
| `common_passwords_10k.txt` | Top 10,000 most common passwords |
| `popular_sports_teams_300.txt` | ~300 globally recognised sports team names |
| `common_keyboard_walks_10k.txt` | Common keyboard walks and patterns |

---

## Adding new mutation types

1. Add a factory function to `backend/mutations.go` following the `Mutation` type
   signature: `func(word string, scratchpad []string) []string`
2. Register a new `case` in `buildMutation` in `backend/pipeline.go`, mapping a
   type name string to your factory
3. Add the corresponding node type to the frontend and register it in the
   `nodeTypes` map in `App.jsx`
4. Add it to the sidebar in `Sidebar.jsx`

---

## Building for distribution

```bash
# Windows (requires MinGW on non-Windows)
CC=x86_64-w64-mingw32-gcc wails build -platform windows/amd64

# macOS universal binary
wails build -platform darwin/universal

# Linux
wails build -platform linux/amd64
```

Smaller production binary:
```bash
wails build -trimpath
```

---

## Known issues

- **Output order is non-deterministic** — because the pipeline uses multiple CPU
  cores in parallel, the order of words in the output file varies between runs.
  The set of words produced is always the same; only their order differs.
- **No deduplication** — variants that can be reached by multiple pipeline paths
  appear multiple times in the output. Post-process with `sort -u` if unique lines
  are required.
- **Large charsets with long wordlists** — using the `all` charset (88 characters)
  on a wordlist with 100,000 words produces 8.8 million output lines per stage.
  Multiple chained stages multiply this further. Ensure you have sufficient disk
  space before running large pipelines.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Open a pull request

Please run the test suite before submitting:
```bash
go test ./tests/go/... -race -v
```

To run a specific test file:
```bash
go test ./tests/go/ -run TestAppend -v
```

To generate a coverage report:
```bash
go test ./tests/go/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

---

## License

See `LICENSE.txt`.