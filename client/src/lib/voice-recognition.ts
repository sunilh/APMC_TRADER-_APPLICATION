import { useState, useEffect, useRef, useCallback } from "react";

interface VoiceRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface VoiceRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: Error | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}): VoiceRecognitionResult {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = false,
    maxAlternatives = 1,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isSupported = useRef(false);

  // Check if browser supports speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      isSupported.current = !!SpeechRecognition;
      
      if (isSupported.current) {
        recognitionRef.current = new SpeechRecognition();
      }
    }
  }, []);

  // Configure speech recognition
  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    
    recognition.language = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let finalConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          finalConfidence = result[0].confidence;
        } else if (interimResults) {
          finalTranscript += result[0].transcript;
          finalConfidence = result[0].confidence;
        }
      }

      setTranscript(finalTranscript);
      setConfidence(finalConfidence);
    };

    recognition.onerror = (event: any) => {
      setError(new Error(event.error));
      setIsListening(false);
    };

    recognition.onnomatch = () => {
      setError(new Error('No speech was recognized'));
    };

    recognition.onspeechend = () => {
      recognition.stop();
    };

  }, [language, continuous, interimResults, maxAlternatives]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      setTranscript('');
      setConfidence(0);
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start recognition'));
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    try {
      recognitionRef.current.stop();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to stop recognition'));
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isSupported: isSupported.current,
    isListening,
    transcript,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

// Utility function to process speech text for different input types
export function processSpeechForInputType(text: string, type: 'text' | 'number' | 'tel' | 'currency'): string {
  const cleanText = text.trim().toLowerCase();
  
  switch (type) {
    case 'number':
      // Convert spoken numbers to digits
      return convertSpokenNumbersToDigits(cleanText);
    
    case 'tel':
      // Extract digits for phone numbers
      return cleanText.replace(/\D/g, '').slice(0, 10);
    
    case 'currency':
      // Extract numeric value for currency
      const currencyMatch = cleanText.match(/(\d+(?:\.\d{1,2})?)/);
      return currencyMatch ? currencyMatch[1] : '0';
    
    case 'text':
    default:
      return text.trim();
  }
}

// Helper function to convert spoken numbers to digits
function convertSpokenNumbersToDigits(text: string): string {
  const numberWords: { [key: string]: string } = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
    'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
    'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000',
    
    // Hindi numbers (basic)
    'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
    'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
    
    // Kannada numbers (basic)
    'ಸೊನ್ನೆ': '0', 'ಒಂದು': '1', 'ಎರಡು': '2', 'ಮೂರು': '3', 'ನಾಲ್ಕು': '4',
    'ಐದು': '5', 'ಆರು': '6', 'ಏಳು': '7', 'ಎಂಟು': '8', 'ಒಂಬತ್ತು': '9',
  };

  let result = text;
  
  // Replace number words with digits
  Object.entries(numberWords).forEach(([word, digit]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, digit);
  });

  // Extract only the numeric parts
  const numbers = result.match(/\d+/g);
  return numbers ? numbers.join('') : text;
}
