import type { ReactElement } from 'react';
import { useState } from 'react';
import { useVoiceCommand, type VoiceCommandStatus } from '../../hooks/useVoiceCommand';
import type { ParseVoiceCommandResponse } from '../../api/voiceTypes';

interface VoiceCommandButtonProps {
    /** Current date in YYYY-MM-DD format for body issue logging */
    date?: string;
    /** Called when a voice command is successfully parsed */
    onResult?: (response: ParseVoiceCommandResponse) => void;
    /** Position from bottom edge */
    bottomOffset?: number;
    /** Position from right edge (use this OR leftOffset, not both) */
    rightOffset?: number;
    /** Position from left edge (use this OR rightOffset, not both) */
    leftOffset?: number;
}

const statusColors: Record<VoiceCommandStatus, string> = {
    idle: 'bg-slate-700 hover:bg-slate-600',
    listening: 'bg-emerald-600 animate-pulse',
    processing: 'bg-blue-600 animate-spin-slow',
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
};

const statusIcons: Record<VoiceCommandStatus, ReactElement> = {
    idle: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
    ),
    listening: (
        <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping" />
            <svg className="w-6 h-6 relative" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
        </div>
    ),
    processing: (
        <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
    ),
    success: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    error: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
};

export function VoiceCommandButton({
    date,
    onResult,
    bottomOffset = 24,
    rightOffset,
    leftOffset,
}: VoiceCommandButtonProps) {
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');

    const {
        startListening,
        stopListening,
        cancel,
        status,
        interimTranscript,
        result,
        error,
        isSupported,
    } = useVoiceCommand({
        date,
        onTranscript: (transcript) => {
            setFeedbackMessage(`"${transcript}"`);
        },
        onSuccess: (response) => {
            // Use action_taken for more detailed feedback
            if (response.action_taken) {
                if (response.action_taken.type === 'queued') {
                    // Async processing - show processing message, then auto-refresh after delay
                    setFeedbackMessage('⏳ Processing voice command...');
                    // Auto-refresh data after a delay to pick up async results
                    setTimeout(() => {
                        onResult?.(response);
                    }, 5000);
                } else {
                    const prefix = response.action_taken.type === 'nutrition_logged' ? '🍽️ '
                        : response.action_taken.type === 'training_logged' ? '💪 '
                            : response.action_taken.type === 'training_draft' ? '⏳ '
                                : '✓ ';
                    setFeedbackMessage(`${prefix}${response.action_taken.summary}`);
                    onResult?.(response);
                }
            } else if (response.is_draft) {
                setFeedbackMessage('Draft session saved - tap to add duration');
                onResult?.(response);
            } else if (response.result?.intent === 'TRAINING') {
                setFeedbackMessage(`Logged: ${response.result.training_data?.activity}`);
                onResult?.(response);
            } else if (response.result?.intent === 'NUTRITION') {
                const itemCount = response.result.nutrition_data?.items.length ?? 0;
                setFeedbackMessage(`Logged: ${itemCount} item${itemCount !== 1 ? 's' : ''}`);
                onResult?.(response);
            } else if (response.result?.intent === 'BIOMETRICS') {
                setFeedbackMessage(`Updated: ${response.result.biometric_data?.metric}`);
                onResult?.(response);
            }

            // Auto-hide feedback after 3s
            setTimeout(() => {
                setShowFeedback(false);
                setFeedbackMessage('');
            }, 3000);
        },
        onError: (msg) => {
            setFeedbackMessage(msg);
            setTimeout(() => {
                setShowFeedback(false);
                setFeedbackMessage('');
            }, 3000);
        },
    });

    const handleClick = () => {
        if (status === 'listening') {
            stopListening();
        } else if (status === 'idle' || status === 'success' || status === 'error') {
            setShowFeedback(true);
            setFeedbackMessage('Listening...');
            startListening();
        }
    };

    const handleLongPress = () => {
        if (status === 'listening') {
            cancel();
            setShowFeedback(false);
        }
    };

    if (!isSupported) {
        return null; // Don't render if not supported
    }

    return (
        <>
            {/* Feedback toast */}
            {showFeedback && (
                <div
                    className="fixed z-50 transition-all duration-300 ease-out"
                    style={{
                        bottom: bottomOffset + 72,
                        ...(leftOffset !== undefined ? { left: leftOffset } : { right: rightOffset ?? 24 }),
                    }}
                >
                    <div className="bg-slate-800/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-xl border border-slate-700 max-w-xs">
                        {/* Status indicator */}
                        <div className="flex items-center gap-3">
                            {status === 'listening' && (
                                <div className="flex gap-1">
                                    <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                            <span className="text-sm text-white">
                                {status === 'listening' && interimTranscript
                                    ? `"${interimTranscript}"`
                                    : feedbackMessage}
                            </span>
                        </div>

                        {/* Draft indicator */}
                        {result?.is_draft && (
                            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Duration missing - session saved as draft
                            </div>
                        )}

                        {/* Body map updates indicator */}
                        {result?.body_map_updates && result.body_map_updates.length > 0 && (
                            <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Body map updated: {result.body_map_updates.map(u => u.body_part).join(', ')}
                            </div>
                        )}

                        {/* Error message */}
                        {error && status === 'error' && (
                            <div className="mt-2 text-xs text-rose-400">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={handleClick}
                onContextMenu={(e) => {
                    e.preventDefault();
                    handleLongPress();
                }}
                className={`
          fixed z-50 w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          text-white transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500
          ${statusColors[status]}
          ${status === 'listening' ? 'scale-110 shadow-emerald-500/50' : ''}
        `}
                style={{
                    bottom: bottomOffset,
                    ...(leftOffset !== undefined ? { left: leftOffset } : { right: rightOffset ?? 24 }),
                }}
                title={
                    status === 'listening'
                        ? 'Tap to stop • Right-click to cancel'
                        : 'Tap to speak a command'
                }
                aria-label="Voice command"
                data-testid="voice-command-button"
            >
                {statusIcons[status]}
            </button>
        </>
    );
}
