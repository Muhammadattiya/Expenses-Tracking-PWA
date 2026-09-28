import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = (initialLang = 'ar-EG') => {
  const [voiceLang, setVoiceLangState] = useState(() => {
    return localStorage.getItem('finova-voice-lang') || initialLang || 'ar-EG';
  });
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const voiceLangRef = useRef(voiceLang);
  voiceLangRef.current = voiceLang;

  // Synchronize when initialLang changes explicitly if no local storage preference exists
  useEffect(() => {
    if (initialLang) {
      const saved = localStorage.getItem('finova-voice-lang');
      if (!saved) {
        setVoiceLangState(initialLang);
        voiceLangRef.current = initialLang;
      }
    }
  }, [initialLang]);

  // Initial browser support check
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Safely detach all listeners and abort any active recognition instance
  const cleanupCurrentRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const inst = recognitionRef.current;
      recognitionRef.current = null;
      try {
        inst.onstart = null;
        inst.onresult = null;
        inst.onerror = null;
        inst.onend = null;
        inst.abort();
      } catch (e) {
        // Ignore any errors during abort
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      cleanupCurrentRecognition();
    };
  }, [cleanupCurrentRecognition]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    setIsListening(false);
    cleanupCurrentRecognition();
  }, [cleanupCurrentRecognition]);

  const startListening = useCallback((langOverride) => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const targetLang = langOverride || voiceLangRef.current || 'ar-EG';

    // 1. Tear down previous recognition cleanly to ensure WebKit gets a fresh instance
    cleanupCurrentRecognition();

    activeRef.current = true;
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);

    let recognition;
    try {
      recognition = new SpeechRecognition();
    } catch (err) {
      console.warn("SpeechRecognition instance creation error:", err);
      setIsSupported(false);
      activeRef.current = false;
      setIsListening(false);
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = targetLang;

    recognition.onstart = () => {
      if (!activeRef.current) {
        try { recognition.abort(); } catch (e) {}
        return;
      }
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      if (!activeRef.current) return;
      let sessionFinal = '';
      let sessionInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          sessionFinal += result[0].transcript + ' ';
        } else {
          sessionInterim += result[0].transcript;
        }
      }

      const fullFinal = (accumulatedTranscriptRef.current + ' ' + sessionFinal).trim();
      setTranscript(fullFinal);
      setInterimTranscript(sessionInterim.trim());
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition notice/error:", event.error);

      // Benign silence timeout or user manual abort - NEVER treat as user-facing error
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      // If ar-EG is not supported on this specific engine, fallback to standard Arabic ar-SA
      if (event.error === 'language-not-supported' && targetLang === 'ar-EG') {
        console.warn("Speech recognition: 'ar-EG' not supported, attempting 'ar-SA' fallback");
        setVoiceLangState('ar-SA');
        voiceLangRef.current = 'ar-SA';
        try { localStorage.setItem('finova-voice-lang', 'ar-SA'); } catch (e) {}
        if (activeRef.current) {
          startListening('ar-SA');
          return;
        }
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('not-allowed');
      } else if (event.error === 'network') {
        setError('network');
      } else {
        setError(event.error);
      }

      activeRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      // If the user intended to keep listening (browser silence timeout on iOS/WebKit), restart with a fresh instance
      if (activeRef.current) {
        setTranscript(prev => {
          accumulatedTranscriptRef.current = prev;
          return prev;
        });
        setInterimTranscript('');

        cleanupCurrentRecognition();
        if (activeRef.current) {
          // Restart immediately
          startListening(targetLang);
        }
        return;
      }

      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.warn("Speech recognition start failed:", e);
      activeRef.current = false;
      setIsListening(false);
      // Only set error if not-allowed or permission issue
      if (e.name === 'NotAllowedError') {
        setError('not-allowed');
      }
    }
  }, [cleanupCurrentRecognition]);

  const setVoiceLang = useCallback((newLang) => {
    setVoiceLangState(newLang);
    voiceLangRef.current = newLang;
    try {
      localStorage.setItem('finova-voice-lang', newLang);
    } catch (e) {}

    // If currently listening, seamlessly switch to the new language immediately without setTimeout (preserves iOS user gesture)
    if (activeRef.current) {
      startListening(newLang);
    }
  }, [startListening]);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    setTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
    isSupported,
    voiceLang,
    setVoiceLang
  };
};
