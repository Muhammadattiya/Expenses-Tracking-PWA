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

  // Synchronize when initialLang changes explicitly
  useEffect(() => {
    if (initialLang) {
      const saved = localStorage.getItem('finova-voice-lang');
      if (!saved) {
        setVoiceLangState(initialLang);
      }
    }
  }, [initialLang]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    
    let recognition;
    try {
      recognition = new SpeechRecognition();
    } catch (e) {
      console.warn("SpeechRecognition init error:", e);
      setIsSupported(false);
      return;
    }
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceLang;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onresult = (event) => {
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
      console.warn("Speech recognition error:", event.error);
      
      // Benign silence timeout - keep-alive in onend will restart if user hasn't stopped
      if (event.error === 'no-speech') {
        return;
      }
      
      // If ar-EG is not supported by the device/engine, try standard Arabic ar-SA fallback
      if (event.error === 'language-not-supported' && recognition.lang === 'ar-EG') {
        console.warn("Speech recognition: 'ar-EG' not supported, falling back to 'ar-SA'");
        recognition.lang = 'ar-SA';
        if (activeRef.current) {
          try {
            recognition.start();
            return;
          } catch (e) {}
        }
      }
      
      if (event.error === 'not-allowed') {
        setError('not-allowed');
        activeRef.current = false;
        setIsListening(false);
        return;
      }

      if (event.error === 'network') {
        setError('network');
        activeRef.current = false;
        setIsListening(false);
        return;
      }

      setError(event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      // If the user intended to keep listening (not manually stopped), restart on silence pause
      if (activeRef.current) {
        setTranscript(prev => {
          accumulatedTranscriptRef.current = prev;
          return prev;
        });
        setInterimTranscript('');
        
        try {
          recognition.start();
          return;
        } catch (e) {
          setTimeout(() => {
            if (activeRef.current) {
              try {
                recognition.start();
              } catch (err) {
                console.warn("Speech recognition restart notice:", err);
                setIsListening(false);
              }
            }
          }, 150);
          return;
        }
      }
      
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      activeRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [voiceLang]);

  const setVoiceLang = useCallback((newLang) => {
    setVoiceLangState(newLang);
    try {
      localStorage.setItem('finova-voice-lang', newLang);
    } catch (e) {}
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = newLang;
      } catch (e) {}
    }
  }, []);

  const startListening = useCallback((langOverride) => {
    if (!isSupported) return;
    const targetLang = langOverride || voiceLangRef.current;
    activeRef.current = true;
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = targetLang;
      } catch (e) {}
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech recognition start notice:", e);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!isSupported) return;
    activeRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.warn("Speech recognition stop notice:", e);
    }
  }, [isSupported]);

  return { 
    isListening, 
    transcript, 
    interimTranscript,
    setTranscript, 
    startListening, 
    stopListening, 
    error, 
    isSupported,
    voiceLang,
    setVoiceLang
  };
};
