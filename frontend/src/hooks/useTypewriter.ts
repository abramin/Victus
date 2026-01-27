import { useState, useEffect, useCallback } from 'react';

interface UseTypewriterOptions {
  /** Delay in ms between each character (default: 30) */
  charDelay?: number;
  /** Delay in ms before starting the animation (default: 200) */
  startDelay?: number;
  /** Whether to start the animation immediately (default: true) */
  autoStart?: boolean;
}

interface UseTypewriterReturn {
  /** The currently displayed text (partial during animation) */
  displayText: string;
  /** Whether the animation has completed */
  isComplete: boolean;
  /** Restart the animation */
  restart: () => void;
  /** Skip to the end of the animation */
  skip: () => void;
}

/**
 * Custom hook for typewriter-style text animation.
 * Animates text character-by-character with configurable timing.
 *
 * @example
 * ```tsx
 * const { displayText, isComplete } = useTypewriter('BIO-RECOVERY PUDDING: ALPHA-1');
 *
 * return (
 *   <h3 className="font-mono">
 *     {displayText}
 *     {!isComplete && <span className="animate-pulse">_</span>}
 *   </h3>
 * );
 * ```
 */
export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { charDelay = 30, startDelay = 200, autoStart = true } = options;

  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(autoStart);

  const restart = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsRunning(true);
  }, []);

  const skip = useCallback(() => {
    setDisplayText(text);
    setIsComplete(true);
    setIsRunning(false);
  }, [text]);

  // Reset when text changes
  useEffect(() => {
    if (autoStart) {
      restart();
    } else {
      setDisplayText('');
      setIsComplete(false);
    }
  }, [text, autoStart, restart]);

  // Animation effect
  useEffect(() => {
    if (!isRunning || !text) {
      return;
    }

    let currentIndex = 0;
    let intervalId: NodeJS.Timeout | undefined;

    // Start after delay
    const startTimeout = setTimeout(() => {
      intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          currentIndex++;
          setDisplayText(text.slice(0, currentIndex));
        } else {
          setIsComplete(true);
          setIsRunning(false);
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      }, charDelay);
    }, startDelay);

    return () => {
      clearTimeout(startTimeout);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [text, charDelay, startDelay, isRunning]);

  return { displayText, isComplete, restart, skip };
}
