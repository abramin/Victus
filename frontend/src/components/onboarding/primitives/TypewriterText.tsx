import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cursorBlink } from '../../../lib/animations';

interface TypewriterTextProps {
  text: string;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({ text, className = '', onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Use ref to avoid re-running effect when onComplete changes
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, 50); // 50ms per character for snappy terminal feel

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div
      className={`font-mono text-emerald-400 tracking-wider inline-flex items-center ${className}`}
      aria-live="polite"
    >
      <span>{displayedText}</span>
      {isComplete && (
        <motion.span
          initial="hidden"
          animate="visible"
          variants={cursorBlink}
          className="ml-1 inline-block w-2 h-5 bg-emerald-400"
        />
      )}
    </div>
  );
}
