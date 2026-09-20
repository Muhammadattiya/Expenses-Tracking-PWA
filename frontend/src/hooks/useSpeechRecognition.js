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
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceLang;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interimText += result[0].transcript;
        }
      }
      
      setTranscript(finalText);
      setInterimTranscript(interimText);
    };
    
    recognition.onerror = (event) => {
      // If ar-EG is not supported by the device/engine, try standard Arabic ar-SA fallback
      if (event.error === 'language-not-supported' && recognition.lang === 'ar-EG') {
        console.warn("Speech recognition: 'ar-EG' not supported, falling back to 'ar-SA'");
        recognition.lang = 'ar-SA';
        try {
          recognition.start();
          return;
        } catch (e) {
          console.warn("Fallback recognition start error:", e);
        }
      }
      
      // 'no-speech' is a standard timeout, not an actual error
      if (event.error !== 'no-speech') {
        setError(event.error);
      }
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
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
    const targetLang = langOverride || voiceLang;
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
        // Recognition might already be running or initializing
        console.warn("Speech recognition start notice:", e);
      }
    }
  }, [isSupported, voiceLang]);

  const stopListening = useCallback(() => {
    if (!isSupported) return;
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
