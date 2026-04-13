import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Milestone } from '../types';
import { TaskCard } from './TaskCard';
import { motion } from 'motion/react';

interface TimelineProps {
  milestones: Milestone[];
  onToggleMilestone: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ milestones, onToggleMilestone }) => {
  const activeMilestones = milestones.filter(m => m.status !== 'completed');
  
  const sortedMilestones = [...activeMilestones].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="relative space-y-4 pb-20">
      {/* Vertical Line */}
      <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200 -z-10" />

      {sortedMilestones.map((milestone, index) => (
        <motion.div
          key={milestone.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <TaskCard 
            milestone={milestone} 
            onToggle={onToggleMilestone} 
          />
        </motion.div>
      ))}

      {activeMilestones.length === 0 && milestones.length > 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-brand-600" />
          </div>
          <h3 className="text-lg font-display font-semibold text-slate-800 mb-2">
            Tudo pronto por agora!
          </h3>
          <p className="text-sm text-slate-500 max-w-[240px]">
            Você concluiu todos os marcos planejados. Que tal um descanso ou planejar algo novo?
          </p>
        </div>
      )}

      {milestones.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🗓️</span>
          </div>
          <h3 className="text-lg font-display font-semibold text-slate-800 mb-2">
            Seu dia está livre
          </h3>
          <p className="text-sm text-slate-500 max-w-[240px]">
            Toque no microfone abaixo e me conte o que você tem planejado para hoje.
          </p>
        </div>
      )}
    </div>
  );
};
