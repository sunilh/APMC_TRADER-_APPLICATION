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
        // Convert spoken words to numbers and handle decimals (English, Hindi, Kannada)
        processedText = processedText
          .toLowerCase()
          // Decimal point recognition
          .replace(/point|dot|दशमलव|ಬಿಂದು/g, '.')
          // English numbers 30-39
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
          // English numbers 20-29
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
          // English numbers 10-19
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
          // English numbers 0-9
          .replace(/nine/g, '9')
          .replace(/eight/g, '8')
          .replace(/seven/g, '7')
          .replace(/six/g, '6')
          .replace(/five/g, '5')
          .replace(/four/g, '4')
          .replace(/three/g, '3')
          .replace(/two/g, '2')
          .replace(/one/g, '1')
          .replace(/zero/g, '0')
          // Kannada numbers (ಕನ್ನಡ ಸಂಖ್ಯೆಗಳು)
          .replace(/ಮೂವತ್ತೆಂಟು|೩೮/g, '38')
          .replace(/ಮೂವತ್ತೊಂಬತ್ತು|೩೯/g, '39')
          .replace(/ಮೂವತ್ತೇಳು|೩೭/g, '37')
          .replace(/ಮೂವತ್ತಾರು|೩೬/g, '36')
          .replace(/ಮೂವತ್ತೈದು|೩೫/g, '35')
          .replace(/ಮೂವತ್ತನಾಲ್ಕು|೩೪/g, '34')
          .replace(/ಮೂವತ್ತಮೂರು|೩೩/g, '33')
          .replace(/ಮೂವತ್ತೆರಡು|೩೨/g, '32')
          .replace(/ಮೂವತ್ತೊಂದು|೩೧/g, '31')
          .replace(/ಮೂವತ್ತು|೩೦/g, '30')
          .replace(/ಇಪ್ಪತ್ತೊಂಬತ್ತು|೨೯/g, '29')
          .replace(/ಇಪ್ಪತ್ತೆಂಟು|೨೮/g, '28')
          .replace(/ಇಪ್ಪತ್ತೇಳು|೨೭/g, '27')
          .replace(/ಇಪ್ಪತ್ತಾರು|೨೬/g, '26')
          .replace(/ಇಪ್ಪತ್ತೈದು|೨೫/g, '25')
          .replace(/ಇಪ್ಪತ್ತನಾಲ್ಕು|೨೪/g, '24')
          .replace(/ಇಪ್ಪತ್ತಮೂರು|೨೩/g, '23')
          .replace(/ಇಪ್ಪತ್ತೆರಡು|೨೨/g, '22')
          .replace(/ಇಪ್ಪತ್ತೊಂದು|೨೧/g, '21')
          .replace(/ಇಪ್ಪತ್ತು|೨೦/g, '20')
          .replace(/ಹತ್ತೊಂಬತ್ತು|೧೯/g, '19')
          .replace(/ಹದಿನೆಂಟು|೧೮/g, '18')
          .replace(/ಹದಿನೇಳು|೧೭/g, '17')
          .replace(/ಹದಿನಾರು|೧೬/g, '16')
          .replace(/ಹದಿನೈದು|೧೫/g, '15')
          .replace(/ಹದಿನಾಲ್ಕು|೧೪/g, '14')
          .replace(/ಹದಿಮೂರು|೧೩/g, '13')
          .replace(/ಹನ್ನೆರಡು|೧೨/g, '12')
          .replace(/ಹದಿನೊಂದು|೧೧/g, '11')
          .replace(/ಹತ್ತು|೧೦/g, '10')
          .replace(/ಒಂಬತ್ತು|೯/g, '9')
          .replace(/ಎಂಟು|೮/g, '8')
          .replace(/ಏಳು|೭/g, '7')
          .replace(/ಆರು|೬/g, '6')
          .replace(/ಐದು|೫/g, '5')
          .replace(/ನಾಲ್ಕು|೪/g, '4')
          .replace(/ಮೂರು|೩/g, '3')
          .replace(/ಎರಡು|೨/g, '2')
          .replace(/ಒಂದು|೧/g, '1')
          .replace(/ಸೊನ್ನೆ|೦/g, '0')
          // Hindi numbers (हिन्दी संख्याएं)
          .replace(/अड़तीस|३८/g, '38')
          .replace(/उनतालीस|३९/g, '39')
          .replace(/सैंतीस|३७/g, '37')
          .replace(/छत्तीस|३६/g, '36')
          .replace(/पैंतीस|३५/g, '35')
          .replace(/चौंतीस|३४/g, '34')
          .replace(/तैंतीस|३३/g, '33')
          .replace(/बत्तीस|३२/g, '32')
          .replace(/इकतीस|३१/g, '31')
          .replace(/तीस|३०/g, '30')
          .replace(/उनतीस|२९/g, '29')
          .replace(/अट्ठाईस|२८/g, '28')
          .replace(/सत्ताईस|२७/g, '27')
          .replace(/छब्बीस|२६/g, '26')
          .replace(/पच्चीस|२५/g, '25')
          .replace(/चौबीस|२४/g, '24')
          .replace(/तेईस|२३/g, '23')
          .replace(/बाईस|२२/g, '22')
          .replace(/इक्कीस|२१/g, '21')
          .replace(/बीस|२०/g, '20')
          .replace(/उन्नीस|१९/g, '19')
          .replace(/अठारह|१८/g, '18')
          .replace(/सत्रह|१७/g, '17')
          .replace(/सोलह|१६/g, '16')
          .replace(/पंद्रह|१५/g, '15')
          .replace(/चौदह|१४/g, '14')
          .replace(/तेरह|१३/g, '13')
          .replace(/बारह|१२/g, '12')
          .replace(/ग्यारह|११/g, '11')
          .replace(/दस|१०/g, '10')
          .replace(/नौ|९/g, '9')
          .replace(/आठ|८/g, '8')
          .replace(/सात|७/g, '7')
          .replace(/छह|६/g, '6')
          .replace(/पांच|५/g, '5')
          .replace(/चार|४/g, '4')
          .replace(/तीन|३/g, '3')
          .replace(/दो|२/g, '2')
          .replace(/एक|१/g, '1')
          .replace(/शून्य|०/g, '0');
        
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
