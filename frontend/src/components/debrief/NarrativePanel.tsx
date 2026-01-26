import { useState, useEffect } from 'react';
import type { DebriefNarrative } from '../../api/types';

interface NarrativePanelProps {
  narrative: DebriefNarrative;
  onDateClick?: (date: string) => void;
}

/**
 * Displays the LLM-generated narrative with typewriter effect on first view.
 * Dates mentioned in the narrative are clickable for deep linking.
 */
export function NarrativePanel({ narrative, onDateClick }: NarrativePanelProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Check if we should animate (only on first view of new week)
    const lastSeenKey = 'lastSeenDebriefWeek';
    const currentWeek = new Date().toISOString().slice(0, 10);
    const lastSeen = localStorage.getItem(lastSeenKey);

    if (lastSeen === currentWeek) {
      // Already seen this week, show immediately
      setDisplayedText(narrative.text);
      setIsAnimating(false);
      return;
    }

    // Typewriter effect
    let index = 0;
    const interval = setInterval(() => {
      if (index < narrative.text.length) {
        setDisplayedText(narrative.text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        localStorage.setItem(lastSeenKey, currentWeek);
      }
    }, 15); // ~65 chars per second

    return () => clearInterval(interval);
  }, [narrative.text]);

  // Parse text to make dates clickable
  const renderTextWithLinks = (text: string) => {
    // Match day names like "Monday", "Tuesday", etc.
    const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/g;
    const parts = text.split(dayPattern);

    return parts.map((part, index) => {
      if (dayPattern.test(part)) {
        return (
          <button
            key={index}
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            onClick={() => onDateClick?.(part)}
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Weekly Analysis</h3>
        <div className="flex items-center gap-2">
          {narrative.generatedByLlm ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              AI Generated
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
              Summary
            </span>
          )}
        </div>
      </div>

      {/* Narrative text */}
      <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
        {renderTextWithLinks(displayedText)}
        {isAnimating && <span className="animate-pulse">|</span>}
      </div>

      {/* Tip for clickable dates */}
      {onDateClick && !isAnimating && (
        <p className="mt-4 text-xs text-slate-500">
          Click on day names to view detailed data.
        </p>
      )}
    </div>
  );
}
