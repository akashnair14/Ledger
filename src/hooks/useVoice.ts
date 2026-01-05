import { useState, useRef, useEffect, useCallback } from 'react';

// Extend window interface for WebKit prefix
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export type VoiceState = {
    isListening: boolean;
    transcript: string;
    error: string | null;
    isSupported: boolean;
};

export function useVoice() {
    const [state, setState] = useState<VoiceState>({
        isListening: false,
        transcript: '',
        error: null,
        isSupported: false
    });

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false; // Stop after one command
                recognition.interimResults = true; // Show typing as we speak
                recognition.lang = 'en-IN'; // Default to Indian English for better accent support

                recognition.onstart = () => setState(s => ({ ...s, isListening: true, error: null }));

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            // Interim
                            setState(s => ({ ...s, transcript: event.results[i][0].transcript }));
                        }
                    }
                    if (finalTranscript) {
                        setState(s => ({ ...s, transcript: finalTranscript }));
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech Error:', event.error);
                    setState(s => ({ ...s, isListening: false, error: event.error }));
                };

                recognition.onend = () => {
                    setState(s => ({ ...s, isListening: false }));
                };

                recognitionRef.current = recognition;
                setState(s => ({ ...s, isSupported: true }));
            }
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !state.isListening) {
            try {
                setState(s => ({ ...s, transcript: '', error: null }));
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
            }
        }
    }, [state.isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && state.isListening) {
            recognitionRef.current.stop();
        }
    }, [state.isListening]);

    return {
        ...state,
        startListening,
        stopListening
    };
}
