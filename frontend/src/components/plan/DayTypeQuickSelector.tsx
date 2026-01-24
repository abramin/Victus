import { useState, useRef, useEffect } from 'react';
import type { DayType } from '../../api/types';
import { DAY_TYPE_COLORS, DAY_TYPE_OPTIONS } from '../../constants';

interface DayTypeQuickSelectorProps {
  currentType: DayType;
  date: string;
  onSelect: (dayType: DayType) => void;
  disabled?: boolean;
  onDragStart?: (date: string, dayType: DayType) => void;
  onDragEnd?: () => void;
}

/**
 * Inline day type selector that appears as a popover when clicked.
 * Allows quick switching between Performance, Fatburner, and Metabolize.
 */
export function DayTypeQuickSelector({
  currentType,
  date,
  onSelect,
  disabled = false,
  onDragStart,
  onDragEnd,
}: DayTypeQuickSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (dayType: DayType) => {
    if (dayType !== currentType) {
      onSelect(dayType);
    }
    setIsOpen(false);
  };

  const colors = DAY_TYPE_COLORS[currentType];

  // HTML5 drag event handlers
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify({ date, dayType: currentType }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(date, currentType);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Current badge - clickable to open selector, draggable for swapping */}
      <button
        type="button"
        draggable={!disabled}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
          colors.bg
        } text-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:opacity-90'
        }`}
        title={disabled ? 'Cannot edit past days' : 'Click to change, drag to swap'}
      >
        {/* Drag handle indicator */}
        {!disabled && (
          <svg className="w-2.5 h-2.5 opacity-50" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        )}
        <span className="capitalize">{currentType.slice(0, 4)}</span>
        {!disabled && (
          <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Popover dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
          {DAY_TYPE_OPTIONS.map((option) => {
            const isSelected = option.value === currentType;
            const optColors = DAY_TYPE_COLORS[option.value];

            return (
              <button
                key={option.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.value);
                }}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition ${
                  isSelected
                    ? 'bg-gray-700/50 text-white'
                    : 'text-gray-300 hover:bg-gray-700/30 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${optColors.bg}`} />
                <span>{option.label}</span>
                {isSelected && (
                  <svg className="w-4 h-4 ml-auto text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
