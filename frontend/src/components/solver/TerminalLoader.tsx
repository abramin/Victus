import { useEffect, useState } from 'react';

const MESSAGES = [
  'Scanning pantry...',
  'Analyzing macro gaps...',
  'Running combinatorial solver...',
  'Optimizing portions...',
  'Generating recipes...',
];

export function TerminalLoader() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 800);

    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6 font-mono text-sm">
      <div className="flex items-center gap-2 text-emerald-400 mb-4">
        <span className="text-emerald-500">{'>'}</span>
        <span>{MESSAGES[messageIndex]}</span>
        <span className={`${cursorVisible ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          _
        </span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
