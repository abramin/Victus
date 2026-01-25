import type { Archetype, ArchetypeConfig } from '../../api/types';

interface ArchetypeSelectorProps {
  archetypes: ArchetypeConfig[];
  value: Archetype | null;
  onChange: (archetype: Archetype) => void;
  disabled?: boolean;
}

const ARCHETYPE_ICONS: Record<Archetype, string> = {
  push: '💪',
  pull: '🦾',
  legs: '🦵',
  upper: '👕',
  lower: '👖',
  full_body: '🏋️',
  cardio_impact: '🏃',
  cardio_low: '🚴',
};

const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  push: 'Chest, shoulders, triceps',
  pull: 'Back, biceps, rear delts',
  legs: 'Quads, glutes, hamstrings',
  upper: 'Upper body compound',
  lower: 'Lower body compound',
  full_body: 'All major muscle groups',
  cardio_impact: 'Running, jumping',
  cardio_low: 'Cycling, rowing',
};

export function ArchetypeSelector({
  archetypes,
  value,
  onChange,
  disabled = false,
}: ArchetypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">
        Focus Area
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {archetypes.map((archetype) => {
          const isSelected = value === archetype.name;
          const icon = ARCHETYPE_ICONS[archetype.name] ?? '🏃';
          const description = ARCHETYPE_DESCRIPTIONS[archetype.name] ?? '';

          return (
            <button
              key={archetype.name}
              type="button"
              onClick={() => onChange(archetype.name)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${
                  isSelected
                    ? 'bg-white/10 border-white text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                }
              `}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-medium">{archetype.displayName}</span>
              <span className="text-xs text-gray-500 text-center leading-tight">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
