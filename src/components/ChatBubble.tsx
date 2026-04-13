import React from 'react';
import { motion } from 'motion/react';

interface ChatBubbleProps {
  message: string;
  role: 'user' | 'model';
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, role }) => {
  const isModel = role === 'model';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`flex ${isModel ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div
        className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
          isModel
            ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
            : 'bg-brand-500 text-white rounded-tr-none'
        }`}
      >
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </motion.div>
  );
};
