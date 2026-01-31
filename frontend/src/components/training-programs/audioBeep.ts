/**
 * Plays a simple beep sound using Web Audio API.
 * @param frequency - Frequency in Hz (default 880 Hz = A5 note)
 * @param duration - Duration in milliseconds (default 150ms)
 * @param volume - Volume from 0 to 1 (default 0.3)
 */
export function playBeep(frequency = 880, duration = 150, volume = 0.3): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    // Silent fail if Web Audio API is not available
    console.warn('Audio beep failed:', error);
  }
}

/**
 * Plays a countdown beep sequence: 3 beeps with increasing pitch.
 * Used for "ready, set, go" countdowns.
 */
export function playCountdownBeeps(): void {
  playBeep(660, 150, 0.3); // E5
  setTimeout(() => playBeep(784, 150, 0.3), 1000); // G5
  setTimeout(() => playBeep(1047, 200, 0.4), 2000); // C6 (higher pitch for "go")
}

/**
 * Plays a warning beep (lower pitch for ending warnings).
 */
export function playWarningBeep(): void {
  playBeep(440, 200, 0.3); // A4
}
