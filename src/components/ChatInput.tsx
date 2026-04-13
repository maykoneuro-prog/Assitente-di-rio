import React, { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInputProps {
  onSend: (text: string) => void;
  isProcessing: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isProcessing }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'pt-BR';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onSend(transcript);
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onSend]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognition?.stop();
    } else {
      recognition?.start();
      setIsListening(true);
    }
  }, [isListening, recognition]);

  const handleSend = () => {
    if (inputText.trim() && !isProcessing) {
      onSend(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite seus planos ou use a voz..."
            className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-5 pr-14 text-[15px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all resize-none min-h-[56px] max-h-32 no-scrollbar shadow-sm"
            rows={1}
            disabled={isProcessing || isListening}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing || isListening}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-500 hover:bg-brand-50 rounded-xl transition-colors disabled:opacity-30"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`p-4 rounded-[1.5rem] transition-all shadow-lg ${
            isListening 
              ? 'bg-red-500 text-white shadow-red-100' 
              : 'bg-brand-500 text-white shadow-brand-100 hover:bg-brand-600'
          } disabled:opacity-50 relative`}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          
          {isListening && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-red-400 rounded-2xl -z-10"
            />
          )}
        </button>
      </div>
      
      <AnimatePresence>
        {isListening && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[10px] font-bold uppercase tracking-wider text-red-500 text-center"
          >
            Ouvindo agora...
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
