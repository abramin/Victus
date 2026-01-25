import { motion, AnimatePresence } from 'framer-motion';
import type { FastingProtocol } from '../../api/types';
import { EatingWindowSlider } from './EatingWindowSlider';

const PROTOCOL_WINDOW_MINUTES: Record<FastingProtocol, number> = {
  standard: 12 * 60,  // 720
  '16_8': 8 * 60,     // 480
  '20_4': 4 * 60,     // 240
};

export interface FastingProtocolOption {
  value: FastingProtocol;
  label: string;
  description: string;
  skippedMeals: ('breakfast' | 'lunch')[];
  defaultWindowStart: string;
  defaultWindowEnd: string;
}

export const FASTING_PROTOCOL_OPTIONS: FastingProtocolOption[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: '3 meals/day',
    skippedMeals: [],
    defaultWindowStart: '08:00',
    defaultWindowEnd: '20:00',
  },
  {
    value: '16_8',
    label: '16:8 Leangains',
    description: 'Skip breakfast',
    skippedMeals: ['breakfast'],
    defaultWindowStart: '12:00',
    defaultWindowEnd: '20:00',
  },
  {
    value: '20_4',
    label: '20:4 Warrior',
    description: 'Skip breakfast + lunch',
    skippedMeals: ['breakfast', 'lunch'],
    defaultWindowStart: '17:00',
    defaultWindowEnd: '21:00',
  },
];

interface FastingProtocolSelectorProps {
  protocol: FastingProtocol;
  eatingWindowStart: string;
  eatingWindowEnd: string;
  onProtocolChange: (protocol: FastingProtocol) => void;
  onWindowChange: (start: string, end: string) => void;
}

export function FastingProtocolSelector({
  protocol,
  eatingWindowStart,
  onProtocolChange,
  onWindowChange,
}: FastingProtocolSelectorProps) {
  const handleProtocolChange = (newProtocol: FastingProtocol) => {
    if (newProtocol === protocol) return;

    // Find the new protocol's defaults
    const option = FASTING_PROTOCOL_OPTIONS.find(o => o.value === newProtocol);
    if (option) {
      // Update eating window to protocol defaults
      onWindowChange(option.defaultWindowStart, option.defaultWindowEnd);
    }

    onProtocolChange(newProtocol);
  };

  const showCaloriesBanked = protocol !== 'standard';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">Fasting Protocol</label>
      </div>

      {/* Protocol Chips */}
      <div className="flex gap-2" role="radiogroup" aria-label="Fasting Protocol">
        {FASTING_PROTOCOL_OPTIONS.map((option) => {
          const isSelected = protocol === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleProtocolChange(option.value)}
              whileTap={{ scale: 0.98 }}
              className={`
                flex-1 px-3 py-3 rounded-lg border-2 transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
                ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/60 text-white'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800/70 hover:border-slate-600'
                }
              `}
            >
              <div className="text-center">
                <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {option.label}
                </div>
                <div className={`text-xs mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {option.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Helper Text for Calorie Redistribution */}
      <AnimatePresence>
        {showCaloriesBanked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/30 border border-emerald-800/30 rounded-lg">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-emerald-300">
                {protocol === '16_8'
                  ? 'Calories from Breakfast will be reallocated to Lunch & Dinner'
                  : 'Calories from Breakfast & Lunch will be reallocated to Dinner'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Eating Window Slider */}
      <AnimatePresence>
        {protocol !== 'standard' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <EatingWindowSlider
              windowDurationMinutes={PROTOCOL_WINDOW_MINUTES[protocol]}
              startTime={eatingWindowStart}
              onStartTimeChange={onWindowChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
