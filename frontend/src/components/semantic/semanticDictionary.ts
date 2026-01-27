import { MuscleGroup } from '../../api/types';

export type SemanticTokenType = 'bodyPart' | 'symptom';

export interface SemanticToken {
  text: string;
  type: SemanticTokenType;
  startIndex: number;
  endIndex: number;
  normalizedValue?: string; // For body parts: the MuscleGroup it maps to
}

// Symptom severity levels matching backend
export type IssueSeverity = 1 | 2 | 3;

// Symptom keywords mapped to severity
// Minor (1): +5% fatigue
// Moderate (2): +10% fatigue
// Severe (3): +15% fatigue
export const SYMPTOM_SEVERITY_MAP: Record<string, IssueSeverity> = {
  // Minor symptoms
  tight: 1,
  stiff: 1,
  restricted: 1,
  weak: 1,
  // Moderate symptoms
  sore: 2,
  ache: 2,
  aching: 2,
  tender: 2,
  fatigued: 2,
  cramping: 2,
  cramp: 2,
  // Severe symptoms
  pain: 3,
  painful: 3,
  sharp: 3,
  burning: 3,
  tingling: 3,
  numb: 3,
  numbness: 3,
  swollen: 3,
  swelling: 3,
  clicky: 3,
  clicking: 3,
  popping: 3,
};

// All recognized symptom keywords
export const SYMPTOMS = Object.keys(SYMPTOM_SEVERITY_MAP);

// Body alias to MuscleGroup mapping
// Some aliases map to multiple muscle groups
export const BODY_ALIAS_MAP: Record<string, MuscleGroup[]> = {
  // Direct muscle names
  chest: ['chest'],
  quads: ['quads'],
  quad: ['quads'],
  hamstrings: ['hamstrings'],
  hamstring: ['hamstrings'],
  glutes: ['glutes'],
  glute: ['glutes'],
  lats: ['lats'],
  lat: ['lats'],
  traps: ['traps'],
  trap: ['traps'],
  biceps: ['biceps'],
  bicep: ['biceps'],
  triceps: ['triceps'],
  tricep: ['triceps'],
  calves: ['calves'],
  calf: ['calves'],
  core: ['core'],
  abs: ['core'],
  forearms: ['forearms'],
  forearm: ['forearms'],
  // Aliases that map to related muscles
  knee: ['quads'],
  knees: ['quads'],
  shoulder: ['front_delt', 'side_delt', 'rear_delt'],
  shoulders: ['front_delt', 'side_delt', 'rear_delt'],
  back: ['lats', 'lower_back'],
  'lower back': ['lower_back'],
  hip: ['glutes'],
  hips: ['glutes'],
  ankle: ['calves'],
  ankles: ['calves'],
  wrist: ['forearms'],
  wrists: ['forearms'],
  elbow: ['forearms', 'triceps'],
  elbows: ['forearms', 'triceps'],
  shin: ['calves'],
  shins: ['calves'],
  groin: ['glutes', 'quads'],
  neck: ['traps'],
};

// All recognized body part aliases
export const BODY_PARTS = Object.keys(BODY_ALIAS_MAP);

// Get the severity for a symptom keyword
export function getSymptomSeverity(symptom: string): IssueSeverity | null {
  const normalized = symptom.toLowerCase();
  return SYMPTOM_SEVERITY_MAP[normalized] || null;
}

// Get the muscle groups for a body part alias
export function getMuscleGroupsForAlias(alias: string): MuscleGroup[] | null {
  const normalized = alias.toLowerCase();
  return BODY_ALIAS_MAP[normalized] || null;
}

// Create regex pattern for word boundary matching
function createWordPattern(words: string[]): RegExp {
  // Sort by length (longest first) to match "lower back" before "back"
  const sorted = [...words].sort((a, b) => b.length - a.length);
  // Escape special regex characters and join with |
  const escaped = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Match whole words only, case insensitive
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

// Pre-compiled regex patterns for efficient matching
export const BODY_PART_PATTERN = createWordPattern(BODY_PARTS);
export const SYMPTOM_PATTERN = createWordPattern(SYMPTOMS);

// Detect semantic tokens in text
export function detectSemanticTokens(text: string): SemanticToken[] {
  const tokens: SemanticToken[] = [];

  // Find body parts
  let match: RegExpExecArray | null;
  const bodyPattern = new RegExp(BODY_PART_PATTERN.source, 'gi');
  while ((match = bodyPattern.exec(text)) !== null) {
    const muscles = getMuscleGroupsForAlias(match[0]);
    tokens.push({
      text: match[0],
      type: 'bodyPart',
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      normalizedValue: muscles?.[0], // Use first muscle for normalization
    });
  }

  // Find symptoms
  const symptomPattern = new RegExp(SYMPTOM_PATTERN.source, 'gi');
  while ((match = symptomPattern.exec(text)) !== null) {
    // Skip if this position overlaps with a body part (e.g., "tight" in "tightness")
    const overlaps = tokens.some(
      (t) =>
        (match!.index >= t.startIndex && match!.index < t.endIndex) ||
        (match!.index + match![0].length > t.startIndex &&
          match!.index + match![0].length <= t.endIndex),
    );
    if (!overlaps) {
      tokens.push({
        text: match[0],
        type: 'symptom',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Sort by position
  tokens.sort((a, b) => a.startIndex - b.startIndex);

  return tokens;
}

// Group tokens into body part + symptom pairs for API submission
export interface DetectedIssue {
  bodyPart: MuscleGroup;
  symptom: string;
  rawText: string;
}

export function extractIssuesFromTokens(
  text: string,
  tokens: SemanticToken[],
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const bodyPartTokens = tokens.filter((t) => t.type === 'bodyPart');
  const symptomTokens = tokens.filter((t) => t.type === 'symptom');

  // Strategy: Associate each symptom with the nearest body part
  // If no body part found, skip the symptom
  for (const symptom of symptomTokens) {
    // Find the nearest body part
    let nearestBodyPart: SemanticToken | null = null;
    let minDistance = Infinity;

    for (const bodyPart of bodyPartTokens) {
      const distance = Math.min(
        Math.abs(symptom.startIndex - bodyPart.endIndex),
        Math.abs(bodyPart.startIndex - symptom.endIndex),
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestBodyPart = bodyPart;
      }
    }

    if (nearestBodyPart && nearestBodyPart.normalizedValue) {
      // Get all muscle groups this body part maps to
      const muscles = getMuscleGroupsForAlias(nearestBodyPart.text);
      if (muscles) {
        for (const muscle of muscles) {
          issues.push({
            bodyPart: muscle,
            symptom: symptom.text.toLowerCase(),
            rawText: text.substring(
              Math.min(nearestBodyPart.startIndex, symptom.startIndex),
              Math.max(nearestBodyPart.endIndex, symptom.endIndex),
            ),
          });
        }
      }
    }
  }

  return issues;
}
