import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { terminalLine, successGlow } from '../../lib/animations';
import tetrisAnimation from '../../lib/Loading animation.json';

interface TerminalMessage {
  text: string;
  delay: number;
  isSuccess?: boolean;
}

const TERMINAL_MESSAGES: TerminalMessage[] = [
  { text: '> Reading Pantry...', delay: 0 },
  { text: '> Analyzing Macro Gaps...', delay: 400 },
  { text: '> Optimizing Protein...', delay: 800 },
  { text: '> Balancing Carbs...', delay: 1000 },
  { text: '> Solution Found.', delay: 1300, isSuccess: true },
];

interface TerminalLoaderProps {
  onComplete?: () => void;
  minDisplayMs?: number;
}

export function TerminalLoader({ onComplete, minDisplayMs = 1500 }: TerminalLoaderProps) {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    // Show messages with delays
    const timeouts: NodeJS.Timeout[] = [];

    TERMINAL_MESSAGES.forEach((msg, index) => {
      const timeout = setTimeout(() => {
        setVisibleMessages((prev) => [...prev, index]);
      }, msg.delay);
      timeouts.push(timeout);
    });

    // Notify completion after minimum display time
    if (onComplete) {
      const completeTimeout = setTimeout(() => {
        onComplete();
      }, minDisplayMs);
      timeouts.push(completeTimeout);
    }

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(cursorInterval);
    };
  }, [onComplete, minDisplayMs]);

  return (
    <div className="bg-gray-900 border border-emerald-500/30 rounded-lg overflow-hidden">
      {/* Lottie Animation Zone */}
      <div className="flex justify-center items-center py-4 bg-gray-950/50">
        <Lottie
          animationData={tetrisAnimation}
          loop={true}
          style={{ width: 180, height: 120 }}
        />
      </div>

      {/* Terminal Text Zone */}
      <div className="p-4 font-mono text-sm border-t border-emerald-500/20">
        <AnimatePresence>
          {TERMINAL_MESSAGES.map(
            (msg, index) =>
              visibleMessages.includes(index) && (
                <motion.div
                  key={index}
                  variants={terminalLine}
                  initial="hidden"
                  animate="visible"
                  className={`flex items-center gap-2 mb-1 ${
                    msg.isSuccess ? 'text-emerald-400' : 'text-emerald-400/70'
                  }`}
                >
                  {msg.isSuccess && (
                    <motion.span
                      variants={successGlow}
                      initial="initial"
                      animate="glow"
                      className="text-emerald-400"
                    >
                      {msg.text}
                    </motion.span>
                  )}
                  {!msg.isSuccess && <span>{msg.text}</span>}
                  {index === visibleMessages[visibleMessages.length - 1] && (
                    <span
                      className={`${cursorVisible ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                    >
                      _
                    </span>
                  )}
                </motion.div>
              )
          )}
        </AnimatePresence>

        {/* Loading dots */}
        <div className="flex gap-1 mt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
