import React from 'react';
import { Milestone } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, MapPin, AlertCircle, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface TaskCardProps {
  milestone: Milestone;
  onToggle: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ milestone, onToggle }) => {
  const isCompleted = milestone.status === 'completed';
  
  const typeColors = {
    fixed: 'border-l-blue-500 bg-blue-50/30',
    flexible: 'border-l-brand-500 bg-brand-50/30',
    transition: 'border-l-slate-300 bg-slate-50/50',
    preparation: 'border-l-amber-400 bg-amber-50/30'
  };

  const typeLabels = {
    fixed: 'Compromisso Fixo',
    flexible: 'Tarefa Flexível',
    transition: 'Deslocamento / Transição',
    preparation: 'Preparação'
  };

  const typeIcons = {
    fixed: <AlertCircle className="w-3 h-3" />,
    flexible: <Target className="w-3 h-3" />,
    transition: <MapPin className="w-3 h-3" />,
    preparation: <Clock className="w-3 h-3" />
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex gap-4 p-4 rounded-2xl border-l-4 shadow-sm glass transition-all ${
        typeColors[milestone.type]
      } ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      <button 
        onClick={() => onToggle(milestone.id)}
        className="mt-1 flex-shrink-0"
      >
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-brand-600" />
        ) : (
          <Circle className="w-6 h-6 text-slate-300 hover:text-brand-500 transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className={`font-display text-lg font-bold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {milestone.title}
          </h3>
          <span className="text-xs font-mono font-medium text-slate-500 whitespace-nowrap">
            {format(parseISO(milestone.startTime), 'HH:mm')}
          </span>
        </div>

        {milestone.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
            {milestone.description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-2">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {typeIcons[milestone.type]}
            <span>
              {typeLabels[milestone.type]}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Clock className="w-3 h-3" />
            <span>
              {format(parseISO(milestone.startTime), 'HH:mm')} - {format(parseISO(milestone.endTime), 'HH:mm')}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
