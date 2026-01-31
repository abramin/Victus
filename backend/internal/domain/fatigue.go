package domain

import "math"

// MuscleGroup represents a trackable muscle region for body map visualization.
type MuscleGroup string

const (
	MuscleChest      MuscleGroup = "chest"
	MuscleFrontDelt  MuscleGroup = "front_delt"
	MuscleTriceps    MuscleGroup = "triceps"
	MuscleSideDelt   MuscleGroup = "side_delt"
	MuscleLats       MuscleGroup = "lats"
	MuscleTraps      MuscleGroup = "traps"
	MuscleBiceps     MuscleGroup = "biceps"
	MuscleRearDelt   MuscleGroup = "rear_delt"
	MuscleForearms   MuscleGroup = "forearms"
	MuscleQuads      MuscleGroup = "quads"
	MuscleGlutes     MuscleGroup = "glutes"
	MuscleHamstrings MuscleGroup = "hamstrings"
	MuscleCalves     MuscleGroup = "calves"
	MuscleLowerBack  MuscleGroup = "lower_back"
	MuscleCore       MuscleGroup = "core"
)

// ValidMuscleGroups contains all valid muscle group values.
var ValidMuscleGroups = map[MuscleGroup]bool{
	MuscleChest:      true,
	MuscleFrontDelt:  true,
	MuscleTriceps:    true,
	MuscleSideDelt:   true,
	MuscleLats:       true,
	MuscleTraps:      true,
	MuscleBiceps:     true,
	MuscleRearDelt:   true,
	MuscleForearms:   true,
	MuscleQuads:      true,
	MuscleGlutes:     true,
	MuscleHamstrings: true,
	MuscleCalves:     true,
	MuscleLowerBack:  true,
	MuscleCore:       true,
}

// MuscleGroupDisplayNames provides human-readable names for muscle groups.
var MuscleGroupDisplayNames = map[MuscleGroup]string{
	MuscleChest:      "Chest",
	MuscleFrontDelt:  "Front Delts",
	MuscleTriceps:    "Triceps",
	MuscleSideDelt:   "Side Delts",
	MuscleLats:       "Lats",
	MuscleTraps:      "Traps",
	MuscleBiceps:     "Biceps",
	MuscleRearDelt:   "Rear Delts",
	MuscleForearms:   "Forearms",
	MuscleQuads:      "Quads",
	MuscleGlutes:     "Glutes",
	MuscleHamstrings: "Hamstrings",
	MuscleCalves:     "Calves",
	MuscleLowerBack:  "Lower Back",
	MuscleCore:       "Core/Abs",
}

// ParseMuscleGroup safely converts a string to MuscleGroup with validation.
func ParseMuscleGroup(s string) (MuscleGroup, error) {
	m := MuscleGroup(s)
	if !ValidMuscleGroups[m] {
		return "", ErrInvalidMuscleGroup
	}
	return m, nil
}

// Archetype represents a workout pattern (Push, Pull, Legs, etc.).
type Archetype string

const (
	ArchetypePush        Archetype = "push"
	ArchetypePull        Archetype = "pull"
	ArchetypeLegs        Archetype = "legs"
	ArchetypeUpper       Archetype = "upper"
	ArchetypeLower       Archetype = "lower"
	ArchetypeFullBody    Archetype = "full_body"
	ArchetypeCardioImpact Archetype = "cardio_impact"
	ArchetypeCardioLow   Archetype = "cardio_low"
)

// ValidArchetypes contains all valid archetype values.
var ValidArchetypes = map[Archetype]bool{
	ArchetypePush:         true,
	ArchetypePull:         true,
	ArchetypeLegs:         true,
	ArchetypeUpper:        true,
	ArchetypeLower:        true,
	ArchetypeFullBody:     true,
	ArchetypeCardioImpact: true,
	ArchetypeCardioLow:    true,
}

// ArchetypeDisplayNames provides human-readable names for archetypes.
var ArchetypeDisplayNames = map[Archetype]string{
	ArchetypePush:         "Push",
	ArchetypePull:         "Pull",
	ArchetypeLegs:         "Legs",
	ArchetypeUpper:        "Upper Body",
	ArchetypeLower:        "Lower Body",
	ArchetypeFullBody:     "Full Body",
	ArchetypeCardioImpact: "Cardio (Impact)",
	ArchetypeCardioLow:    "Cardio (Low Impact)",
}

// ParseArchetype safely converts a string to Archetype with validation.
func ParseArchetype(s string) (Archetype, error) {
	a := Archetype(s)
	if !ValidArchetypes[a] {
		return "", ErrInvalidArchetype
	}
	return a, nil
}

// FatigueStatus represents the fatigue level classification.
type FatigueStatus string

const (
	FatigueStatusFresh       FatigueStatus = "fresh"       // 0-25%
	FatigueStatusStimulated  FatigueStatus = "stimulated"  // 26-50%
	FatigueStatusFatigued    FatigueStatus = "fatigued"    // 51-75%
	FatigueStatusOverreached FatigueStatus = "overreached" // 76-100%
)

// FatigueStatusColors maps fatigue status to hex colors for visualization.
var FatigueStatusColors = map[FatigueStatus]string{
	FatigueStatusFresh:       "#22c55e", // emerald-500
	FatigueStatusStimulated:  "#eab308", // yellow-500
	FatigueStatusFatigued:    "#f97316", // orange-500
	FatigueStatusOverreached: "#ef4444", // red-500
}

// GetFatigueStatus returns the status classification for a fatigue percentage.
func GetFatigueStatus(percent float64) FatigueStatus {
	switch {
	case percent <= 25:
		return FatigueStatusFresh
	case percent <= 50:
		return FatigueStatusStimulated
	case percent <= 75:
		return FatigueStatusFatigued
	default:
		return FatigueStatusOverreached
	}
}

// MuscleFatigueState represents current fatigue for a single muscle.
type MuscleFatigueState struct {
	MuscleGroupID  int         `json:"muscleGroupId"`
	Muscle         MuscleGroup `json:"muscle"`
	DisplayName    string      `json:"displayName"`
	FatiguePercent float64     `json:"fatiguePercent"`
	Status         FatigueStatus `json:"status"`
	Color          string      `json:"color"`
	LastUpdated    string      `json:"lastUpdated"`
}

// BodyStatus represents the complete body fatigue state.
type BodyStatus struct {
	Muscles        []MuscleFatigueState `json:"muscles"`
	OverallScore   float64              `json:"overallScore"`
	AsOfTime       string               `json:"asOfTime"`
	JointIntegrity map[string]float64   `json:"jointIntegrity"`
	SystemicLoad   float64              `json:"systemicLoad"`
}

// FatigueInjection represents the fatigue added to a single muscle by a workout.
type FatigueInjection struct {
	Muscle          MuscleGroup   `json:"muscle"`
	DisplayName     string        `json:"displayName"`
	InjectedPercent float64       `json:"injectedPercent"`
	NewTotal        float64       `json:"newTotal"`
	Status          FatigueStatus `json:"status"`
}

// SessionFatigueReport summarizes fatigue impact from a workout.
type SessionFatigueReport struct {
	SessionID  int64              `json:"sessionId"`
	Archetype  Archetype          `json:"archetype"`
	TotalLoad  float64            `json:"totalLoad"`
	Injections []FatigueInjection `json:"injections"`
	AppliedAt  string             `json:"appliedAt"`
}

// ArchetypeConfig holds muscle coefficients for an archetype.
type ArchetypeConfig struct {
	ID           int                     `json:"id"`
	Name         Archetype               `json:"name"`
	DisplayName  string                  `json:"displayName"`
	Coefficients map[MuscleGroup]float64 `json:"coefficients"`
}

// MuscleGroupConfig holds database info for a muscle group.
type MuscleGroupConfig struct {
	ID          int         `json:"id"`
	Name        MuscleGroup `json:"name"`
	DisplayName string      `json:"displayName"`
	SVGPathID   string      `json:"svgPathId"`
}

// FatigueDecayPercentPerHour is the recovery rate (~2% per hour = 50 hours full recovery).
const FatigueDecayPercentPerHour = 2.0

// CalculateFatigueSessionLoad computes total load from duration and RPE.
// Formula: TotalLoad = Duration(min) × (RPE / 10) / 10
// At 60min RPE 10 = 0.6 load units (normalized for coefficient multiplication).
func CalculateFatigueSessionLoad(durationMin int, rpe *int) float64 {
	rpeValue := 5 // Default RPE when not specified
	if rpe != nil {
		rpeValue = *rpe
	}
	return float64(durationMin) * (float64(rpeValue) / 10.0) / 10.0
}

// CalculateFatigueInjection computes fatigue percentage added to a muscle.
// Formula: MuscleFatigue% = TotalLoad × Coefficient × 100
// At max load (0.6) with coefficient 1.0 = 60% injection.
func CalculateFatigueInjection(totalLoad float64, coefficient float64) float64 {
	return totalLoad * coefficient * 100.0
}

// ApplyFatigueDecay calculates new fatigue after time elapsed.
// Returns max(0, current - hoursElapsed × decayRate).
func ApplyFatigueDecay(currentPercent float64, hoursElapsed float64) float64 {
	decayed := currentPercent - (hoursElapsed * FatigueDecayPercentPerHour)
	if decayed < 0 {
		return 0
	}
	return decayed
}

// AddFatigue safely adds fatigue to current level, capping at 100%.
func AddFatigue(currentPercent float64, injectionPercent float64) float64 {
	newTotal := currentPercent + injectionPercent
	if newTotal > 100 {
		return 100
	}
	return newTotal
}

// MuscleWeights defines relative weights for overall fatigue calculation.
// Larger muscle groups have higher weight.
var MuscleWeights = map[MuscleGroup]float64{
	MuscleChest:      1.2,
	MuscleLats:       1.2,
	MuscleQuads:      1.3,
	MuscleGlutes:     1.3,
	MuscleHamstrings: 1.0,
	MuscleTraps:      0.8,
	MuscleTriceps:    0.6,
	MuscleBiceps:     0.6,
	MuscleFrontDelt:  0.5,
	MuscleRearDelt:   0.5,
	MuscleSideDelt:   0.5,
	MuscleForearms:   0.4,
	MuscleCalves:     0.5,
	MuscleLowerBack:  0.7,
	MuscleCore:       0.8,
}

// CalculateOverallFatigueScore computes weighted average of muscle fatigue.
func CalculateOverallFatigueScore(muscles []MuscleFatigueState) float64 {
	if len(muscles) == 0 {
		return 0
	}

	var totalWeight, weightedSum float64
	for _, m := range muscles {
		w := MuscleWeights[m.Muscle]
		if w == 0 {
			w = 0.5 // Default weight
		}
		totalWeight += w
		weightedSum += m.FatiguePercent * w
	}

	if totalWeight == 0 {
		return 0
	}
	return math.Round(weightedSum/totalWeight*10) / 10 // Round to 1 decimal
}

// BuildMuscleFatigueState creates a complete MuscleFatigueState from raw data.
func BuildMuscleFatigueState(muscleGroupID int, muscle MuscleGroup, fatiguePercent float64, lastUpdated string) MuscleFatigueState {
	status := GetFatigueStatus(fatiguePercent)
	return MuscleFatigueState{
		MuscleGroupID:  muscleGroupID,
		Muscle:         muscle,
		DisplayName:    MuscleGroupDisplayNames[muscle],
		FatiguePercent: math.Round(fatiguePercent*10) / 10, // Round to 1 decimal
		Status:         status,
		Color:          FatigueStatusColors[status],
		LastUpdated:    lastUpdated,
	}
}

// BuildFatigueInjection creates a FatigueInjection for a muscle.
func BuildFatigueInjection(muscle MuscleGroup, injectedPercent float64, newTotal float64) FatigueInjection {
	status := GetFatigueStatus(newTotal)
	return FatigueInjection{
		Muscle:          muscle,
		DisplayName:     MuscleGroupDisplayNames[muscle],
		InjectedPercent: math.Round(injectedPercent*10) / 10,
		NewTotal:        math.Round(newTotal*10) / 10,
		Status:          status,
	}
}
