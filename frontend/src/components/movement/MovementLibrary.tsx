import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GMBSession, GMBExercise, SessionPhase, SessionExercise, CalisthenicsSession } from '../../api/types';
import { generateGMBSession, generateCalisthenicsSession } from '../../api/client';
import { GmbSessionRunner } from '../training-programs/GmbSessionRunner';
import { CalimoveSessionRunner } from '../training-programs/CalimoveSessionRunner';
import type { SessionResult } from '../training-programs/ActiveSessionView';
import type { GmbCheckpoint } from '../training-programs/gmbCheckpoint';
import { loadCheckpoint, clearCheckpoint } from '../training-programs/gmbCheckpoint';
import type { CalimoveCheckpoint } from '../training-programs/calimoveCheckpoint';
import { loadCalimoveCheckpoint, clearCalimoveCheckpoint } from '../training-programs/calimoveCheckpoint';

// ─── helpers ────────────────────────────────────────────────────────────────

const THEMES = [
  'Bear & Monkey',
  'Frogger & Squat',
  'Crab & Floating Table',
  'A-Frame & Bear',
  'Spiderman & Monkey',
  'Monkey & Frogger',
  'Bear & Crab',
  'Full Locomotion Mix',
  'Floor Loco Mix',
  'Rolls & Flow',
];

function nameToId(name: string): string {
  return (
    'gmb_' +
    name
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
  );
}

type PhaseKey = 'PREPARE' | 'PRACTICE' | 'PLAY' | 'PUSH' | 'PONDER';
const PHASE_ORDER: PhaseKey[] = ['PREPARE', 'PRACTICE', 'PLAY', 'PUSH', 'PONDER'];

const CATEGORY_EMOJI: Record<string, string> = {
  locomotion: '🐻',
  push: '💪',
  pull: '🏋️',
  legs: '🦵',
  core: '🎯',
  skill: '🤸',
  power: '⚡',
  mobility: '🧘',
  stretch: '🌊',
  balance: '⚖️',
};

function getCategoryEmoji(category: string | undefined): string {
  return CATEGORY_EMOJI[category?.toLowerCase() ?? ''] ?? '🤸';
}

const PATTERN_EMOJI: Record<string, string> = {
  push: '💪',
  pull: '🏋️',
  squat: '🦵',
  hinge: '🍑',
  core: '🎯',
  isometric_upper: '🤲',
  isometric_lower: '🧘',
  isometric_core: '⬜',
};

function getPatternEmoji(pattern: string): string {
  return PATTERN_EMOJI[pattern] ?? '🤸';
}

const PHASE_META: Record<
  PhaseKey,
  {
    sessionPhase: SessionPhase;
    label: string;
    accent: string;
    dot: string;
    border: string;
    borderSolid: string;
    bg: string;
    tagBg: string;
    tagText: string;
  }
> = {
  PREPARE: {
    sessionPhase: 'prepare',
    label: 'Prepare',
    accent: 'text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-500/25',
    borderSolid: 'border-l-amber-500',
    bg: 'bg-amber-500/8',
    tagBg: 'bg-amber-500/15',
    tagText: 'text-amber-400',
  },
  PRACTICE: {
    sessionPhase: 'practice',
    label: 'Practice',
    accent: 'text-teal-400',
    dot: 'bg-teal-500',
    border: 'border-teal-500/25',
    borderSolid: 'border-l-teal-500',
    bg: 'bg-teal-500/8',
    tagBg: 'bg-teal-500/15',
    tagText: 'text-teal-400',
  },
  PLAY: {
    sessionPhase: 'play',
    label: 'Play',
    accent: 'text-orange-400',
    dot: 'bg-orange-500',
    border: 'border-orange-500/25',
    borderSolid: 'border-l-orange-500',
    bg: 'bg-orange-500/8',
    tagBg: 'bg-orange-500/15',
    tagText: 'text-orange-400',
  },
  PUSH: {
    sessionPhase: 'push',
    label: 'Push',
    accent: 'text-violet-400',
    dot: 'bg-violet-500',
    border: 'border-violet-500/25',
    borderSolid: 'border-l-violet-500',
    bg: 'bg-violet-500/8',
    tagBg: 'bg-violet-500/15',
    tagText: 'text-violet-400',
  },
  PONDER: {
    sessionPhase: 'ponder',
    label: 'Ponder',
    accent: 'text-blue-400',
    dot: 'bg-blue-500',
    border: 'border-blue-500/25',
    borderSolid: 'border-l-blue-500',
    bg: 'bg-blue-500/8',
    tagBg: 'bg-blue-500/15',
    tagText: 'text-blue-400',
  },
};

function fmtSecs(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function sessionToExercises(session: GMBSession): SessionExercise[] {
  const result: SessionExercise[] = [];
  for (const phaseKey of PHASE_ORDER) {
    const exs = session.phases[phaseKey] ?? [];
    exs.forEach((ex) => {
      result.push({
        exerciseId: nameToId(ex.name),
        phase: PHASE_META[phaseKey].sessionPhase,
        order: ex.order,
        durationSec: ex.durationSecs,
        reps: 0,
        notes: ex.description ?? '',
      });
    });
  }
  return result;
}

// ─── GMB sub-components ──────────────────────────────────────────────────────

function ExerciseCard({
  ex,
  phaseKey,
  onSelect,
}: {
  ex: GMBExercise;
  phaseKey: PhaseKey;
  onSelect: () => void;
}) {
  const meta = PHASE_META[phaseKey];
  const emoji = getCategoryEmoji(ex.category);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border border-slate-700/40 bg-slate-800/50
                   hover:bg-slate-700/40 transition-colors cursor-pointer border-l-4 ${meta.borderSolid}`}
      onMouseEnter={onSelect}
      onClick={onSelect}
    >
      <div className="w-12 h-12 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-xl">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-medium text-slate-200 leading-snug">{ex.name}</p>
          <span className={`text-sm px-2 py-0.5 rounded-full font-mono flex-shrink-0 ${meta.tagBg} ${meta.tagText}`}>
            {fmtSecs(ex.durationSecs)}
          </span>
        </div>
        {ex.description && (
          <p className="text-[15px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{ex.description}</p>
        )}
      </div>
    </div>
  );
}

function PhaseSection({
  phaseKey,
  exercises,
  onSelectExercise,
}: {
  phaseKey: PhaseKey;
  exercises: GMBExercise[];
  onSelectExercise: (ex: GMBExercise, pk: PhaseKey) => void;
}) {
  if (exercises.length === 0) return null;
  const meta = PHASE_META[phaseKey];

  return (
    <div className={`rounded-xl ${meta.bg} p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className={`text-sm font-bold tracking-wider uppercase ${meta.accent}`}>{meta.label}</span>
        <span className="text-xs text-slate-500">{exercises.length}</span>
      </div>
      <div className="space-y-2">
        {exercises.map((ex) => (
          <ExerciseCard
            key={`${phaseKey}-${ex.order}`}
            ex={ex}
            phaseKey={phaseKey}
            onSelect={() => onSelectExercise(ex, phaseKey)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionSummaryPanel({ session, totalExercises }: { session: GMBSession; totalExercises: number }) {
  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-white">{session.theme}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Level</p>
          <p className="text-sm font-medium text-slate-200 capitalize mt-0.5">{session.level}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Duration</p>
          <p className="text-sm font-medium text-slate-200 mt-0.5">{session.targetDuration}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Exercises</p>
          <p className="text-sm font-medium text-slate-200 mt-0.5">{totalExercises}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Est. Time</p>
          <p className="text-sm font-medium text-slate-200 mt-0.5">~{session.totalTimeEst}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PHASE_ORDER.map((pk) => {
          const count = session.phases[pk]?.length ?? 0;
          if (count === 0) return null;
          const meta = PHASE_META[pk];
          return (
            <span key={pk} className={`text-xs px-2 py-1 rounded-full font-medium ${meta.tagBg} ${meta.tagText}`}>
              {meta.label} {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ExercisePreviewPanel({ ex, phaseKey }: { ex: GMBExercise; phaseKey: PhaseKey }) {
  const meta = PHASE_META[phaseKey];
  const emoji = getCategoryEmoji(ex.category);

  return (
    <div className="border-t border-slate-800 pt-4 space-y-3">
      <div className="w-full h-32 rounded-lg bg-slate-700/40 flex items-center justify-center text-4xl">{emoji}</div>
      <div>
        <p className="text-base font-semibold text-slate-200">{ex.name}</p>
        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.tagBg} ${meta.tagText}`}>
          {meta.label}
        </span>
      </div>
      {ex.description && <p className="text-[15px] text-slate-400 leading-relaxed">{ex.description}</p>}
      <p className="text-sm text-slate-300 font-mono">{fmtSecs(ex.durationSecs)}</p>
    </div>
  );
}

// ─── Calisthenics preview sub-components ────────────────────────────────────

function CalisthenicsExerciseCard({ ex }: { ex: CalisthenicsSession['exercises'][number] }) {
  const typeIsometric = ex.type === 'isometric';
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-700/40 bg-slate-800/50 border-l-4 border-l-emerald-600">
      <div className="w-12 h-12 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-xl">
        {getPatternEmoji(ex.pattern)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-medium text-slate-200 leading-snug">{ex.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {ex.sets && (
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-900/30 text-emerald-400">
                {ex.sets}×
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-700 text-slate-300">
              {ex.reps}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeIsometric ? 'bg-blue-900/30 text-blue-400' : 'bg-violet-900/30 text-violet-400'}`}>
            {typeIsometric ? 'isometric' : 'strength'}
          </span>
          {ex.muscles.primary.map((m) => (
            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
              {m.replace(/_/g, ' ')}
            </span>
          ))}
          {ex.assisted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">assisted</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CalisthenicsSummaryPanel({ session }: { session: CalisthenicsSession }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-base font-semibold text-white">
          {session.sessionType === 'isometric' ? 'Isometric Session' : 'Strength Session'}
        </p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
          session.sessionType === 'isometric'
            ? 'bg-blue-900/40 text-blue-400 border-blue-500/40'
            : 'bg-emerald-900/40 text-emerald-400 border-emerald-500/40'
        }`}>
          {session.sessionType === 'isometric' ? 'HOLD' : 'SETS'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Level</p>
          <p className="text-sm font-medium text-slate-200 mt-0.5">{session.level}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Exercises</p>
          <p className="text-sm font-medium text-slate-200 mt-0.5">{session.exerciseCount}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 col-span-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Rest Between Exercises</p>
          <p className="text-sm font-medium text-slate-200 mt-0.5">{session.restBetweenExercises}</p>
        </div>
      </div>
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

type WorkoutType = 'gmb' | 'calisthenics';

export function MovementLibrary() {
  const [workoutType, setWorkoutType] = useState<WorkoutType>('gmb');

  // GMB state
  const [gmbLevel, setGmbLevel] = useState<'standard' | 'accelerated'>('standard');
  const [duration, setDuration] = useState<15 | 30 | 45>(30);
  const [focus, setFocus] = useState('');
  const [gmbSession, setGmbSession] = useState<GMBSession | null>(null);
  const [activeGmbSession, setActiveGmbSession] = useState<SessionExercise[] | null>(null);
  const [checkpoint, setCheckpoint] = useState<GmbCheckpoint | null>(() => loadCheckpoint());
  const [resumeFrom, setResumeFrom] = useState<GmbCheckpoint | undefined>(undefined);
  const [previewExercise, setPreviewExercise] = useState<{ ex: GMBExercise; phaseKey: PhaseKey } | null>(null);

  // Calisthenics state
  const [caliLevel, setCaliLevel] = useState<'1' | '2'>('1');
  const [exerciseCount, setExerciseCount] = useState<3 | 4 | 5>(4);
  const [caliSession, setCaliSession] = useState<CalisthenicsSession | null>(null);
  const [activeCaliSession, setActiveCaliSession] = useState<CalisthenicsSession | null>(null);
  const [caliCheckpoint, setCaliCheckpoint] = useState<CalimoveCheckpoint | null>(() => loadCalimoveCheckpoint());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  // ── GMB handlers ────────────────────────────────────────────────────────────

  const handleGmbGenerate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    setPreviewExercise(null);
    try {
      const result = await generateGMBSession(gmbLevel, focus, duration, undefined, controller.signal);
      setGmbSession(result);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to generate session');
      }
    } finally {
      setLoading(false);
    }
  }, [gmbLevel, focus, duration]);

  const handleStartGmbSession = useCallback(() => {
    if (!gmbSession) return;
    setActiveGmbSession(sessionToExercises(gmbSession));
  }, [gmbSession]);

  const handleGmbComplete = useCallback((_result: SessionResult) => {
    setActiveGmbSession(null);
    setResumeFrom(undefined);
    setCheckpoint(null);
  }, []);

  const handleGmbAbort = useCallback(() => {
    setActiveGmbSession(null);
    setResumeFrom(undefined);
    setCheckpoint(loadCheckpoint());
  }, []);

  const handleContinueCheckpoint = useCallback(() => {
    if (!checkpoint) return;
    setActiveGmbSession(checkpoint.exercises);
    setResumeFrom(checkpoint);
  }, [checkpoint]);

  const handleDiscardCheckpoint = useCallback(() => {
    clearCheckpoint();
    setCheckpoint(null);
  }, []);

  const gmbTotalExercises = gmbSession
    ? PHASE_ORDER.reduce((s, p) => s + (gmbSession.phases[p]?.length ?? 0), 0)
    : 0;

  // ── Calisthenics handlers ────────────────────────────────────────────────────

  const handleCaliGenerate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await generateCalisthenicsSession(caliLevel, exerciseCount, undefined, controller.signal);
      setCaliSession(result);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to generate session');
      }
    } finally {
      setLoading(false);
    }
  }, [caliLevel, exerciseCount]);

  const handleStartCaliSession = useCallback(() => {
    if (!caliSession) return;
    setActiveCaliSession(caliSession);
  }, [caliSession]);

  const handleCaliComplete = useCallback(() => {
    setActiveCaliSession(null);
    setCaliCheckpoint(null);
  }, []);

  const handleCaliAbort = useCallback(() => {
    setActiveCaliSession(null);
    setCaliCheckpoint(loadCalimoveCheckpoint());
  }, []);

  const handleContinueCaliCheckpoint = useCallback(() => {
    if (!caliCheckpoint) return;
    setActiveCaliSession(caliCheckpoint.session);
  }, [caliCheckpoint]);

  const handleDiscardCaliCheckpoint = useCallback(() => {
    clearCalimoveCheckpoint();
    setCaliCheckpoint(null);
  }, []);

  // ── Active session overlays ──────────────────────────────────────────────────

  if (activeGmbSession) {
    return (
      <GmbSessionRunner
        exercises={activeGmbSession}
        onComplete={handleGmbComplete}
        onAbort={handleGmbAbort}
        resumeFrom={resumeFrom}
      />
    );
  }

  if (activeCaliSession) {
    return (
      <CalimoveSessionRunner
        session={activeCaliSession}
        onComplete={handleCaliComplete}
        onAbort={handleCaliAbort}
        resumeFrom={caliCheckpoint ?? undefined}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-0 overflow-hidden">
      {/* ── Workout type tab bar ── */}
      <div className="flex items-center gap-0 px-4 pt-3 pb-0 border-b border-slate-800 flex-shrink-0">
        {(['gmb', 'calisthenics'] as WorkoutType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => { setWorkoutType(type); setError(''); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              workoutType === type
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {type === 'gmb' ? 'GMB Elements' : 'Calisthenics'}
          </button>
        ))}
      </div>

      {/* ── GMB Controls bar ── */}
      {workoutType === 'gmb' && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 flex-shrink-0 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
            {(['standard', 'accelerated'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setGmbLevel(l)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  gmbLevel === l ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {l === 'standard' ? 'Standard' : 'Accelerated'}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
            {([15, 30, 45] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  duration === d ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {d}m
              </button>
            ))}
          </div>

          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            aria-label="Session theme"
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5
                       focus:outline-none focus:border-slate-500 flex-shrink-0"
          >
            <option value="">Random theme</option>
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGmbGenerate}
            disabled={loading}
            className="ml-auto px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50
                       text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}

      {/* ── Calisthenics Controls bar ── */}
      {workoutType === 'calisthenics' && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 flex-shrink-0 flex-wrap">
          {/* Level toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
            {(['1', '2'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setCaliLevel(l)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  caliLevel === l ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Level {l}
              </button>
            ))}
          </div>

          {/* Exercise count */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
            {([3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setExerciseCount(n)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  exerciseCount === n ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {n} ex
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCaliGenerate}
            disabled={loading}
            className="ml-auto px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50
                       text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}

      {/* ── GMB checkpoint resume ── */}
      {workoutType === 'gmb' && checkpoint && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-900/20 border-b border-emerald-800/30 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-300">Session in progress</p>
            <p className="text-xs text-slate-400">
              {checkpoint.completedExercises.length}/{checkpoint.exercises.length} exercises · {checkpoint.durationChoice}min
            </p>
          </div>
          <button type="button" onClick={handleContinueCheckpoint}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
            Continue
          </button>
          <button type="button" onClick={handleDiscardCheckpoint}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors" aria-label="Discard session">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Calimove checkpoint resume ── */}
      {workoutType === 'calisthenics' && caliCheckpoint && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-900/20 border-b border-emerald-800/30 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-300">Session in progress</p>
            <p className="text-xs text-slate-400">
              Exercise {caliCheckpoint.currentExerciseIndex + 1}/{caliCheckpoint.session.exerciseCount} · Level {caliCheckpoint.session.level}
            </p>
          </div>
          <button type="button" onClick={handleContinueCaliCheckpoint}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
            Continue
          </button>
          <button type="button" onClick={handleDiscardCaliCheckpoint}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors" aria-label="Discard session">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p className="text-red-400 text-xs px-4 py-2 flex-shrink-0 border-b border-slate-800">{error}</p>
      )}

      {/* ── GMB Content ── */}
      {workoutType === 'gmb' && (
        <AnimatePresence mode="wait">
          {gmbSession ? (
            <motion.div
              key="gmb-session"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 overflow-hidden"
            >
              <div className="h-full flex flex-col lg:flex-row">
                <div className="flex-1 lg:w-[62%] lg:flex-none overflow-y-auto p-4 space-y-3">
                  {PHASE_ORDER.map((phaseKey) => (
                    <PhaseSection
                      key={phaseKey}
                      phaseKey={phaseKey}
                      exercises={gmbSession.phases[phaseKey] ?? []}
                      onSelectExercise={(ex, pk) => setPreviewExercise({ ex, phaseKey: pk })}
                    />
                  ))}
                </div>
                <div className="lg:w-[38%] lg:flex-none border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col gap-5 lg:sticky lg:top-0 lg:self-start lg:max-h-full lg:overflow-y-auto">
                  <SessionSummaryPanel session={gmbSession} totalExercises={gmbTotalExercises} />
                  {previewExercise && (
                    <ExercisePreviewPanel ex={previewExercise.ex} phaseKey={previewExercise.phaseKey} />
                  )}
                  <button
                    type="button"
                    onClick={handleStartGmbSession}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-lg font-bold
                               rounded-xl shadow-lg shadow-emerald-900/30 text-white transition-colors
                               flex items-center justify-center gap-2 mt-auto"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start Session
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="gmb-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-emerald-500" />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <span className="text-3xl">🤸</span>
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">Ready to move</p>
                    <p className="text-slate-500 text-sm mt-1">Pick a track, duration, and theme — then generate your session.</p>
                  </div>
                  <button type="button" onClick={handleGmbGenerate}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                    Generate Session
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Calisthenics Content ── */}
      {workoutType === 'calisthenics' && (
        <AnimatePresence mode="wait">
          {caliSession ? (
            <motion.div
              key="cali-session"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 overflow-hidden"
            >
              <div className="h-full flex flex-col lg:flex-row">
                <div className="flex-1 lg:w-[62%] lg:flex-none overflow-y-auto p-4 space-y-3">
                  {caliSession.exercises.map((ex) => (
                    <CalisthenicsExerciseCard key={ex.order} ex={ex} />
                  ))}
                </div>
                <div className="lg:w-[38%] lg:flex-none border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col gap-5 lg:sticky lg:top-0 lg:self-start">
                  <CalisthenicsSummaryPanel session={caliSession} />
                  <button
                    type="button"
                    onClick={handleStartCaliSession}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-lg font-bold
                               rounded-xl shadow-lg shadow-emerald-900/30 text-white transition-colors
                               flex items-center justify-center gap-2 mt-auto"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start Session
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cali-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-emerald-500" />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <span className="text-3xl">💪</span>
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">Ready to train</p>
                    <p className="text-slate-500 text-sm mt-1">Pick a level and exercise count — then generate your session.</p>
                  </div>
                  <button type="button" onClick={handleCaliGenerate}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                    Generate Session
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
