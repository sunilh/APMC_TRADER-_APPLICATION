import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useVoiceRecognition } from "@/lib/voice-recognition";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "tel" | "currency";
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({ 
  onResult, 
  placeholder = "Voice input", 
  type = "text",
  disabled = false,
  className 
}: VoiceInputProps) {
  const { language } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isSupported,
    isListening: recognitionListening,
    startListening,
    stopListening,
    transcript,
    confidence,
    error: recognitionError,
  } = useVoiceRecognition({
    language: language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN',
    continuous: false,
    interimResults: false,
  });

  useEffect(() => {
    setIsListening(recognitionListening);
  }, [recognitionListening]);

  useEffect(() => {
    if (transcript && confidence > 0.7) {
      let processedText = transcript.trim();
      
      // Process based on input type
      if (type === "number" || type === "currency" || type === "tel") {
        // Extract numbers from speech
        const numbers = processedText.match(/\d+/g);
        if (numbers) {
          processedText = numbers.join('');
        }
      }
      
      onResult(processedText);
      setError(null);
    } else if (transcript && confidence <= 0.7) {
      setError("Low confidence. Please try again.");
    }
  }, [transcript, confidence, onResult, type]);

  useEffect(() => {
    if (recognitionError) {
      setError(recognitionError.message);
      setIsListening(false);
    }
  }, [recognitionError]);

  const handleToggleListening = () => {
    if (!isSupported) {
      setError("Voice recognition not supported in this browser");
      return;
    }

    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      setError(null);
      startListening();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={handleToggleListening}
        className={cn(
          "p-2 h-10 w-10",
          isListening && "mic-active",
          error && "text-destructive",
          className
        )}
        title={placeholder}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {error && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-destructive text-destructive-foreground text-xs rounded shadow-lg whitespace-nowrap z-10">
          {error}
        </div>
      )}
      
      {isListening && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-primary text-primary-foreground text-xs rounded shadow-lg whitespace-nowrap z-10">
          Listening... Speak now
        </div>
      )}
    </div>
  );
}
