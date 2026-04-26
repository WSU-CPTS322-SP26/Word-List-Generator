package src_test

import (
	src "Mutalist/backend"
	"testing"
)

// ── resolveCharset via BuildPipeline ──────────────────────────────────────────

func TestBuildPipeline_AppendDigits(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{"charset": "digits"}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pipeline) != 1 || len(pipeline[0]) != 1 {
		t.Fatalf("expected 1 stage with 1 mutation")
	}
	result := pipeline[0][0]("pw", []string{})
	if len(result) != 10 {
		t.Errorf("expected 10 results for digits charset, got %d: %v", len(result), result)
	}
}

func TestBuildPipeline_PrependAlphaLower(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "prepend", Params: map[string]string{"charset": "alpha_lower"}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := pipeline[0][0]("x", []string{})
	if len(result) != 26 {
		t.Errorf("expected 26 results for alpha_lower, got %d", len(result))
	}
}

func TestBuildPipeline_CustomCharset(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{"charset": "!@#"}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := pipeline[0][0]("pw", []string{})
	assertSliceEqual(t, result, []string{"pw!", "pw@", "pw#"})
}

func TestBuildPipeline_MissingCharset(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "append", Params: map[string]string{}}},
	}
	_, err := src.BuildPipeline(spec)
	if err == nil {
		t.Error("expected error for missing charset param, got nil")
	}
}

func TestBuildPipeline_UnknownType(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "rotate13", Params: map[string]string{}}},
	}
	_, err := src.BuildPipeline(spec)
	if err == nil {
		t.Error("expected error for unknown mutation type, got nil")
	}
}

func TestBuildPipeline_MultiStage(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "uppercase", Params: map[string]string{"language": "english"}}},
		{{Type: "append",    Params: map[string]string{"charset": "0"}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pipeline) != 2 {
		t.Fatalf("expected 2 stages, got %d", len(pipeline))
	}
}

func TestBuildPipeline_OrAlternatives(t *testing.T) {
	spec := [][]src.MutSpec{{
		{Type: "uppercase", Params: map[string]string{"language": "english"}},
		{Type: "lowercase", Params: map[string]string{"language": "english"}},
	}}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pipeline[0]) != 2 {
		t.Fatalf("expected 2 alternatives, got %d", len(pipeline[0]))
	}
}

func TestBuildPipeline_EmptySpec(t *testing.T) {
	pipeline, err := src.BuildPipeline([][]src.MutSpec{})
	if err != nil {
		t.Fatalf("unexpected error for empty spec: %v", err)
	}
	if len(pipeline) != 0 {
		t.Errorf("expected empty pipeline, got length %d", len(pipeline))
	}
}

func TestBuildPipeline_Leetspeak_Levels(t *testing.T) {
	for _, level := range []string{"1", "2", "3"} {
		spec := [][]src.MutSpec{
			{{Type: "leetspeak", Params: map[string]string{"level": level}}},
		}
		_, err := src.BuildPipeline(spec)
		if err != nil {
			t.Errorf("level %s: unexpected error: %v", level, err)
		}
	}
}

func TestBuildPipeline_Leetspeak_Custom(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "leetspeak", Params: map[string]string{"level": "custom", "pairs": "a:4,e:3"}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := pipeline[0][0]("ae", []string{})
	assertSliceEqual(t, result, []string{"43"})
}

func TestBuildPipeline_Leetspeak_CustomMalformed(t *testing.T) {
	// Malformed pairs should be silently skipped, not error
	spec := [][]src.MutSpec{
		{{Type: "leetspeak", Params: map[string]string{"level": "custom", "pairs": "bad,a:4"}}},
	}
	pipeline, err := src.BuildPipeline(spec)
	if err != nil {
		t.Fatalf("unexpected error for malformed pairs: %v", err)
	}
	result := pipeline[0][0]("ba", []string{})
	// "b" has no sub, "a"→"4"
	assertSliceEqual(t, result, []string{"b4"})
}

func TestBuildPipeline_ErrorIncludesStageIndex(t *testing.T) {
	spec := [][]src.MutSpec{
		{{Type: "uppercase", Params: map[string]string{"language": "english"}}},
		{{Type: "append",    Params: map[string]string{}}}, // missing charset
	}
	_, err := src.BuildPipeline(spec)
	if err == nil {
		t.Fatal("expected error")
	}
	if !containsStr(err.Error(), "stage 1") {
		t.Errorf("error should mention 'stage 1', got: %v", err)
	}
}

func containsStr(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsStr(s[1:], sub) || s[:len(sub)] == sub)
}
