import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSemanticDetection } from './useSemanticDetection';
import { SemanticToken } from './semanticDictionary';

interface SemanticHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  onTokensChange?: (tokens: SemanticToken[]) => void;
}

/**
 * A textarea component that highlights semantic tokens (body parts and symptoms).
 * Uses an overlay technique to show highlights while maintaining native textarea behavior.
 */
export function SemanticHighlighter({
  value,
  onChange,
  placeholder = 'How did it feel? Any observations...',
  disabled = false,
  className = '',
  rows = 2,
  onTokensChange,
}: SemanticHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const { tokens, hasDetections } = useSemanticDetection(value);

  // Notify parent of token changes
  useEffect(() => {
    onTokensChange?.(tokens);
  }, [tokens, onTokensChange]);

  // Sync scroll position between textarea and overlay
  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Build highlighted text with spans
  const renderHighlightedText = () => {
    if (!value || tokens.length === 0) {
      return value;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    tokens.forEach((token, i) => {
      // Add text before this token
      if (token.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>{value.substring(lastIndex, token.startIndex)}</span>,
        );
      }

      // Add highlighted token
      const highlightClass =
        token.type === 'bodyPart'
          ? 'bg-blue-500/30 text-blue-300 rounded px-0.5'
          : 'bg-yellow-500/30 text-yellow-300 rounded px-0.5';

      parts.push(
        <span key={`token-${i}`} className={highlightClass} data-token-type={token.type}>
          {value.substring(token.startIndex, token.endIndex)}
        </span>,
      );

      lastIndex = token.endIndex;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(<span key="text-end">{value.substring(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Highlight overlay - positioned behind textarea */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words p-2 text-sm font-mono leading-relaxed text-transparent"
        style={{
          // Match textarea styling exactly
          lineHeight: '1.5rem',
        }}
        aria-hidden="true"
      >
        {renderHighlightedText()}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`
          relative w-full resize-none rounded-lg p-2 text-sm font-mono leading-relaxed
          bg-transparent text-white placeholder-gray-500
          border transition-colors
          ${isFocused ? 'border-emerald-500/50' : 'border-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-1 focus:ring-emerald-500/30
        `}
        style={{
          // Ensure text is visible on top of overlay
          caretColor: 'white',
          lineHeight: '1.5rem',
          // Make background slightly visible for contrast
          backgroundColor: 'rgba(30, 30, 30, 0.5)',
        }}
      />

      {/* Detection indicator */}
      {hasDetections && !disabled && (
        <div className="absolute right-2 top-2 flex items-center gap-1.5 pointer-events-none">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800/80 text-[10px] uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-gray-400">Body</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800/80 text-[10px] uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-gray-400">Symptom</span>
          </div>
        </div>
      )}
    </div>
  );
}
