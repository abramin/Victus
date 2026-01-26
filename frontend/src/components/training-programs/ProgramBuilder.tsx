import { useState, useMemo } from 'react';
import type {
  CreateProgramRequest,
  ProgramDifficulty,
  ProgramFocus,
  EquipmentType,
  ProgramWeekInput,
  ProgramDayInput,
  TrainingType,
  DayType,
} from '../../api/types';
import { createTrainingProgram } from '../../api/client';
import { TRAINING_LABELS, TRAINING_ICONS } from '../../constants';
import { DIFFICULTY_COLORS, FOCUS_COLORS, EQUIPMENT_CONFIG } from './constants';

interface ProgramBuilderProps {
  onClose: () => void;
  onCreated: (programId: number) => void;
}

type Step = 'basics' | 'weeks' | 'days' | 'review';

const STEPS: { key: Step; label: string }[] = [
  { key: 'basics', label: 'Basic Info' },
  { key: 'weeks', label: 'Week Structure' },
  { key: 'days', label: 'Training Days' },
  { key: 'review', label: 'Review' },
];

const DEFAULT_WEEK: ProgramWeekInput = {
  weekNumber: 1,
  label: 'Week 1',
  isDeload: false,
  volumeScale: 1.0,
  intensityScale: 1.0,
  days: [],
};

const DEFAULT_DAY: ProgramDayInput = {
  dayNumber: 1,
  label: 'Day 1',
  trainingType: 'strength' as TrainingType,
  durationMin: 60,
  loadScore: 3,
  nutritionDay: 'performance' as DayType,
};

/**
 * Multi-step wizard for creating custom training programs.
 */
export function ProgramBuilder({ onClose, onCreated }: ProgramBuilderProps) {
  const [step, setStep] = useState<Step>('basics');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<ProgramDifficulty>('intermediate');
  const [focus, setFocus] = useState<ProgramFocus>('general');
  const [equipment, setEquipment] = useState<EquipmentType[]>(['barbell', 'dumbbell']);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(4);

  // Week structure
  const [weeks, setWeeks] = useState<ProgramWeekInput[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      ...DEFAULT_WEEK,
      weekNumber: i + 1,
      label: `Week ${i + 1}`,
      isDeload: i === 3, // Default: last week is deload
      volumeScale: i === 3 ? 0.6 : 1.0,
      intensityScale: i === 3 ? 0.7 : 1.0,
      days: [],
    }))
  );

  // Day templates (applied to each non-deload week)
  const [dayTemplates, setDayTemplates] = useState<ProgramDayInput[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      ...DEFAULT_DAY,
      dayNumber: i + 1,
      label: `Day ${i + 1}`,
    }))
  );

  // Update weeks when duration changes
  const updateDuration = (newDuration: number) => {
    setDurationWeeks(newDuration);
    setWeeks((prev) => {
      if (newDuration > prev.length) {
        // Add weeks
        const toAdd = Array.from({ length: newDuration - prev.length }, (_, i) => ({
          ...DEFAULT_WEEK,
          weekNumber: prev.length + i + 1,
          label: `Week ${prev.length + i + 1}`,
          days: [],
        }));
        return [...prev, ...toAdd];
      } else {
        // Remove weeks
        return prev.slice(0, newDuration);
      }
    });
  };

  // Update day templates when training days per week changes
  const updateTrainingDays = (newCount: number) => {
    setTrainingDaysPerWeek(newCount);
    setDayTemplates((prev) => {
      if (newCount > prev.length) {
        const toAdd = Array.from({ length: newCount - prev.length }, (_, i) => ({
          ...DEFAULT_DAY,
          dayNumber: prev.length + i + 1,
          label: `Day ${prev.length + i + 1}`,
        }));
        return [...prev, ...toAdd];
      } else {
        return prev.slice(0, newCount);
      }
    });
  };

  // Toggle equipment
  const toggleEquipment = (eq: EquipmentType) => {
    setEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    );
  };

  // Step navigation
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);
  const canGoNext = () => {
    switch (step) {
      case 'basics':
        return name.trim().length > 0 && equipment.length > 0;
      case 'weeks':
        return weeks.length >= 1;
      case 'days':
        return dayTemplates.length >= 1;
      default:
        return true;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex].key);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].key);
    }
  };

  // Build final request
  const buildRequest = useMemo((): CreateProgramRequest => {
    // Apply day templates to each week
    const weeksWithDays = weeks.map((week) => ({
      ...week,
      days: week.isDeload
        ? dayTemplates.slice(0, Math.ceil(trainingDaysPerWeek / 2)).map((d, i) => ({
            ...d,
            dayNumber: i + 1,
            durationMin: Math.round(d.durationMin * 0.7),
            loadScore: Math.max(1, d.loadScore - 1),
          }))
        : dayTemplates.map((d, i) => ({ ...d, dayNumber: i + 1 })),
    }));

    return {
      name: name.trim(),
      description: description.trim() || undefined,
      durationWeeks,
      trainingDaysPerWeek,
      difficulty,
      focus,
      equipment,
      tags: [],
      weeks: weeksWithDays,
    };
  }, [name, description, durationWeeks, trainingDaysPerWeek, difficulty, focus, equipment, weeks, dayTemplates]);

  // Submit
  const handleSubmit = async () => {
    setCreating(true);
    setError(null);

    try {
      const program = await createTrainingProgram(buildRequest);
      onCreated(program.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-xl border border-slate-800 shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Create Program</h2>
            <div className="flex items-center gap-2 mt-2">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      i <= currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        i < currentStepIndex ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {step === 'basics' && (
            <BasicsStep
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              focus={focus}
              setFocus={setFocus}
              equipment={equipment}
              toggleEquipment={toggleEquipment}
              durationWeeks={durationWeeks}
              setDurationWeeks={updateDuration}
              trainingDaysPerWeek={trainingDaysPerWeek}
              setTrainingDaysPerWeek={updateTrainingDays}
            />
          )}

          {step === 'weeks' && (
            <WeeksStep weeks={weeks} setWeeks={setWeeks} />
          )}

          {step === 'days' && (
            <DaysStep dayTemplates={dayTemplates} setDayTemplates={setDayTemplates} />
          )}

          {step === 'review' && (
            <ReviewStep request={buildRequest} />
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800">
          <button
            onClick={currentStepIndex === 0 ? onClose : goBack}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-3">
            {step === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={creating}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                           font-medium transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Program'}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                           font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Basic Info
interface BasicsStepProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  difficulty: ProgramDifficulty;
  setDifficulty: (v: ProgramDifficulty) => void;
  focus: ProgramFocus;
  setFocus: (v: ProgramFocus) => void;
  equipment: EquipmentType[];
  toggleEquipment: (eq: EquipmentType) => void;
  durationWeeks: number;
  setDurationWeeks: (v: number) => void;
  trainingDaysPerWeek: number;
  setTrainingDaysPerWeek: (v: number) => void;
}

function BasicsStep({
  name,
  setName,
  description,
  setDescription,
  difficulty,
  setDifficulty,
  focus,
  setFocus,
  equipment,
  toggleEquipment,
  durationWeeks,
  setDurationWeeks,
  trainingDaysPerWeek,
  setTrainingDaysPerWeek,
}: BasicsStepProps) {
  const difficulties: ProgramDifficulty[] = ['beginner', 'intermediate', 'advanced'];
  const focuses: ProgramFocus[] = ['hypertrophy', 'strength', 'conditioning', 'general'];
  const equipmentTypes: EquipmentType[] = ['barbell', 'dumbbell', 'kettlebell', 'machine', 'cables', 'bodyweight', 'bands'];

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Program Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Upper/Lower Split"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                     text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the program..."
          rows={2}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                     text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                     resize-none"
        />
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Difficulty</label>
        <div className="flex gap-2">
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                difficulty === d
                  ? `${DIFFICULTY_COLORS[d].bg} ${DIFFICULTY_COLORS[d].text}`
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {DIFFICULTY_COLORS[d].label}
            </button>
          ))}
        </div>
      </div>

      {/* Focus */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Training Focus</label>
        <div className="flex flex-wrap gap-2">
          {focuses.map((f) => (
            <button
              key={f}
              onClick={() => setFocus(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                focus === f
                  ? `${FOCUS_COLORS[f].bg} ${FOCUS_COLORS[f].text}`
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {FOCUS_COLORS[f].icon} {FOCUS_COLORS[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Equipment</label>
        <div className="flex flex-wrap gap-2">
          {equipmentTypes.map((eq) => (
            <button
              key={eq}
              onClick={() => toggleEquipment(eq)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                equipment.includes(eq)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {EQUIPMENT_CONFIG[eq]?.icon} {EQUIPMENT_CONFIG[eq]?.label || eq}
            </button>
          ))}
        </div>
      </div>

      {/* Duration & Days */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Duration (weeks)</label>
          <select
            value={durationWeeks}
            onChange={(e) => setDurationWeeks(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[4, 6, 8, 10, 12, 16].map((w) => (
              <option key={w} value={w}>{w} weeks</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Days per week</label>
          <select
            value={trainingDaysPerWeek}
            onChange={(e) => setTrainingDaysPerWeek(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// Step 2: Week Structure
interface WeeksStepProps {
  weeks: ProgramWeekInput[];
  setWeeks: React.Dispatch<React.SetStateAction<ProgramWeekInput[]>>;
}

function WeeksStep({ weeks, setWeeks }: WeeksStepProps) {
  const updateWeek = (index: number, updates: Partial<ProgramWeekInput>) => {
    setWeeks((prev) =>
      prev.map((w, i) => (i === index ? { ...w, ...updates } : w))
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 mb-4">
        Configure each week's volume and intensity. Mark deload weeks for recovery.
      </p>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {weeks.map((week, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              week.isDeload
                ? 'bg-emerald-900/20 border-emerald-800/30'
                : 'bg-slate-800/50 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <input
                type="text"
                value={week.label}
                onChange={(e) => updateWeek(index, { label: e.target.value })}
                className="bg-transparent text-white font-medium focus:outline-none border-b border-transparent
                           focus:border-slate-500 transition-colors"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={week.isDeload}
                  onChange={(e) =>
                    updateWeek(index, {
                      isDeload: e.target.checked,
                      volumeScale: e.target.checked ? 0.6 : 1.0,
                      intensityScale: e.target.checked ? 0.7 : 1.0,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500
                             focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                <span className={week.isDeload ? 'text-emerald-400' : 'text-slate-400'}>
                  Deload
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Volume</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.3"
                    max="1.5"
                    step="0.1"
                    value={week.volumeScale}
                    onChange={(e) => updateWeek(index, { volumeScale: parseFloat(e.target.value) })}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-sm text-white w-12 text-right">
                    {(week.volumeScale * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Intensity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.3"
                    max="1.5"
                    step="0.1"
                    value={week.intensityScale}
                    onChange={(e) => updateWeek(index, { intensityScale: parseFloat(e.target.value) })}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-sm text-white w-12 text-right">
                    {(week.intensityScale * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 3: Day Templates
interface DaysStepProps {
  dayTemplates: ProgramDayInput[];
  setDayTemplates: React.Dispatch<React.SetStateAction<ProgramDayInput[]>>;
}

const TRAINING_TYPES: TrainingType[] = [
  'strength', 'calisthenics', 'hiit', 'run', 'row', 'cycle', 'mobility', 'gmb', 'walking', 'qigong'
];

const DAY_TYPES: DayType[] = ['performance', 'fatburner', 'metabolize'];

function DaysStep({ dayTemplates, setDayTemplates }: DaysStepProps) {
  const updateDay = (index: number, updates: Partial<ProgramDayInput>) => {
    setDayTemplates((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 mb-4">
        Define the training days that repeat each week. These will be scaled by the week's volume/intensity.
      </p>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {dayTemplates.map((day, index) => (
          <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">{TRAINING_ICONS[day.trainingType] || '🏋️'}</span>
              <input
                type="text"
                value={day.label}
                onChange={(e) => updateDay(index, { label: e.target.value })}
                className="flex-1 bg-transparent text-white font-medium focus:outline-none border-b
                           border-transparent focus:border-slate-500 transition-colors"
                placeholder="Day name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Training Type</label>
                <select
                  value={day.trainingType}
                  onChange={(e) => updateDay(index, { trainingType: e.target.value as TrainingType })}
                  className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                >
                  {TRAINING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TRAINING_ICONS[t]} {TRAINING_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration</label>
                <select
                  value={day.durationMin}
                  onChange={(e) => updateDay(index, { durationMin: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                >
                  {[30, 45, 60, 75, 90, 120].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Load Score</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => updateDay(index, { loadScore: score })}
                      className={`w-8 h-8 rounded ${
                        day.loadScore >= score
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nutrition Day</label>
                <select
                  value={day.nutritionDay}
                  onChange={(e) => updateDay(index, { nutritionDay: e.target.value as DayType })}
                  className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                >
                  {DAY_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt.charAt(0).toUpperCase() + dt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 4: Review
interface ReviewStepProps {
  request: CreateProgramRequest;
}

function ReviewStep({ request }: ReviewStepProps) {
  const totalSessions = request.weeks.reduce((acc, w) => acc + w.days.length, 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-1">{request.name}</h3>
        {request.description && (
          <p className="text-sm text-slate-400">{request.description}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{request.durationWeeks}</div>
          <div className="text-xs text-slate-400">Weeks</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{request.trainingDaysPerWeek}</div>
          <div className="text-xs text-slate-400">Days/Week</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{totalSessions}</div>
          <div className="text-xs text-slate-400">Total Sessions</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`px-3 py-1 rounded-full text-sm ${DIFFICULTY_COLORS[request.difficulty].bg} ${DIFFICULTY_COLORS[request.difficulty].text}`}>
          {DIFFICULTY_COLORS[request.difficulty].label}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm ${FOCUS_COLORS[request.focus].bg} ${FOCUS_COLORS[request.focus].text}`}>
          {FOCUS_COLORS[request.focus].icon} {FOCUS_COLORS[request.focus].label}
        </span>
        {request.equipment.map((eq) => (
          <span key={eq} className="px-3 py-1 rounded-full text-sm bg-slate-700/50 text-slate-400">
            {EQUIPMENT_CONFIG[eq]?.icon} {EQUIPMENT_CONFIG[eq]?.label || eq}
          </span>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-medium text-white mb-2">Week Structure</h4>
        <div className="flex gap-1">
          {request.weeks.map((week, i) => (
            <div
              key={i}
              className={`flex-1 h-8 rounded flex items-center justify-center text-xs ${
                week.isDeload
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : 'bg-slate-700 text-slate-300'
              }`}
              title={`${week.label}: Vol ${(week.volumeScale * 100).toFixed(0)}%, Int ${(week.intensityScale * 100).toFixed(0)}%`}
            >
              W{i + 1}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-white mb-2">Training Days</h4>
        <div className="space-y-1">
          {request.weeks[0]?.days.map((day, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>{TRAINING_ICONS[day.trainingType] || '🏋️'}</span>
              <span className="text-white">{day.label}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{TRAINING_LABELS[day.trainingType]}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{day.durationMin}min</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
