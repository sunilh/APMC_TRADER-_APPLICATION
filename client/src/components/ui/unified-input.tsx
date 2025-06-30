import React, { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceRecognition } from "@/lib/voice-recognition";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface UnifiedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  enableVoice?: boolean;
  voiceType?: "text" | "number" | "tel" | "currency";
}

export const UnifiedInput = forwardRef<HTMLInputElement, UnifiedInputProps>(
  ({ enableVoice = true, voiceType, className, onChange, value, ...props }, ref) => {
    const { language } = useI18n();
    const [isListening, setIsListening] = useState(false);
    const [voiceProcessing, setVoiceProcessing] = useState(false);

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

    // Process voice input when transcript is ready
    useEffect(() => {
      if (transcript && confidence > 0.6) {
        setVoiceProcessing(true);
        
        let processedText = transcript.trim();
        const inputType = voiceType || props.type;
        
        // Smart text processing based on input type
        if (inputType === "number" || inputType === "currency") {
          processedText = processNumberText(processedText, language);
        } else if (inputType === "tel") {
          processedText = processPhoneText(processedText);
        } else if (inputType === "email") {
          processedText = processEmailText(processedText);
        }
        
        // Create synthetic event for onChange
        if (onChange) {
          const syntheticEvent = {
            target: { 
              value: processedText, 
              name: props.name,
              type: props.type 
            }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
        
        setTimeout(() => {
          setVoiceProcessing(false);
          stopListening();
        }, 500);
      }
    }, [transcript, confidence, voiceType, props.type, props.name, language, onChange, stopListening]);

    // Voice button handler
    const handleVoiceClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    };

    // Enhanced number processing with trilingual support
    const processNumberText = (text: string, lang: string): string => {
      let processed = text.toLowerCase();
      
      // English number words
      const englishNumbers = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
        'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
        'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
        'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
        'eighty': '80', 'ninety': '90', 'hundred': '100'
      };
      
      if (lang === 'hi') {
        const hindiNumbers = {
          'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
          'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
          'दस': '10', 'ग्यारह': '11', 'बारह': '12', 'तेरह': '13', 'चौदह': '14',
          'पंद्रह': '15', 'सोलह': '16', 'सत्रह': '17', 'अठारह': '18', 'उन्नीस': '19',
          'बीस': '20', 'तीस': '30', 'चालीस': '40', 'पचास': '50',
          'साठ': '60', 'सत्तर': '70', 'अस्सी': '80', 'नब्बे': '90', 'सौ': '100'
        };
        Object.entries(hindiNumbers).forEach(([hindi, number]) => {
          processed = processed.replace(new RegExp(hindi, 'g'), number);
        });
      } else if (lang === 'kn') {
        const kannadaNumbers = {
          'ಸೊನ್ನೆ': '0', 'ಒಂದು': '1', 'ಎರಡು': '2', 'ಮೂರು': '3', 'ನಾಲ್ಕು': '4',
          'ಐದು': '5', 'ಆರು': '6', 'ಏಳು': '7', 'ಎಂಟು': '8', 'ಒಂಬತ್ತು': '9',
          'ಹತ್ತು': '10', 'ಹನ್ನೊಂದು': '11', 'ಹನ್ನೆರಡು': '12', 'ಹದಿಮೂರು': '13',
          'ಹದಿನಾಲ್ಕು': '14', 'ಹದಿನೈದು': '15', 'ಹದಿನಾರು': '16', 'ಹದಿನೇಳು': '17',
          'ಹದಿನೆಂಟು': '18', 'ಹತ್ತೊಂಬತ್ತು': '19', 'ಇಪ್ಪತ್ತು': '20',
          'ಮೂವತ್ತು': '30', 'ನಲವತ್ತು': '40', 'ಐವತ್ತು': '50', 'ಅರವತ್ತು': '60',
          'ಎಪ್ಪತ್ತು': '70', 'ಎಂಬತ್ತು': '80', 'ತೊಂಬತ್ತು': '90', 'ನೂರು': '100'
        };
        Object.entries(kannadaNumbers).forEach(([kannada, number]) => {
          processed = processed.replace(new RegExp(kannada, 'g'), number);
        });
      }
      
      // English number processing
      Object.entries(englishNumbers).forEach(([word, number]) => {
        processed = processed.replace(new RegExp(word, 'g'), number);
      });
      
      // Handle decimal points
      processed = processed.replace(/point|dot|decimal/gi, '.');
      processed = processed.replace(/[^\d.]/g, '');
      
      return processed;
    };

    const processPhoneText = (text: string): string => {
      return text.replace(/[^\d]/g, '');
    };

    const processEmailText = (text: string): string => {
      return text.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/at/gi, '@')
        .replace(/dot/gi, '.');
    };

    const showVoiceButton = enableVoice && isSupported && !props.disabled;

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          {...props}
          value={value}
          onChange={onChange}
          className={cn(
            showVoiceButton && "pr-12",
            isListening && "ring-2 ring-red-200 border-red-300",
            voiceProcessing && "bg-green-50",
            className
          )}
        />
        
        {/* Voice Button */}
        {showVoiceButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleVoiceClick}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0",
              "hover:bg-gray-100 focus:ring-2 focus:ring-gray-200",
              "transition-all duration-200 ease-in-out",
              isListening && "bg-red-100 text-red-600 hover:bg-red-200",
              voiceProcessing && "bg-green-100 text-green-600"
            )}
          >
            {voiceProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {/* Status Indicators */}
        {isListening && (
          <div className="absolute -bottom-5 left-0 text-xs text-red-600 font-medium">
            🎤 Listening...
          </div>
        )}
        
        {voiceProcessing && (
          <div className="absolute -bottom-5 left-0 text-xs text-green-600 font-medium">
            ✓ Processing...
          </div>
        )}
        
        {recognitionError && (
          <div className="absolute -bottom-5 left-0 text-xs text-red-500">
            ⚠ Voice error
          </div>
        )}
      </div>
    );
  }
);

UnifiedInput.displayName = "UnifiedInput";