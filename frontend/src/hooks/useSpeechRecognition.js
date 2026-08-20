import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = (lang = 'ar-EG') => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    
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
      setError(event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
         recognitionRef.current.abort();
      }
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    setTranscript('');
    setInterimTranscript('');
    try {
       recognitionRef.current?.start();
    } catch(e) {
       console.error("Speech recognition start error", e);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!isSupported) return;
    try {
       recognitionRef.current?.stop();
    } catch(e) {
       console.error("Speech recognition stop error", e);
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
    isSupported 
  };
};
