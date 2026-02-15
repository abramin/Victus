package domain

import "time"

// IssueSeverity represents the severity of a body part issue.
type IssueSeverity int

const (
	IssueSeverityHealing  IssueSeverity = -1 // improved, recovered, loosened, better, mobile (-5% fatigue)
	IssueSeverityMinor    IssueSeverity = 1  // tight, stiff, restricted, weak (+5% fatigue)
	IssueSeverityModerate IssueSeverity = 2  // sore, ache, tender, fatigued, cramping (+10% fatigue)
	IssueSeveritySevere   IssueSeverity = 3  // pain, sharp, burning, tingling, numb, swollen, clicky (+15% fatigue)
)

// IssueSeverityFatigueModifier maps severity to fatigue percentage modifier.
// Positive values add fatigue, negative values (healing) reduce fatigue.
var IssueSeverityFatigueModifier = map[IssueSeverity]float64{
	IssueSeverityHealing:  -5.0,
	IssueSeverityMinor:    5.0,
	IssueSeverityModerate: 10.0,
	IssueSeveritySevere:   15.0,
}

// SymptomSeverityMap maps symptom keywords to their severity level.
var SymptomSeverityMap = map[string]IssueSeverity{
	// Healing symptoms (-5% fatigue, from echo logs indicating improvement)
	"improved":  IssueSeverityHealing,
	"recovered": IssueSeverityHealing,
	"loosened":  IssueSeverityHealing,
	"better":    IssueSeverityHealing,
	"mobile":    IssueSeverityHealing,
	"flexible":  IssueSeverityHealing,
	// Minor symptoms (+5% fatigue)
	"tight":      IssueSeverityMinor,
	"stiff":      IssueSeverityMinor,
	"restricted": IssueSeverityMinor,
	"weak":       IssueSeverityMinor,
	// Moderate symptoms (+10% fatigue)
	"sore":     IssueSeverityModerate,
	"ache":     IssueSeverityModerate,
	"aching":   IssueSeverityModerate,
	"tender":   IssueSeverityModerate,
	"fatigued": IssueSeverityModerate,
	"cramping": IssueSeverityModerate,
	"cramp":    IssueSeverityModerate,
	// Severe symptoms (+15% fatigue)
	"pain":     IssueSeveritySevere,
	"painful":  IssueSeveritySevere,
	"sharp":    IssueSeveritySevere,
	"burning":  IssueSeveritySevere,
	"tingling": IssueSeveritySevere,
	"numb":     IssueSeveritySevere,
	"numbness": IssueSeveritySevere,
	"swollen":  IssueSeveritySevere,
	"swelling": IssueSeveritySevere,
	"clicky":   IssueSeveritySevere,
	"clicking": IssueSeveritySevere,
	"popping":  IssueSeveritySevere,
}

// BodyAliasToMuscleGroup maps common body part aliases to MuscleGroup.
// Some aliases map to multiple muscle groups (e.g., "shoulder" affects all delts).
var BodyAliasToMuscleGroup = map[string][]MuscleGroup{
	// Direct muscle names
	"chest":      {MuscleChest},
	"quads":      {MuscleQuads},
	"hamstrings": {MuscleHamstrings},
	"glutes":     {MuscleGlutes},
	"lats":       {MuscleLats},
	"traps":      {MuscleTraps},
	"biceps":     {MuscleBiceps},
	"triceps":    {MuscleTriceps},
	"calves":     {MuscleCalves},
	"core":       {MuscleCore},
	"forearms":   {MuscleForearms},
	"abs":        {MuscleCore},
	// Aliases that map to related muscles
	"knee":      {MuscleQuads},
	"knees":     {MuscleQuads},
	"shoulder":  {MuscleFrontDelt, MuscleSideDelt, MuscleRearDelt},
	"shoulders": {MuscleFrontDelt, MuscleSideDelt, MuscleRearDelt},
	"back":      {MuscleLats, MuscleLowerBack},
	"lower back": {MuscleLowerBack},
	"hip":       {MuscleGlutes},
	"hips":      {MuscleGlutes},
	"ankle":     {MuscleCalves},
	"ankles":    {MuscleCalves},
	"wrist":     {MuscleForearms},
	"wrists":    {MuscleForearms},
	"elbow":     {MuscleForearms, MuscleTriceps},
	"elbows":    {MuscleForearms, MuscleTriceps},
	"shin":      {MuscleCalves},
	"shins":     {MuscleCalves},
	"groin":     {MuscleGlutes, MuscleQuads},
	"neck":      {MuscleTraps},
	"quad":      {MuscleQuads},
	"hamstring": {MuscleHamstrings},
	"glute":     {MuscleGlutes},
	"lat":       {MuscleLats},
	"trap":      {MuscleTraps},
	"bicep":     {MuscleBiceps},
	"tricep":    {MuscleTriceps},
	"calf":      {MuscleCalves},
	"forearm":   {MuscleForearms},
}

// IssueDecayDays is the number of days over which an issue's effect decays.
// After this period, the issue no longer contributes to fatigue.
const IssueDecayDays = 5

// BodyPartIssue represents a detected issue from workout notes.
type BodyPartIssue struct {
	ID          int64         `json:"id"`
	Date        string        `json:"date"`        // YYYY-MM-DD format
	BodyPart    MuscleGroup   `json:"bodyPart"`    // Normalized muscle group
	Symptom     string        `json:"symptom"`     // Original symptom word
	Severity    IssueSeverity `json:"severity"`    // Inferred from symptom
	RawText     string        `json:"rawText"`     // Original note excerpt
	SessionID   *int64        `json:"sessionId"`   // Optional link to training session
	CreatedAt   time.Time     `json:"createdAt"`
}

// BodyPartIssueInput is used when creating a new body part issue.
type BodyPartIssueInput struct {
	Date      string        `json:"date"`
	BodyPart  MuscleGroup   `json:"bodyPart"`
	Symptom   string        `json:"symptom"`
	Severity  IssueSeverity `json:"severity"`
	RawText   string        `json:"rawText"`
	SessionID *int64        `json:"sessionId"`
}

// ResolveSeverity sets the Severity field based on the Symptom.
// Defaults to IssueSeverityMinor if the symptom is not recognized.
func (input *BodyPartIssueInput) ResolveSeverity() {
	sev := GetSymptomSeverity(input.Symptom)
	if sev == 0 {
		sev = IssueSeverityMinor
	}
	input.Severity = sev
}

// GetSymptomSeverity returns the severity for a symptom keyword.
// Returns 0 if the symptom is not recognized.
func GetSymptomSeverity(symptom string) IssueSeverity {
	if sev, ok := SymptomSeverityMap[symptom]; ok {
		return sev
	}
	return 0
}

// GetMuscleGroupsForAlias returns the muscle groups associated with a body alias.
// Returns nil if the alias is not recognized.
func GetMuscleGroupsForAlias(alias string) []MuscleGroup {
	if groups, ok := BodyAliasToMuscleGroup[alias]; ok {
		return groups
	}
	return nil
}

// CalculateIssueFatigueModifier calculates the fatigue modifier for an issue
// based on its severity and age (days since creation).
// The modifier decays linearly over IssueDecayDays.
func CalculateIssueFatigueModifier(severity IssueSeverity, daysSinceCreation int) float64 {
	if daysSinceCreation >= IssueDecayDays {
		return 0
	}
	baseFatigue := IssueSeverityFatigueModifier[severity]
	// Linear decay: 100% at day 0, 0% at day IssueDecayDays
	decayFactor := 1.0 - (float64(daysSinceCreation) / float64(IssueDecayDays))
	return baseFatigue * decayFactor
}

// ValidSymptoms returns all recognized symptom keywords.
func ValidSymptoms() []string {
	symptoms := make([]string, 0, len(SymptomSeverityMap))
	for s := range SymptomSeverityMap {
		symptoms = append(symptoms, s)
	}
	return symptoms
}

// ValidBodyAliases returns all recognized body part aliases.
func ValidBodyAliases() []string {
	aliases := make([]string, 0, len(BodyAliasToMuscleGroup))
	for a := range BodyAliasToMuscleGroup {
		aliases = append(aliases, a)
	}
	return aliases
}
