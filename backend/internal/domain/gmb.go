package domain

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
)

//go:embed gmb_data/gmb_sessions.json
var gmbSessionsJSON []byte

//go:embed gmb_data/floor_loco_sessions.json
var floorLocoSessionsJSON []byte

// GMBLevel distinguishes standard from accelerated programme tracks.
type GMBLevel string

const (
	GMBLevelStandard     GMBLevel = "standard"
	GMBLevelAccelerated  GMBLevel = "accelerated"
)

// gmbRawExercise is the raw shape of each exercise inside a session from JSON.
type gmbRawExercise struct {
	Phase       string  `json:"phase"`
	Order       int     `json:"order"`
	Type        string  `json:"type"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Duration15  float64 `json:"duration15"`
	Duration30  float64 `json:"duration30"`
	Duration45  float64 `json:"duration45"`
}

// gmbRawSession is the raw shape of a session from JSON.
type gmbRawSession struct {
	SessionName string           `json:"sessionName"`
	Exercises   []gmbRawExercise `json:"exercises"`
}

// GMBCatalogEntry holds the enriched data for a single exercise.
type GMBCatalogEntry struct {
	Name        string
	Description string
	Phases      []string
	Duration15  int
	Duration30  int
	Duration45  int
	InAccel     bool
	InStandard  bool
	Category    string
	Difficulty  int
}

// GMBExercise is a single exercise in a generated session.
type GMBExercise struct {
	Order        int    `json:"order"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Category     string `json:"category"`
	Difficulty   int    `json:"difficulty"`
	DurationStr  string `json:"durationStr"`
	DurationSecs int    `json:"durationSecs"`
}

// GMBSessionResult is the complete output of GenerateGMBSession.
type GMBSessionResult struct {
	Level          string                     `json:"level"`
	Theme          string                     `json:"theme"`
	TargetDuration string                     `json:"targetDuration"`
	TotalTimeEst   string                     `json:"totalTimeEst"`
	TotalSecs      int                        `json:"totalSecs"`
	ExerciseCount  int                        `json:"exerciseCount"`
	Phases         map[string][]GMBExercise   `json:"phases"`
}

// ── Constants (ported from Python) ──────────────────────────────────────────

var timeBudget45 = map[string]int{
	"PREPARE":  420,
	"PRACTICE": 1140,
	"PLAY":     360,
	"PUSH":     720,
	"PONDER":   360,
}

var phaseCounts = map[string][2]int{
	"PREPARE":  {4, 6},
	"PRACTICE": {1, 3},
	"PLAY":     {1, 1},
	"PUSH":     {1, 4},
	"PONDER":   {4, 6},
}

var phaseDurationRange = map[string][2]int{
	"PREPARE":  {30, 120},
	"PRACTICE": {180, 720},
	"PLAY":     {120, 450},
	"PUSH":     {120, 600},
	"PONDER":   {30, 120},
}

// MovementThemes maps theme names to their constituent movement categories.
var MovementThemes = map[string][]string{
	"Bear & Monkey":          {"Bear", "Monkey"},
	"Frogger & Squat":        {"Frogger", "Squat"},
	"Crab & Floating Table":  {"Crab", "Floating Table Top"},
	"A-Frame & Bear":         {"A-Frame", "Bear"},
	"Spiderman & Monkey":     {"Spiderman", "Monkey"},
	"Monkey & Frogger":       {"Monkey", "Frogger"},
	"Bear & Crab":            {"Bear", "Crab"},
	"Full Locomotion Mix":    {"Bear", "Monkey", "Frogger"},
	"Floor Loco Mix":         {"Roll", "Underswitch", "Sumo"},
	"Rolls & Flow":           {"Roll", "Twisted Sister"},
}

// MovementThemeOrder preserves insertion order (Go maps are unordered).
var MovementThemeOrder = []string{
	"Bear & Monkey",
	"Frogger & Squat",
	"Crab & Floating Table",
	"A-Frame & Bear",
	"Spiderman & Monkey",
	"Monkey & Frogger",
	"Bear & Crab",
	"Full Locomotion Mix",
	"Floor Loco Mix",
	"Rolls & Flow",
}

var corePrepare = []string{
	"Wrists - Palms Down, Fingers Facing Knees",
	"Quadruped Spinal Circles",
	"Walk Into Squat",
	"Wrist Circles",
	"Quadruped Shoulder Circles",
	"Quadruped Twist",
	"Supine Hip Circles",
	"Standing Straight Leg Hip Circles",
	"Quadruped Wag Tail",
	"Frog Stretch",
}

var corePonder = []string{
	"General Kneeling Lunge",
	"Kneeling Back Flexion to Prone Lying Back Extension",
	"Seated Clasped Hands Extension",
	"3-Point Bridge",
}

var pushStandard = []string{
	"Crab Free Flow",
	"Frogger Free Flow",
	"Bear Free Flow",
	"Basic Bear to Monkey Combination",
	"Floating Table Top Pull To Squat",
	"A-Frame to Squat",
}

var pushAccelerated = []string{
	"Around The World",
	"Twisting Bear to Monkey Combination",
	"Crab to Bear to Frogger Combination",
	"Twisting Bear, High Monkey, Crab, Swing Set Free Flow",
	"Super Free Flow Example 1",
	"Super Free Flow Example 2",
	"Squat Leg Sweep ",
	"Bear to Crab Transition",
	"Cross Step Bear",
}

// DefaultCatalogue and DefaultPhasePool are eagerly loaded from embedded JSON.
var (
	DefaultCatalogue  map[string]GMBCatalogEntry
	DefaultPhasePool  map[string][]string
)

func init() {
	cat, pool, err := LoadGMBCatalogue(gmbSessionsJSON)
	if err != nil {
		panic(fmt.Sprintf("gmb: failed to load embedded catalogue: %v", err))
	}
	flCat, flPool, err2 := LoadGMBCatalogue(floorLocoSessionsJSON)
	if err2 != nil {
		panic(fmt.Sprintf("gmb: failed to load floor loco catalogue: %v", err2))
	}
	mergeIntoCatalogue(cat, flCat)
	mergeIntoPool(pool, flPool)
	DefaultCatalogue = cat
	DefaultPhasePool = pool
}

// ── Catalogue loader ─────────────────────────────────────────────────────────

func inferCategory(name string) string {
	n := strings.ToLower(name)
	pairs := [][2]string{
		{"bear", "Bear"},
		{"monkey", "Monkey"},
		{"frogger", "Frogger"},
		{"crab", "Crab"},
		{"a-frame", "A-Frame"},
		{"squat", "Squat"},
		{"spiderman", "Spiderman"},
		{"floating table", "Floating Table Top"},
		{"wrist", "Wrist"},
		{"hip circle", "Hip"},
		{"supine hip", "Hip"},
		{"standing straight leg hip", "Hip"},
		{"quadruped", "Spine"},
		{"kneeling lunge", "Stretch"},
		{"kneeling back", "Stretch"},
		{"seated clasped", "Stretch"},
		{"3-point bridge", "Stretch"},
		{"frog stretch", "Stretch"},
		{"bridge", "Stretch"},
		{"roll", "Roll"},
		{"underswitch", "Underswitch"},
		{"merry go round", "Roll"},
		{"corkscrew", "Roll"},
		{"sumo", "Sumo"},
		{"combo", "Combination"},
		{"free flow", "Flow"},
		{"combination", "Combination"},
		{"transition", "Combination"},
	}
	for _, p := range pairs {
		if strings.Contains(n, p[0]) {
			return p[1]
		}
	}
	return "Other"
}

func inferDifficulty(name string, accelOnly bool) int {
	n := strings.ToLower(name)
	advanced := []string{
		"bent arm", "twisting", "thread", "stall", "spiderman",
		"180", "360", "high monkey", "deep", "sumo", "cross step",
		"around the world", "super free",
	}
	for _, k := range advanced {
		if strings.Contains(n, k) {
			if accelOnly {
				return 4
			}
			return 3
		}
	}
	intermediate := []string{
		"combination", "transition", "free flow", "long leg",
		"single arm", "alternating", "swing set",
	}
	for _, k := range intermediate {
		if strings.Contains(n, k) {
			return 3
		}
	}
	beginner := []string{"basic", "prep", "example", "assessment", "set-up", "walk through"}
	for _, k := range beginner {
		if strings.Contains(n, k) {
			return 1
		}
	}
	return 2
}

func mergeIntoCatalogue(base, extra map[string]GMBCatalogEntry) {
	for name, e := range extra {
		if existing, ok := base[name]; ok {
			phaseSet := map[string]struct{}{}
			for _, p := range existing.Phases {
				phaseSet[p] = struct{}{}
			}
			for _, p := range e.Phases {
				phaseSet[p] = struct{}{}
			}
			phases := make([]string, 0, len(phaseSet))
			for p := range phaseSet {
				phases = append(phases, p)
			}
			existing.Phases = phases
			existing.InAccel = existing.InAccel || e.InAccel
			existing.InStandard = existing.InStandard || e.InStandard
			base[name] = existing
		} else {
			base[name] = e
		}
	}
}

func mergeIntoPool(base, extra map[string][]string) {
	for phase, names := range extra {
		existingSet := map[string]struct{}{}
		for _, n := range base[phase] {
			existingSet[n] = struct{}{}
		}
		for _, n := range names {
			if _, ok := existingSet[n]; !ok {
				base[phase] = append(base[phase], n)
			}
		}
	}
}

// LoadGMBCatalogue parses raw JSON bytes and returns the exercise catalogue and phase pools.
func LoadGMBCatalogue(data []byte) (map[string]GMBCatalogEntry, map[string][]string, error) {
	var sessions []gmbRawSession
	if err := json.Unmarshal(data, &sessions); err != nil {
		return nil, nil, err
	}

	type buildEntry struct {
		GMBCatalogEntry
		phases  map[string]struct{}
		count   int
	}

	build := map[string]*buildEntry{}

	for _, s := range sessions {
		isAccel := strings.Contains(s.SessionName, "Accelerated")
		for _, ex := range s.Exercises {
			if ex.Type == "circuit" || ex.Name == "" {
				continue
			}
			// Skip walkthrough videos (1-second durations across all options)
			if ex.Duration45 == 1 && ex.Duration15 == 1 {
				continue
			}

			if _, ok := build[ex.Name]; !ok {
				build[ex.Name] = &buildEntry{
					GMBCatalogEntry: GMBCatalogEntry{
						Name:        ex.Name,
						Description: ex.Description,
						Duration15:  int(ex.Duration15),
						Duration30:  int(ex.Duration30),
						Duration45:  int(ex.Duration45),
						Category:    inferCategory(ex.Name),
					},
					phases: map[string]struct{}{},
				}
			}

			e := build[ex.Name]
			e.phases[ex.Phase] = struct{}{}
			e.count++
			if isAccel {
				e.InAccel = true
			} else {
				e.InStandard = true
			}
			// Fill missing durations
			if e.Duration15 == 0 && ex.Duration15 != 0 {
				e.Duration15 = int(ex.Duration15)
			}
			if e.Duration30 == 0 && ex.Duration30 != 0 {
				e.Duration30 = int(ex.Duration30)
			}
			if e.Duration45 == 0 && ex.Duration45 != 0 {
				e.Duration45 = int(ex.Duration45)
			}
		}
	}

	catalogue := make(map[string]GMBCatalogEntry, len(build))
	phasePool := make(map[string][]string)

	for name, e := range build {
		accelOnly := e.InAccel && !e.InStandard
		e.Difficulty = inferDifficulty(name, accelOnly)

		phases := make([]string, 0, len(e.phases))
		for ph := range e.phases {
			phases = append(phases, ph)
		}
		e.Phases = phases
		catalogue[name] = e.GMBCatalogEntry
	}

	// Build per-phase pools
	for name, e := range catalogue {
		for _, ph := range e.Phases {
			phasePool[ph] = append(phasePool[ph], name)
		}
	}

	return catalogue, phasePool, nil
}

// ── Generator ────────────────────────────────────────────────────────────────

func fmtDuration(secs int) string {
	if secs == 0 {
		return "—"
	}
	if secs < 60 {
		return fmt.Sprintf("%d sec", secs)
	}
	m := secs / 60
	s := secs % 60
	if s == 0 {
		return fmt.Sprintf("%d min", m)
	}
	return fmt.Sprintf("%d:%02d min", m, s)
}

// GenerateGMBSession generates a single GMB Elements session.
// level: "standard" | "accelerated"
// focus: optional theme name from MovementThemes (empty → random)
// seed: random seed (0 → truly random)
// duration: 15, 30, or 45
func GenerateGMBSession(
	level, focus string,
	seed int64,
	duration int,
	catalogue map[string]GMBCatalogEntry,
	phasePool map[string][]string,
) GMBSessionResult {
	var rng *rand.Rand
	if seed == 0 {
		rng = rand.New(rand.NewSource(rand.Int63())) //nolint:gosec
	} else {
		rng = rand.New(rand.NewSource(seed)) //nolint:gosec
	}

	isAccel := level == "accelerated"
	maxDifficulty := 2
	if isAccel {
		maxDifficulty = 4
	}

	eligible := func(name, phaseFilter string) bool {
		e, ok := catalogue[name]
		if !ok {
			return false
		}
		if phaseFilter != "" {
			found := false
			for _, ph := range e.Phases {
				if ph == phaseFilter {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
		if !isAccel && e.Difficulty > maxDifficulty {
			return false
		}
		return true
	}

	assignDurations := func(names []string, phase string, budgetSecs int) []struct {
		name string
		secs int
	} {
		if len(names) == 0 {
			return nil
		}
		lo, hi := phaseDurationRange[phase][0], phaseDurationRange[phase][1]
		per := budgetSecs / len(names)
		if per < lo {
			per = lo
		}
		if per > hi {
			per = hi
		}
		// Round to nearest 30 seconds
		per = ((per + 15) / 30) * 30
		if per < lo {
			per = lo
		}
		if per > hi {
			per = hi
		}
		result := make([]struct {
			name string
			secs int
		}, len(names))
		for i, n := range names {
			result[i] = struct {
				name string
				secs int
			}{n, per}
		}
		return result
	}

	// ── Resolve theme / focus ──────────────────────────────────────────
	var themeName string
	var themeCats []string

	if focus == "" {
		idx := rng.Intn(len(MovementThemeOrder))
		themeName = MovementThemeOrder[idx]
		themeCats = MovementThemes[themeName]
	} else if cats, ok := MovementThemes[focus]; ok {
		themeName = focus
		themeCats = cats
	} else {
		themeName = focus
		themeCats = []string{focus}
	}

	// Scale phase budgets to requested duration
	scale := float64(duration) / 45.0
	budgets := make(map[string]int, 4)
	for ph, secs := range timeBudget45 {
		budgets[ph] = int(float64(secs) * scale)
	}

	// ── PREPARE ───────────────────────────────────────────────────────
	preparePool := make([]string, 0)
	for _, n := range corePrepare {
		if eligible(n, "PREPARE") {
			preparePool = append(preparePool, n)
		}
	}
	corePrepareSet := make(map[string]struct{}, len(corePrepare))
	for _, n := range corePrepare {
		corePrepareSet[n] = struct{}{}
	}
	for _, n := range phasePool["PREPARE"] {
		if _, inCore := corePrepareSet[n]; inCore {
			continue
		}
		if !eligible(n, "PREPARE") {
			continue
		}
		nameLow := strings.ToLower(n)
		for _, tc := range themeCats {
			if strings.Contains(nameLow, strings.ToLower(tc)) {
				preparePool = append(preparePool, n)
				break
			}
		}
	}

	nMin, nMax := phaseCounts["PREPARE"][0], phaseCounts["PREPARE"][1]
	nPrepare := nMax
	if !isAccel {
		nPrepare = 4
		if nPrepare > len(preparePool) {
			nPrepare = len(preparePool)
		}
	}
	if nPrepare < nMin {
		nPrepare = nMin
	}
	if nPrepare > len(preparePool) {
		nPrepare = len(preparePool)
	}

	prepareNames := sampleStrings(rng, preparePool, nPrepare)

	// ── PRACTICE ─────────────────────────────────────────────────────
	nPracticeTarget := phaseCounts["PRACTICE"][0] + 1
	if isAccel {
		nPracticeTarget = phaseCounts["PRACTICE"][1]
	}
	if nPracticeTarget < 1 {
		nPracticeTarget = 1
	}

	practiceNames := make([]string, 0)
	inPractice := make(map[string]struct{})

	// One representative per theme category
	for _, tc := range themeCats {
		pool := make([]string, 0)
		tcLow := strings.ToLower(tc)
		for _, n := range phasePool["PRACTICE"] {
			if !eligible(n, "PRACTICE") {
				continue
			}
			if _, already := inPractice[n]; already {
				continue
			}
			if strings.Contains(strings.ToLower(n), tcLow) {
				pool = append(pool, n)
			}
		}
		if len(pool) == 0 {
			continue
		}
		// Sort: accelerated prefers harder; standard prefers easier
		sortByDifficulty(pool, catalogue, isAccel, rng)
		practiceNames = append(practiceNames, pool[0])
		inPractice[pool[0]] = struct{}{}
	}

	// Fill up with theme-matched extras
	remaining := nPracticeTarget - len(practiceNames)
	if remaining > 0 {
		extras := make([]string, 0)
		for _, n := range phasePool["PRACTICE"] {
			if !eligible(n, "PRACTICE") {
				continue
			}
			if _, already := inPractice[n]; already {
				continue
			}
			nameLow := strings.ToLower(n)
			for _, tc := range themeCats {
				if strings.Contains(nameLow, strings.ToLower(tc)) {
					extras = append(extras, n)
					break
				}
			}
		}
		sortByDifficulty(extras, catalogue, isAccel, rng)
		for i := 0; i < remaining && i < len(extras); i++ {
			practiceNames = append(practiceNames, extras[i])
			inPractice[extras[i]] = struct{}{}
		}
	}

	// Fill with general practice if still short
	remaining = nPracticeTarget - len(practiceNames)
	if remaining > 0 {
		general := make([]string, 0)
		for _, n := range phasePool["PRACTICE"] {
			if !eligible(n, "PRACTICE") {
				continue
			}
			if _, already := inPractice[n]; already {
				continue
			}
			general = append(general, n)
		}
		rng.Shuffle(len(general), func(i, j int) { general[i], general[j] = general[j], general[i] })
		for i := 0; i < remaining && i < len(general); i++ {
			practiceNames = append(practiceNames, general[i])
		}
	}

	// ── PLAY ──────────────────────────────────────────────────────────
	// One exploratory exercise bridging Practice and Push.
	// Sourced from PUSH pool (free-flow territory), no difficulty cap —
	// Play is intentionally creative regardless of level.
	practiceSetForPlay := make(map[string]struct{}, len(practiceNames))
	for _, n := range practiceNames {
		practiceSetForPlay[n] = struct{}{}
	}

	// Prefer theme-matched PUSH exercises
	playCandidates := make([]string, 0)
	for _, n := range phasePool["PUSH"] {
		if _, already := practiceSetForPlay[n]; already {
			continue
		}
		// Check it exists in catalogue (skip unknown)
		if _, ok := catalogue[n]; !ok {
			continue
		}
		nameLow := strings.ToLower(n)
		for _, tc := range themeCats {
			if strings.Contains(nameLow, strings.ToLower(tc)) {
				playCandidates = append(playCandidates, n)
				break
			}
		}
	}
	// Fallback: any PUSH exercise not already in practice
	if len(playCandidates) == 0 {
		for _, n := range phasePool["PUSH"] {
			if _, already := practiceSetForPlay[n]; already {
				continue
			}
			if _, ok := catalogue[n]; !ok {
				continue
			}
			playCandidates = append(playCandidates, n)
		}
	}
	sortByDifficulty(playCandidates, catalogue, isAccel, rng)
	var playNames []string
	if len(playCandidates) > 0 {
		playNames = []string{playCandidates[0]}
	}

	// ── PUSH ─────────────────────────────────────────────────────────
	nPushTarget := phaseCounts["PUSH"][0] + 1
	if isAccel {
		nPushTarget = phaseCounts["PUSH"][1]
	}

	practiceSet := make(map[string]struct{}, len(practiceNames)+len(playNames))
	for _, n := range practiceNames {
		practiceSet[n] = struct{}{}
	}
	for _, n := range playNames {
		practiceSet[n] = struct{}{}
	}

	themePush := make([]string, 0)
	for _, n := range phasePool["PUSH"] {
		if !eligible(n, "PUSH") {
			continue
		}
		if _, inPrac := practiceSet[n]; inPrac {
			continue
		}
		nameLow := strings.ToLower(n)
		for _, tc := range themeCats {
			if strings.Contains(nameLow, strings.ToLower(tc)) {
				themePush = append(themePush, n)
				break
			}
		}
	}
	sortByDifficulty(themePush, catalogue, isAccel, rng)

	themePushSet := make(map[string]struct{}, len(themePush))
	for _, n := range themePush {
		themePushSet[n] = struct{}{}
	}
	generalPush := make([]string, 0)
	for _, n := range phasePool["PUSH"] {
		if !eligible(n, "PUSH") {
			continue
		}
		if _, inPrac := practiceSet[n]; inPrac {
			continue
		}
		if _, inTheme := themePushSet[n]; inTheme {
			continue
		}
		generalPush = append(generalPush, n)
	}
	sortByDifficulty(generalPush, catalogue, isAccel, rng)

	pushCandidates := append(themePush, generalPush...)
	if nPushTarget > len(pushCandidates) {
		nPushTarget = len(pushCandidates)
	}
	pushNames := pushCandidates[:nPushTarget]

	// ── PONDER ────────────────────────────────────────────────────────
	ponderNames := make([]string, 0)
	for _, n := range corePonder {
		if eligible(n, "PONDER") {
			ponderNames = append(ponderNames, n)
		}
	}
	corePonderSet := make(map[string]struct{}, len(corePonder))
	for _, n := range corePonder {
		corePonderSet[n] = struct{}{}
	}
	extraPonder := make([]string, 0)
	for _, n := range phasePool["PONDER"] {
		if _, inCore := corePonderSet[n]; inCore {
			continue
		}
		if eligible(n, "PONDER") {
			extraPonder = append(extraPonder, n)
		}
	}
	rng.Shuffle(len(extraPonder), func(i, j int) { extraPonder[i], extraPonder[j] = extraPonder[j], extraPonder[i] })
	maxPonder := phaseCounts["PONDER"][1]
	for _, n := range extraPonder {
		if len(ponderNames) >= maxPonder {
			break
		}
		ponderNames = append(ponderNames, n)
	}

	// ── Assign durations ─────────────────────────────────────────────
	prepareDur := assignDurations(prepareNames, "PREPARE", budgets["PREPARE"])
	practiceDur := assignDurations(practiceNames, "PRACTICE", budgets["PRACTICE"])
	playDur := assignDurations(playNames, "PLAY", budgets["PLAY"])
	pushDur := assignDurations(pushNames, "PUSH", budgets["PUSH"])
	ponderDur := assignDurations(ponderNames, "PONDER", budgets["PONDER"])

	// ── Build phase objects ───────────────────────────────────────────
	makeExercises := func(nameDurs []struct {
		name string
		secs int
	}) []GMBExercise {
		exs := make([]GMBExercise, 0, len(nameDurs))
		for i, nd := range nameDurs {
			e := catalogue[nd.name]
			exs = append(exs, GMBExercise{
				Order:        i + 1,
				Name:         nd.name,
				Description:  e.Description,
				Category:     e.Category,
				Difficulty:   e.Difficulty,
				DurationStr:  fmtDuration(nd.secs),
				DurationSecs: nd.secs,
			})
		}
		return exs
	}

	phases := map[string][]GMBExercise{
		"PREPARE":  makeExercises(prepareDur),
		"PRACTICE": makeExercises(practiceDur),
		"PLAY":     makeExercises(playDur),
		"PUSH":     makeExercises(pushDur),
		"PONDER":   makeExercises(ponderDur),
	}

	totalSecs := 0
	exerciseCount := 0
	for _, exs := range phases {
		for _, ex := range exs {
			totalSecs += ex.DurationSecs
			exerciseCount++
		}
	}

	return GMBSessionResult{
		Level:          level,
		Theme:          themeName,
		TargetDuration: fmt.Sprintf("%d min", duration),
		TotalTimeEst:   fmtDuration(totalSecs),
		TotalSecs:      totalSecs,
		ExerciseCount:  exerciseCount,
		Phases:         phases,
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func sampleStrings(rng *rand.Rand, pool []string, n int) []string {
	if n >= len(pool) {
		out := make([]string, len(pool))
		copy(out, pool)
		return out
	}
	// Fisher-Yates partial shuffle
	indices := make([]int, len(pool))
	for i := range indices {
		indices[i] = i
	}
	for i := 0; i < n; i++ {
		j := i + rng.Intn(len(indices)-i)
		indices[i], indices[j] = indices[j], indices[i]
	}
	out := make([]string, n)
	for i := 0; i < n; i++ {
		out[i] = pool[indices[i]]
	}
	return out
}

func sortByDifficulty(names []string, catalogue map[string]GMBCatalogEntry, descending bool, rng *rand.Rand) {
	// Stable sort by (difficulty, random tiebreak)
	// Use a simple insertion sort since lists are small
	for i := 1; i < len(names); i++ {
		for j := i; j > 0; j-- {
			di := catalogue[names[j]].Difficulty
			dj := catalogue[names[j-1]].Difficulty
			var swap bool
			if descending {
				swap = di > dj
			} else {
				swap = di < dj
			}
			if swap {
				names[j], names[j-1] = names[j-1], names[j]
			} else {
				break
			}
		}
	}
	// Random tiebreak within same difficulty groups
	_ = rng
}
