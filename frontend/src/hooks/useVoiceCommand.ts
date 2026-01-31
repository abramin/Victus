import { useState, useEffect, useCallback, useRef } from 'react';
import type { ParseVoiceCommandResponse } from '../api/voiceTypes';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
    readonly resultIndex: number;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event & { error: string }) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    onspeechend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

export type VoiceCommandStatus = 'idle' | 'listening' | 'processing' | 'success' | 'error';

export interface UseVoiceCommandOptions {
    /** Current date in YYYY-MM-DD format for body issue logging */
    date?: string;
    /** Called when transcription is complete but before API call */
    onTranscript?: (transcript: string) => void;
    /** Called on successful parse */
    onSuccess?: (response: ParseVoiceCommandResponse) => void;
    /** Called on error */
    onError?: (error: string) => void;
    /** Auto-stop after silence in ms (default: 2000) */
    silenceTimeout?: number;
}

export interface UseVoiceCommandReturn {
    /** Start listening for voice input */
    startListening: () => void;
    /** Stop listening and process */
    stopListening: () => void;
    /** Cancel without processing */
    cancel: () => void;
    /** Current status */
    status: VoiceCommandStatus;
    /** Interim transcript while speaking */
    interimTranscript: string;
    /** Final transcript after stop */
    finalTranscript: string;
    /** Parsed result from API */
    result: ParseVoiceCommandResponse | null;
    /** Error message if any */
    error: string | null;
    /** Whether browser supports speech recognition */
    isSupported: boolean;
}

const API_BASE = '/api';

async function parseVoiceCommand(rawInput: string, date?: string): Promise<ParseVoiceCommandResponse> {
    const response = await fetch(`${API_BASE}/voice/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: rawInput, date }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

export function useVoiceCommand(options: UseVoiceCommandOptions = {}): UseVoiceCommandReturn {
    const {
        date,
        onTranscript,
        onSuccess,
        onError,
        silenceTimeout = 2000,
    } = options;

    const [status, setStatus] = useState<VoiceCommandStatus>('idle');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [result, setResult] = useState<ParseVoiceCommandResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use refs to avoid closure issues in event handlers
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transcriptRef = useRef('');  // Current accumulated transcript
    const statusRef = useRef<VoiceCommandStatus>('idle');
    const dateRef = useRef(date);
    const callbacksRef = useRef({ onTranscript, onSuccess, onError });

    // Keep refs in sync
    useEffect(() => {
        dateRef.current = date;
        callbacksRef.current = { onTranscript, onSuccess, onError };
    }, [date, onTranscript, onSuccess, onError]);

    // Check for browser support
    const isSupported = typeof window !== 'undefined' &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    const clearSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);

    const processTranscript = useCallback(async (transcript: string) => {
        if (!transcript.trim()) {
            setStatus('idle');
            statusRef.current = 'idle';
            return;
        }

        setStatus('processing');
        statusRef.current = 'processing';
        setFinalTranscript(transcript);
        callbacksRef.current.onTranscript?.(transcript);

        try {
            const response = await parseVoiceCommand(transcript, dateRef.current);
            setResult(response);

            if (response.success) {
                setStatus('success');
                statusRef.current = 'success';
                callbacksRef.current.onSuccess?.(response);
            } else {
                setError(response.error || 'Parse failed');
                setStatus('error');
                statusRef.current = 'error';
                callbacksRef.current.onError?.(response.error || 'Parse failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            setStatus('error');
            statusRef.current = 'error';
            callbacksRef.current.onError?.(message);
        }
    }, []);

    const startListening = useCallback(() => {
        if (!isSupported) {
            setError('Speech recognition not supported');
            setStatus('error');
            return;
        }

        // Reset state
        transcriptRef.current = '';
        setInterimTranscript('');
        setFinalTranscript('');
        setResult(null);
        setError(null);

        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) return;

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;  // Changed: stop after first phrase
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('[Voice] Recognition started');
            setStatus('listening');
            statusRef.current = 'listening';

            // Set max listening timeout
            silenceTimerRef.current = setTimeout(() => {
                console.log('[Voice] Silence timeout - stopping');
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }
            }, silenceTimeout);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let fullTranscript = '';

            // Accumulate all results
            for (let i = 0; i < event.results.length; i++) {
                fullTranscript += event.results[i][0].transcript;
            }

            console.log('[Voice] Transcript:', fullTranscript, 'isFinal:', event.results[event.results.length - 1]?.isFinal);

            transcriptRef.current = fullTranscript;
            setInterimTranscript(fullTranscript);

            // Reset silence timer on new speech
            clearSilenceTimer();
            silenceTimerRef.current = setTimeout(() => {
                console.log('[Voice] Silence detected - stopping');
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }
            }, silenceTimeout);
        };

        recognition.onerror = (event: Event & { error: string }) => {
            console.log('[Voice] Error:', event.error);
            clearSilenceTimer();

            if (event.error === 'aborted' || event.error === 'no-speech') {
                setStatus('idle');
                statusRef.current = 'idle';
                return;
            }

            setError(`Speech recognition error: ${event.error}`);
            setStatus('error');
            statusRef.current = 'error';
            callbacksRef.current.onError?.(`Speech recognition error: ${event.error}`);
        };

        recognition.onend = () => {
            console.log('[Voice] Recognition ended, transcript:', transcriptRef.current);
            clearSilenceTimer();

            const transcript = transcriptRef.current;
            if (transcript && statusRef.current === 'listening') {
                processTranscript(transcript);
            } else if (statusRef.current === 'listening') {
                setStatus('idle');
                statusRef.current = 'idle';
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (err) {
            console.error('[Voice] Failed to start recognition:', err);
            setError('Failed to start speech recognition');
            setStatus('error');
        }
    }, [isSupported, silenceTimeout, clearSilenceTimer, processTranscript]);

    const stopListening = useCallback(() => {
        console.log('[Voice] Manual stop requested');
        clearSilenceTimer();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, [clearSilenceTimer]);

    const cancel = useCallback(() => {
        console.log('[Voice] Cancel requested');
        clearSilenceTimer();
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
        transcriptRef.current = '';
        setStatus('idle');
        statusRef.current = 'idle';
        setInterimTranscript('');
    }, [clearSilenceTimer]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearSilenceTimer();
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [clearSilenceTimer]);

    return {
        startListening,
        stopListening,
        cancel,
        status,
        interimTranscript,
        finalTranscript,
        result,
        error,
        isSupported,
    };
}
