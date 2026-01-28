import { useState, useEffect, useRef } from 'react';
import { submitSessionEcho } from '../../api/client';
import type { SessionResponse, EchoResponse, EchoResult } from '../../api/types';

interface EchoModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionResponse;
  onSuccess: (result: EchoResponse) => void;
}

type ProcessingState = 'idle' | 'processing' | 'success' | 'error';

/**
 * Terminal-style modal for submitting post-workout "neural echo" reflections.
 * Parses natural language input via Ollama to extract achievements,
 * joint integrity changes, and RPE adjustments.
 */
export function EchoModal({ isOpen, onClose, session, onSuccess }: EchoModalProps) {
  const [echoText, setEchoText] = useState('');
  const [state, setState] = useState<ProcessingState>('idle');
  const [result, setResult] = useState<EchoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedTokens, setDetectedTokens] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management and escape handling
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = 'hidden';
    } else {
      if (previousActiveElement.current && document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && state !== 'processing') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, state]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEchoText('');
      setState('idle');
      setResult(null);
      setError(null);
      setDetectedTokens([]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!echoText.trim() || state === 'processing') return;

    setState('processing');
    setError(null);
    setDetectedTokens([]);

    // Simulate token detection animation
    const tokens = extractPotentialTokens(echoText);
    for (let i = 0; i < tokens.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setDetectedTokens((prev) => [...prev, tokens[i]]);
    }

    try {
      const response = await submitSessionEcho(session.id, { rawEchoLog: echoText });
      setResult(response.echoResult ?? null);
      setState('success');

      // Delay before closing to show success state
      setTimeout(() => {
        onSuccess(response);
        onClose();
      }, 1500);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to process echo');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={state !== 'processing' ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Terminal-style modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="echo-modal-title"
        className="relative bg-[#09090b] rounded-lg border border-emerald-900/50 shadow-2xl shadow-emerald-900/20 max-w-2xl w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30 bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <h2 id="echo-modal-title" className="ml-3 text-sm font-mono text-emerald-400 uppercase tracking-wider">
              Neural Echo // Session {session.sessionOrder}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={state === 'processing'}
            className="p-1 text-emerald-600 hover:text-emerald-400 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session context */}
        <div className="px-4 py-2 border-b border-emerald-900/20 bg-emerald-950/10 font-mono text-xs text-emerald-600">
          <span className="text-emerald-500">[SESSION]</span>{' '}
          {session.type.toUpperCase()} // {session.durationMin}min // RPE {session.perceivedIntensity ?? '?'}
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Input prompt */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-sm text-emerald-400">
              <span className="text-emerald-600">&gt;</span>
              <span>INITIATE_NEURAL_ECHO_</span>
              <span className="animate-pulse">|</span>
            </div>
            <textarea
              ref={inputRef}
              value={echoText}
              onChange={(e) => setEchoText(e.target.value)}
              disabled={state === 'processing' || state === 'success'}
              placeholder="Felt great today. Hit a 30s handstand PR! Wrists felt much better than last week..."
              className="w-full h-32 px-3 py-2 bg-black/50 border border-emerald-900/40 rounded font-mono text-sm text-emerald-300 placeholder-emerald-800 focus:outline-none focus:border-emerald-600 resize-none disabled:opacity-50"
            />
          </div>

          {/* Token detection display */}
          {detectedTokens.length > 0 && (
            <div className="space-y-1 font-mono text-xs">
              {detectedTokens.map((token, i) => (
                <div key={i} className="flex items-center gap-2 animate-fade-in">
                  <span className="text-emerald-600">[DETECTED]</span>
                  <span className="text-emerald-400 uppercase">{token}</span>
                </div>
              ))}
            </div>
          )}

          {/* Processing state */}
          {state === 'processing' && (
            <div className="flex items-center gap-2 font-mono text-sm text-emerald-500">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>SYNTHESIZING...</span>
            </div>
          )}

          {/* Success state */}
          {state === 'success' && result && (
            <div className="space-y-2 font-mono text-xs text-emerald-400 animate-fade-in">
              <div className="text-emerald-500">[ECHO_PROCESSED]</div>
              {result.achievements.length > 0 && (
                <div>Achievements: {result.achievements.join(', ')}</div>
              )}
              {Object.keys(result.jointIntegrityDelta).length > 0 && (
                <div>
                  Joint updates:{' '}
                  {Object.entries(result.jointIntegrityDelta)
                    .map(([joint, delta]) => `${joint} ${delta > 0 ? '+' : ''}${delta.toFixed(1)}`)
                    .join(', ')}
                </div>
              )}
              {result.perceivedExertionOffset !== 0 && (
                <div>RPE adjustment: {result.perceivedExertionOffset > 0 ? '+' : ''}{result.perceivedExertionOffset}</div>
              )}
            </div>
          )}

          {/* Error state */}
          {state === 'error' && error && (
            <div className="font-mono text-xs text-red-400">
              <span className="text-red-600">[ERROR]</span> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-emerald-900/30 bg-emerald-950/10">
          <button
            type="button"
            onClick={onClose}
            disabled={state === 'processing'}
            className="px-4 py-2 font-mono text-sm text-emerald-600 hover:text-emerald-400 transition-colors disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!echoText.trim() || state === 'processing' || state === 'success'}
            className="px-4 py-2 font-mono text-sm bg-emerald-900/30 text-emerald-400 border border-emerald-700/50 rounded hover:bg-emerald-800/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'processing' ? 'PROCESSING...' : 'TRANSMIT_ECHO'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Extract potential tokens from echo text for animation.
 * These are simple keyword matches for visual effect.
 */
function extractPotentialTokens(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();

  // Achievement keywords
  if (lower.includes('pr') || lower.includes('personal record')) tokens.push('ACHIEVEMENT_DETECTED');
  if (/\d+\s*(s|sec|second)/.test(lower)) tokens.push('DURATION_MARKER');

  // Body part keywords
  const bodyParts = ['wrist', 'shoulder', 'knee', 'back', 'hip', 'ankle', 'elbow', 'neck'];
  for (const part of bodyParts) {
    if (lower.includes(part)) {
      tokens.push(`JOINT_${part.toUpperCase()}`);
    }
  }

  // Sentiment keywords
  if (lower.includes('better') || lower.includes('improved') || lower.includes('great')) {
    tokens.push('POSITIVE_SIGNAL');
  }
  if (lower.includes('sore') || lower.includes('tight') || lower.includes('pain')) {
    tokens.push('FATIGUE_INDICATOR');
  }
  if (lower.includes('hard') || lower.includes('tough') || lower.includes('easy')) {
    tokens.push('EXERTION_MODIFIER');
  }

  return tokens;
}
