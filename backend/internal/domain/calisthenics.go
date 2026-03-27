package domain

import "math/rand"

// MuscleMap holds primary and secondary muscles for an exercise.
type MuscleMap struct {
	Primary   []string `json:"primary"`
	Secondary []string `json:"secondary"`
}

// CalisthenicsCatalogEntry holds metadata for a single calimove exercise.
type CalisthenicsCatalogEntry struct {
	Name       string
	Pattern    string // push, pull, squat, hinge, core, isometric_upper, isometric_lower, isometric_core
	Region     string // upper, lower, core
	Type       string // strength or isometric
	Level1     bool
	Level2     bool
	DefaultSets int
	Reps       string // "6-10", "15-25", "AMRAP", "50-80 sec"
	RepType    string // RM, TM, AMRAP
	Assisted   bool
	Muscles    MuscleMap
	Difficulty int // 1=beginner, 2=intermediate, 3=advanced
}

// CalisthenicsExercise is a single exercise in a generated calisthenics session.
type CalisthenicsExercise struct {
	Order    int       `json:"order"`
	Name     string    `json:"name"`
	Type     string    `json:"type"`     // strength or isometric
	Sets     *int      `json:"sets"`     // null for isometric
	Reps     string    `json:"reps"`     // "6-10", "50-80 sec", "AMRAP"
	RepType  string    `json:"rep_type"` // RM, TM, AMRAP
	Assisted bool      `json:"assisted"`
	Muscles  MuscleMap `json:"muscles"`
	Pattern  string    `json:"pattern"` // push, pull, squat, hinge, core
}

// CalisthenicsSessionResult is the complete output of GenerateCalisthenicsSession.
type CalisthenicsSessionResult struct {
	Level                string                 `json:"level"`
	SessionType          string                 `json:"sessionType"` // strength or isometric
	RestBetweenExercises string                 `json:"restBetweenExercises"`
	ExerciseCount        int                    `json:"exerciseCount"`
	Exercises            []CalisthenicsExercise `json:"exercises"`
	Seed                 int64                  `json:"seed"`
}

// calisthenicsCatalogue is the hardcoded exercise catalogue.
var calisthenicsCatalogue = []CalisthenicsCatalogEntry{
	// ── Push ──────────────────────────────────────────────────────────────────
	{
		Name: "Incline Push Up", Pattern: "push", Region: "upper", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"chest", "front_delt"}, Secondary: []string{"triceps"}},
		Difficulty: 1,
	},
	{
		Name: "Push Up", Pattern: "push", Region: "upper", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"chest", "front_delt"}, Secondary: []string{"triceps"}},
		Difficulty: 2,
	},
	{
		Name: "Side To Side Push Up", Pattern: "push", Region: "upper", Type: "strength",
		Level1: false, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"chest", "front_delt"}, Secondary: []string{"triceps", "side_delt"}},
		Difficulty: 3,
	},
	{
		Name: "Dip", Pattern: "push", Region: "upper", Type: "strength",
		Level1: false, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"chest", "triceps"}, Secondary: []string{"front_delt"}},
		Difficulty: 3,
	},
	{
		Name: "Band Ass Dip", Pattern: "push", Region: "upper", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: true,
		Muscles:    MuscleMap{Primary: []string{"chest", "triceps"}, Secondary: []string{"front_delt"}},
		Difficulty: 1,
	},
	// ── Pull ──────────────────────────────────────────────────────────────────
	{
		Name: "Bodyrow", Pattern: "pull", Region: "upper", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"lats", "traps"}, Secondary: []string{"biceps", "rear_delt"}},
		Difficulty: 1,
	},
	{
		Name: "Archer Bodyrow", Pattern: "pull", Region: "upper", Type: "strength",
		Level1: false, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"lats", "rear_delt"}, Secondary: []string{"biceps", "traps"}},
		Difficulty: 3,
	},
	{
		Name: "Pull Up", Pattern: "pull", Region: "upper", Type: "strength",
		Level1: false, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"lats", "biceps"}, Secondary: []string{"traps", "rear_delt"}},
		Difficulty: 3,
	},
	{
		Name: "Band Ass Pull Up", Pattern: "pull", Region: "upper", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: true,
		Muscles:    MuscleMap{Primary: []string{"lats", "biceps"}, Secondary: []string{"traps"}},
		Difficulty: 1,
	},
	// ── Isometric Upper ───────────────────────────────────────────────────────
	{
		Name: "Active Hang", Pattern: "isometric_upper", Region: "upper", Type: "isometric",
		Level1: true, Level2: true, DefaultSets: 0, Reps: "50-80 sec", RepType: "TM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"lats", "traps"}, Secondary: []string{"forearms"}},
		Difficulty: 1,
	},
	{
		Name: "Pike Stand", Pattern: "isometric_upper", Region: "upper", Type: "isometric",
		Level1: true, Level2: true, DefaultSets: 0, Reps: "50-80 sec", RepType: "TM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"front_delt", "traps"}, Secondary: []string{"core"}},
		Difficulty: 1,
	},
	// ── Squat ─────────────────────────────────────────────────────────────────
	{
		Name: "Squat", Pattern: "squat", Region: "lower", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings"}},
		Difficulty: 1,
	},
	{
		Name: "Side Squat", Pattern: "squat", Region: "lower", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings"}},
		Difficulty: 1,
	},
	{
		Name: "Jumping Squat", Pattern: "squat", Region: "lower", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"calves", "hamstrings"}},
		Difficulty: 2,
	},
	{
		Name: "Archer Squat", Pattern: "squat", Region: "lower", Type: "strength",
		Level1: false, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings"}},
		Difficulty: 3,
	},
	{
		Name: "Elevated Pistol Squat", Pattern: "squat", Region: "lower", Type: "strength",
		Level1: false, Level2: true, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings", "calves"}},
		Difficulty: 3,
	},
	// ── Hinge ─────────────────────────────────────────────────────────────────
	{
		Name: "Easy Bridge Raise", Pattern: "hinge", Region: "lower", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"glutes", "hamstrings"}, Secondary: []string{"lower_back"}},
		Difficulty: 1,
	},
	{
		Name: "Lunge", Pattern: "hinge", Region: "lower", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings"}},
		Difficulty: 1,
	},
	{
		Name: "Jumping Lunge", Pattern: "hinge", Region: "lower", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings", "calves"}},
		Difficulty: 2,
	},
	{
		Name: "Step Up", Pattern: "hinge", Region: "lower", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings"}},
		Difficulty: 1,
	},
	{
		Name: "Sl Glute Bridge Raise", Pattern: "hinge", Region: "lower", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"glutes", "hamstrings"}, Secondary: []string{"lower_back"}},
		Difficulty: 2,
	},
	{
		Name: "Swimmer", Pattern: "hinge", Region: "lower", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"lower_back", "glutes"}, Secondary: []string{"traps", "rear_delt"}},
		Difficulty: 1,
	},
	{
		Name: "Arch Up", Pattern: "hinge", Region: "lower", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"lower_back", "glutes"}, Secondary: []string{"hamstrings"}},
		Difficulty: 1,
	},
	// ── Isometric Lower ───────────────────────────────────────────────────────
	{
		Name: "Deep Squat", Pattern: "isometric_lower", Region: "lower", Type: "isometric",
		Level1: false, Level2: true, DefaultSets: 0, Reps: "50-80 sec", RepType: "TM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings", "calves"}},
		Difficulty: 2,
	},
	{
		Name: "Horse Stance", Pattern: "isometric_lower", Region: "lower", Type: "isometric",
		Level1: true, Level2: true, DefaultSets: 0, Reps: "50-80 sec", RepType: "TM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"quads", "glutes"}, Secondary: []string{"hamstrings"}},
		Difficulty: 1,
	},
	{
		Name: "Easy Bridge", Pattern: "isometric_lower", Region: "lower", Type: "isometric",
		Level1: true, Level2: false, DefaultSets: 0, Reps: "50-80 sec", RepType: "TM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"glutes", "hamstrings"}, Secondary: []string{"lower_back"}},
		Difficulty: 1,
	},
	// ── Core ──────────────────────────────────────────────────────────────────
	{
		Name: "Hollow Body Crunch", Pattern: "core", Region: "core", Type: "strength",
		Level1: true, Level2: true, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"core"}, Secondary: []string{}},
		Difficulty: 1,
	},
	{
		Name: "Lying Knee Twist", Pattern: "core", Region: "core", Type: "strength",
		Level1: false, Level2: true, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"core"}, Secondary: []string{"lower_back"}},
		Difficulty: 2,
	},
	{
		Name: "Knee To Elbow Plank", Pattern: "core", Region: "core", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"core"}, Secondary: []string{"front_delt"}},
		Difficulty: 1,
	},
	{
		Name: "Prone Arm Circles", Pattern: "core", Region: "core", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "15-25", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"core", "lower_back"}, Secondary: []string{"rear_delt"}},
		Difficulty: 1,
	},
	{
		Name: "Hanging Leg Raise", Pattern: "core", Region: "core", Type: "strength",
		Level1: true, Level2: false, DefaultSets: 3, Reps: "6-10", RepType: "RM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"core"}, Secondary: []string{"forearms", "lats"}},
		Difficulty: 2,
	},
	// ── Isometric Core ────────────────────────────────────────────────────────
	{
		Name: "Hollow Body", Pattern: "isometric_core", Region: "core", Type: "isometric",
		Level1: false, Level2: true, DefaultSets: 0, Reps: "50-80 sec", RepType: "TM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"core"}, Secondary: []string{}},
		Difficulty: 2,
	},
	{
		Name: "Plank", Pattern: "isometric_core", Region: "core", Type: "isometric",
		Level1: true, Level2: false, DefaultSets: 0, Reps: "50-80 sec", RepType: "TM", Assisted: false,
		Muscles:    MuscleMap{Primary: []string{"core"}, Secondary: []string{"front_delt"}},
		Difficulty: 1,
	},
}

// eligibleForLevel returns exercises matching the pattern that are available for the given level.
func eligibleForLevel(pattern, level string) []CalisthenicsCatalogEntry {
	var out []CalisthenicsCatalogEntry
	for _, e := range calisthenicsCatalogue {
		if e.Pattern != pattern {
			continue
		}
		if level == "1" && e.Level1 {
			out = append(out, e)
		} else if level == "2" && e.Level2 {
			out = append(out, e)
		}
	}
	return out
}

// eligibleByRegionAndType returns isometric exercises for a given region.
func eligibleIsometric(pattern, level string) []CalisthenicsCatalogEntry {
	return eligibleForLevel(pattern, level)
}

// weightedPick picks an exercise from a pool with bias toward higher difficulty.
// Uses rand.New with the provided source for reproducibility.
func weightedPick(pool []CalisthenicsCatalogEntry, rng *rand.Rand) CalisthenicsCatalogEntry {
	if len(pool) == 1 {
		return pool[0]
	}
	// Build cumulative weights: difficulty^1.5 to bias toward harder variants
	weights := make([]float64, len(pool))
	var total float64
	for i, e := range pool {
		w := float64(e.Difficulty * e.Difficulty)
		weights[i] = w
		total += w
	}
	r := rng.Float64() * total
	var cum float64
	for i, w := range weights {
		cum += w
		if r <= cum {
			return pool[i]
		}
	}
	return pool[len(pool)-1]
}

func setsPtr(n int) *int { return &n }

func entryToExercise(e CalisthenicsCatalogEntry, order int) CalisthenicsExercise {
	var sets *int
	if e.Type == "strength" {
		sets = setsPtr(e.DefaultSets)
	}
	return CalisthenicsExercise{
		Order:    order,
		Name:     e.Name,
		Type:     e.Type,
		Sets:     sets,
		Reps:     e.Reps,
		RepType:  e.RepType,
		Assisted: e.Assisted,
		Muscles:  e.Muscles,
		Pattern:  e.Pattern,
	}
}

// GenerateCalisthenicsSession generates a slot-based calisthenics session.
//
// level: "1" or "2"
// exerciseCount: 3, 4, or 5
// seed: reproducible seed (use rand.Int63() for random)
func GenerateCalisthenicsSession(level string, exerciseCount int, seed int64) CalisthenicsSessionResult {
	//nolint:gosec
	rng := rand.New(rand.NewSource(seed))

	// ~1 in 3 sessions is isometric (when seed % 3 == 0)
	isIsometric := seed%3 == 0

	restBetween := "90 sec"
	if level == "2" {
		restBetween = "3 min"
	}
	if isIsometric {
		restBetween = "60 sec"
	}

	var exercises []CalisthenicsExercise

	if isIsometric {
		exercises = generateIsometricSession(level, exerciseCount, rng)
	} else {
		exercises = generateStrengthSession(level, exerciseCount, rng, seed)
	}

	sessionType := "strength"
	if isIsometric {
		sessionType = "isometric"
	}

	return CalisthenicsSessionResult{
		Level:                level,
		SessionType:          sessionType,
		RestBetweenExercises: restBetween,
		ExerciseCount:        len(exercises),
		Exercises:            exercises,
		Seed:                 seed,
	}
}

func generateStrengthSession(level string, exerciseCount int, rng *rand.Rand, seed int64) []CalisthenicsExercise {
	var exercises []CalisthenicsExercise
	order := 1

	// Slot 1: Upper Push
	pushPool := eligibleForLevel("push", level)
	if len(pushPool) > 0 {
		picked := weightedPick(pushPool, rng)
		exercises = append(exercises, entryToExercise(picked, order))
		order++
	}

	// Slot 2: Upper Pull
	pullPool := eligibleForLevel("pull", level)
	if len(pullPool) > 0 {
		picked := weightedPick(pullPool, rng)
		exercises = append(exercises, entryToExercise(picked, order))
		order++
	}

	// Slot 3: Lower Body (squat or hinge, alternate by seed)
	var lowerPattern string
	if seed%2 == 0 {
		lowerPattern = "squat"
	} else {
		lowerPattern = "hinge"
	}
	lowerPool := eligibleForLevel(lowerPattern, level)
	if len(lowerPool) > 0 {
		picked := weightedPick(lowerPool, rng)
		exercises = append(exercises, entryToExercise(picked, order))
		order++
	}

	// Slot 4 (default): Core
	if exerciseCount >= 4 {
		corePool := eligibleForLevel("core", level)
		if len(corePool) > 0 {
			picked := weightedPick(corePool, rng)
			exercises = append(exercises, entryToExercise(picked, order))
			order++
		}
	}

	// Slot 5 (5-exercise): Second lower body (opposite pattern)
	if exerciseCount >= 5 {
		var secondPattern string
		if lowerPattern == "squat" {
			secondPattern = "hinge"
		} else {
			secondPattern = "squat"
		}
		secondPool := eligibleForLevel(secondPattern, level)
		if len(secondPool) > 0 {
			picked := weightedPick(secondPool, rng)
			exercises = append(exercises, entryToExercise(picked, order))
		}
	}

	// For 3-exercise: drop core, keep push+pull+lower
	if exerciseCount == 3 {
		if len(exercises) > 3 {
			exercises = exercises[:3]
		}
	}

	return exercises
}

func generateIsometricSession(level string, exerciseCount int, rng *rand.Rand) []CalisthenicsExercise {
	var exercises []CalisthenicsExercise
	order := 1

	// Pick 2 isometric upper exercises
	upperPatterns := []string{"isometric_upper", "isometric_upper"}
	upperPicked := 0
	for _, p := range upperPatterns {
		if upperPicked >= 2 {
			break
		}
		pool := eligibleIsometric(p, level)
		if len(pool) > 0 {
			picked := weightedPick(pool, rng)
			exercises = append(exercises, entryToExercise(picked, order))
			order++
			upperPicked++
		}
	}

	// Deduplicate: if both upper picks are the same, shuffle
	if len(exercises) >= 2 && exercises[0].Name == exercises[1].Name {
		pool := eligibleIsometric("isometric_upper", level)
		if len(pool) >= 2 {
			exercises[1] = entryToExercise(pool[rng.Intn(len(pool))], 2)
		}
	}

	// Pick 1 isometric lower
	lowerPool := eligibleIsometric("isometric_lower", level)
	if len(lowerPool) > 0 {
		picked := weightedPick(lowerPool, rng)
		exercises = append(exercises, entryToExercise(picked, order))
		order++
	}

	// Pick 1 isometric core
	corePool := eligibleIsometric("isometric_core", level)
	if len(corePool) > 0 {
		picked := weightedPick(corePool, rng)
		exercises = append(exercises, entryToExercise(picked, order))
		order++
	}

	// Trim or extend to exerciseCount
	if exerciseCount < len(exercises) {
		exercises = exercises[:exerciseCount]
	}

	return exercises
}
