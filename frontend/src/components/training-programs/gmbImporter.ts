import type { CreateProgramRequest, ProgramWeekInput, ProgramDayInput, SessionExercise, SessionPhase } from '../../api/types';

/** Compact phase code → SessionPhase */
const PHASE_MAP: Record<string, SessionPhase> = {
  pre: 'prepare',
  pra: 'practice',
  psh: 'push',
  pon: 'ponder',
};

interface GmbSessionEx {
  id: string;
  ph: string;
  o: number;
  d: number;
}

interface GmbSession {
  n: string;
  e: GmbSessionEx[];
}

interface GmbCompactData {
  standard: GmbSession[];
  accelerated: GmbSession[];
}

/** Fetch the compact GMB session data from the public directory (lazy, cached). */
let cachedData: GmbCompactData | null = null;

export async function fetchGmbData(): Promise<GmbCompactData> {
  if (cachedData) return cachedData;
  const resp = await fetch('/gmb_compact.json');
  if (!resp.ok) throw new Error('Failed to load GMB session data');
  cachedData = await resp.json() as GmbCompactData;
  return cachedData;
}

function sessionToExercises(session: GmbSession, durationScale: number): SessionExercise[] {
  return session.e.map((ex) => ({
    exerciseId: ex.id,
    phase: PHASE_MAP[ex.ph] ?? 'practice',
    order: ex.o,
    durationSec: Math.round(ex.d * durationScale),
    reps: 0,
    notes: '',
  }));
}

const DURATION_SCALE: Record<'15' | '30' | '45', number> = {
  '15': 0.5,
  '30': 1.0,
  '45': 1.5,
};

/** Group flat session array into weeks of sessionsPerWeek days each. */
function groupIntoWeeks(sessions: GmbSession[], sessionsPerWeek: number, durationScale: number): ProgramWeekInput[] {
  const weeks: ProgramWeekInput[] = [];
  let weekIdx = 0;
  let dayInWeek = 0;
  let currentWeek: ProgramDayInput[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const exercises = sessionToExercises(session, durationScale);

    // Estimate session duration from exercise times
    const totalSec = session.e.reduce((sum, ex) => sum + Math.round(ex.d * durationScale), 0);
    const durationMin = Math.max(15, Math.min(180, Math.round(totalSec / 60)));

    currentWeek.push({
      dayNumber: dayInWeek + 1,
      label: session.n,
      trainingType: 'gmb',
      durationMin,
      loadScore: 3.0,
      nutritionDay: 'performance',
      notes: '',
      sessionExercises: exercises,
    });

    dayInWeek++;

    if (dayInWeek >= sessionsPerWeek || i === sessions.length - 1) {
      weekIdx++;
      weeks.push({
        weekNumber: weekIdx,
        label: `Week ${weekIdx}`,
        isDeload: weekIdx % 4 === 0,
        volumeScale: weekIdx % 4 === 0 ? 0.7 : 1.0,
        intensityScale: 1.0,
        days: currentWeek,
      });
      currentWeek = [];
      dayInWeek = 0;
    }
  }

  return weeks;
}

export type GmbTrack = 'standard' | 'accelerated';
export type GmbDuration = '15' | '30' | '45';

/** Build a CreateProgramRequest from GMB session data. */
export async function buildGmbProgram(
  track: GmbTrack,
  duration: GmbDuration,
): Promise<CreateProgramRequest> {
  const data = await fetchGmbData();
  const sessions = track === 'standard' ? data.standard : data.accelerated;
  const scale = DURATION_SCALE[duration];
  const weeks = groupIntoWeeks(sessions, 3, scale);

  const trackLabel = track === 'standard' ? 'Standard' : 'Accelerated';
  const durationLabel = duration === '15' ? '15-min' : duration === '30' ? '30-min' : '45-min';

  return {
    name: `GMB Elements — ${trackLabel} Track (${durationLabel})`,
    description: `GMB Elements ${trackLabel} Track. ${sessions.length} sessions grouped into ${weeks.length} weeks, ${duration}-minute sessions. Covers Bear, Monkey, Frogger, Crab, A-Frame and more across Prepare / Practice / Push / Ponder phases.`,
    durationWeeks: weeks.length,
    trainingDaysPerWeek: 3,
    difficulty: track === 'standard' ? 'beginner' : 'intermediate',
    focus: 'general',
    equipment: ['bodyweight'],
    tags: ['gmb', 'elements', 'movement', track],
    weeks,
  };
}
