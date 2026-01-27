import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { SemanticToken } from '../components/semantic/semanticDictionary';

interface AnimatingToken {
  id: string;
  token: SemanticToken;
  sourceRect: DOMRect;
}

interface SemanticFeedbackContextValue {
  // Register the target element (Body Status icon)
  registerTarget: (element: HTMLElement | null) => void;
  // Trigger animation from source element to target
  triggerAnimation: (tokens: SemanticToken[], sourceElement: HTMLElement) => void;
  // Whether animation is currently playing
  isAnimating: boolean;
  // Trigger the receive pulse on target
  triggerReceivePulse: () => void;
  // Subscribe to receive pulse events
  onReceivePulse: (callback: () => void) => () => void;
}

const SemanticFeedbackContext = createContext<SemanticFeedbackContextValue | null>(null);

export function useSemanticFeedback() {
  const context = useContext(SemanticFeedbackContext);
  if (!context) {
    throw new Error('useSemanticFeedback must be used within SemanticFeedbackProvider');
  }
  return context;
}

// Optional hook that returns null if context is not available
export function useSemanticFeedbackOptional() {
  return useContext(SemanticFeedbackContext);
}

interface SemanticFeedbackProviderProps {
  children: ReactNode;
}

export function SemanticFeedbackProvider({ children }: SemanticFeedbackProviderProps) {
  const [animatingTokens, setAnimatingTokens] = useState<AnimatingToken[]>([]);
  const [showToast, setShowToast] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const pulseCallbacks = useRef<Set<() => void>>(new Set());

  const registerTarget = useCallback((element: HTMLElement | null) => {
    targetRef.current = element;
  }, []);

  const triggerReceivePulse = useCallback(() => {
    pulseCallbacks.current.forEach((cb) => cb());
  }, []);

  const onReceivePulse = useCallback((callback: () => void) => {
    pulseCallbacks.current.add(callback);
    return () => {
      pulseCallbacks.current.delete(callback);
    };
  }, []);

  const triggerAnimation = useCallback(
    (tokens: SemanticToken[], sourceElement: HTMLElement) => {
      if (!targetRef.current || tokens.length === 0) {
        // No target or no tokens, just show toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        return;
      }

      const sourceRect = sourceElement.getBoundingClientRect();

      // Create animating tokens (limit to 5 for performance)
      const limitedTokens = tokens.slice(0, 5);
      const newAnimatingTokens: AnimatingToken[] = limitedTokens.map((token, i) => ({
        id: `${Date.now()}-${i}`,
        token,
        sourceRect,
      }));

      setAnimatingTokens(newAnimatingTokens);

      // After animation completes, trigger pulse and show toast
      setTimeout(() => {
        setAnimatingTokens([]);
        triggerReceivePulse();
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }, 600);
    },
    [triggerReceivePulse],
  );

  const isAnimating = animatingTokens.length > 0;

  return (
    <SemanticFeedbackContext.Provider
      value={{
        registerTarget,
        triggerAnimation,
        isAnimating,
        triggerReceivePulse,
        onReceivePulse,
      }}
    >
      {children}

      {/* Animation Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Animating particles */}
            <AnimatePresence>
              {animatingTokens.map((item, index) => {
                const targetRect = targetRef.current?.getBoundingClientRect();
                if (!targetRect) return null;

                // Calculate target position (center of target element)
                const targetX = targetRect.left + targetRect.width / 2 - item.sourceRect.left;
                const targetY = targetRect.top + targetRect.height / 2 - item.sourceRect.top;

                return (
                  <motion.div
                    key={item.id}
                    initial={{
                      position: 'fixed',
                      left: item.sourceRect.left,
                      top: item.sourceRect.top + index * 20,
                      zIndex: 9999,
                      pointerEvents: 'none',
                    }}
                    animate={{
                      x: targetX,
                      y: targetY,
                      scale: 0.1,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.05,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      item.token.type === 'bodyPart'
                        ? 'bg-blue-500/80 text-white'
                        : 'bg-yellow-500/80 text-black'
                    }`}
                  >
                    {item.token.text}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Toast notification */}
            <AnimatePresence>
              {showToast && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999]"
                >
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900/90 border border-emerald-700/50 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm text-emerald-100 font-medium">
                      Damage Registered
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </SemanticFeedbackContext.Provider>
  );
}
