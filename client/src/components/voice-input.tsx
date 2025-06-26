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
        // Convert spoken words to numbers and handle decimals
        processedText = processedText
          .toLowerCase()
          .replace(/point|dot|\./g, '.')
          .replace(/thirty[\s-]?eight/g, '38')
          .replace(/thirty[\s-]?nine/g, '39')
          .replace(/thirty[\s-]?seven/g, '37')
          .replace(/thirty[\s-]?six/g, '36')
          .replace(/thirty[\s-]?five/g, '35')
          .replace(/thirty[\s-]?four/g, '34')
          .replace(/thirty[\s-]?three/g, '33')
          .replace(/thirty[\s-]?two/g, '32')
          .replace(/thirty[\s-]?one/g, '31')
          .replace(/thirty/g, '30')
          .replace(/twenty[\s-]?nine/g, '29')
          .replace(/twenty[\s-]?eight/g, '28')
          .replace(/twenty[\s-]?seven/g, '27')
          .replace(/twenty[\s-]?six/g, '26')
          .replace(/twenty[\s-]?five/g, '25')
          .replace(/twenty[\s-]?four/g, '24')
          .replace(/twenty[\s-]?three/g, '23')
          .replace(/twenty[\s-]?two/g, '22')
          .replace(/twenty[\s-]?one/g, '21')
          .replace(/twenty/g, '20')
          .replace(/nineteen/g, '19')
          .replace(/eighteen/g, '18')
          .replace(/seventeen/g, '17')
          .replace(/sixteen/g, '16')
          .replace(/fifteen/g, '15')
          .replace(/fourteen/g, '14')
          .replace(/thirteen/g, '13')
          .replace(/twelve/g, '12')
          .replace(/eleven/g, '11')
          .replace(/ten/g, '10')
          .replace(/nine/g, '9')
          .replace(/eight/g, '8')
          .replace(/seven/g, '7')
          .replace(/six/g, '6')
          .replace(/five/g, '5')
          .replace(/four/g, '4')
          .replace(/three/g, '3')
          .replace(/two/g, '2')
          .replace(/one/g, '1')
          .replace(/zero/g, '0');
        
        // Extract numbers with decimal points from the processed text
        const numberMatch = processedText.match(/(\d+\.?\d*)/);
        if (numberMatch) {
          processedText = numberMatch[1];
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
