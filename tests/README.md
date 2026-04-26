# Mutalist Test Suite

Standalone Go tests for the Mutalist backend. Lives outside the main project
so it doesn't inflate the distributed binary.

## Setup

The tests import the backend package directly, so the module path must match.

```bash
# From the project root
cd ..
mkdir mutalist-tests && cd mutalist-tests
go mod init mutalist-tests
go mod edit -replace Word-List-Generator=../Word-List-Generator
go get Word-List-Generator/backend
```

## Running

```bash
# All tests
go test ./go/... -v

# Specific file
go test ./go/ -run TestAppend -v

# With race detector (recommended before any release)
go test ./go/... -race -v

# Coverage report
go test ./go/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## What's tested

- Every mutation factory (append, prepend, upper, lower, title, leetspeak levels 1-3, custom leet)
- Pipeline builder: valid specs, all charset presets, custom charsets, error cases
- Collector: overwrite, append, byte counting, empty input, missing filename
- Loader: whitespace trimming, blank line skipping, empty files, unicode, missing paths
- Orchestrate: full end-to-end runs, overwrite vs append, empty input, progress callbacks,
  determinism across runs, panic safety on missing input
