import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Milestone } from '../types';
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { 
  Mountain, 
  Waves, 
  Trees, 
  Flame, 
  Cloud, 
  Flag, 
  Navigation, 
  CheckCircle2, 
  Clock,
  Compass
} from 'lucide-react';

interface DayMapProps {
  milestones: Milestone[];
  onToggleMilestone: (id: string) => void;
}

export const DayMap: React.FC<DayMapProps> = ({ milestones, onToggleMilestone }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [milestones]);

  const stats = useMemo(() => {
    if (sortedMilestones.length === 0) return { dayProgress: 0, missionProgress: 0 };

    const firstTask = parseISO(sortedMilestones[0].startTime);
    const lastTask = parseISO(sortedMilestones[sortedMilestones.length - 1].endTime);
    
    // Day Progress: from 07:00 to 23:00 or task range
    const dayStart = startOfDay(now).setHours(7, 0, 0, 0);
    const dayEnd = startOfDay(now).setHours(23, 0, 0, 0);
    
    const totalDayMins = differenceInMinutes(dayEnd, dayStart);
    const elapsedMins = Math.max(0, Math.min(totalDayMins, differenceInMinutes(now, dayStart)));
    const dayProgress = Math.round((elapsedMins / totalDayMins) * 100);

    // Mission Progress: completed duration vs total planned duration
    const totalPlannedMins = sortedMilestones.reduce((acc, m) => 
      acc + differenceInMinutes(parseISO(m.endTime), parseISO(m.startTime)), 0
    );
    const completedMins = sortedMilestones
      .filter(m => m.status === 'completed')
      .reduce((acc, m) => acc + differenceInMinutes(parseISO(m.endTime), parseISO(m.startTime)), 0);
    
    const missionProgress = totalPlannedMins > 0 ? Math.round((completedMins / totalPlannedMins) * 100) : 0;

    return { dayProgress, missionProgress };
  }, [sortedMilestones, now]);

  const getIslandIcon = (type: string, index: number) => {
    const icons = [Mountain, Waves, Trees, Flame, Cloud];
    const Icon = icons[index % icons.length];
    
    switch(type) {
      case 'fixed': return <Flame className="w-6 h-6" />;
      case 'transition': return <Navigation className="w-6 h-6" />;
      case 'preparation': return <Compass className="w-6 h-6" />;
      default: return <Icon className="w-6 h-6" />;
    }
  };

  const getIslandColor = (status: string, type: string) => {
    if (status === 'completed') return 'bg-emerald-500 text-white shadow-emerald-200';
    switch(type) {
      case 'fixed': return 'bg-orange-500 text-white shadow-orange-200';
      case 'transition': return 'bg-slate-400 text-white shadow-slate-200';
      case 'preparation': return 'bg-amber-400 text-white shadow-amber-200';
      default: return 'bg-brand-500 text-white shadow-brand-200';
    }
  };

  const nextTask = useMemo(() => {
    return sortedMilestones.find(m => m.status !== 'completed' && isAfter(parseISO(m.endTime), now));
  }, [sortedMilestones, now]);

  return (
    <div className="flex flex-col h-full bg-sky-50/30 rounded-[2.5rem] overflow-hidden relative">
      {/* Background clouds or patterns could go here */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 w-20 h-10 bg-white rounded-full blur-xl" />
        <div className="absolute top-40 right-10 w-32 h-16 bg-white rounded-full blur-2xl" />
        <div className="absolute bottom-40 left-20 w-24 h-12 bg-white rounded-full blur-xl" />
      </div>

      {/* Stats Header */}
      <div className="p-6 bg-white/40 backdrop-blur-xl border-b border-sky-100/50 space-y-4 relative z-20 mx-6 mt-2 rounded-3xl shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Jornada Diária</span>
              <span className="text-sm font-display font-black text-slate-900">{stats.dayProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.dayProgress}%` }}
                className="h-full bg-slate-400"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-400">Objetivos</span>
              <span className="text-sm font-display font-black text-brand-600">{stats.missionProgress}%</span>
            </div>
            <div className="h-1.5 bg-brand-50 rounded-full overflow-hidden border border-brand-100/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.missionProgress}%` }}
                className="h-full bg-brand-500 shadow-[0_0_10px_rgba(79,110,247,0.3)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-8 relative z-10">
        {sortedMilestones.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center shadow-2xl shadow-sky-200/50 border-8 border-sky-50"
            >
              <Compass className="w-14 h-14 text-sky-200" />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-2xl font-display font-black text-slate-800">Mapa Vazio</h3>
              <p className="text-sm text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                Seu arquipélago de tarefas ainda não foi descoberto. <br />
                <span className="text-brand-500 font-bold">Me conte seus planos!</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-16 pb-32">
            {sortedMilestones.map((m, i) => {
              const isPast = isBefore(parseISO(m.endTime), now);
              const isCurrent = !isPast && isAfter(now, parseISO(m.startTime));
              const isCompleted = m.status === 'completed';

              return (
                <div key={m.id} className="relative flex flex-col items-center w-full">
                  {/* Bridge to next island */}
                  {i < sortedMilestones.length - 1 && (
                    <div className="absolute top-20 bottom-[-64px] w-2 bg-slate-200/50 rounded-full overflow-hidden">
                      {isPast && <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: '100%' }}
                        className="w-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" 
                      />}
                    </div>
                  )}

                  {/* Island Container */}
                  <div className="relative">
                    {/* Shadow/Water Ripple */}
                    <div className="absolute inset-0 bg-sky-200/30 blur-2xl rounded-full scale-150 -z-10" />
                    
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onToggleMilestone(m.id)}
                      className={`relative z-10 w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all duration-700 border-4 border-white/50 ${getIslandColor(m.status, m.type)} ${!isCompleted && isPast ? 'grayscale opacity-40' : ''}`}
                    >
                      {getIslandIcon(m.type, i)}
                      
                      {/* Time Badge */}
                      <div className="absolute -right-14 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-xl shadow-lg border border-slate-100">
                        <span className="text-[10px] font-black text-slate-600">
                          {format(parseISO(m.startTime), 'HH:mm')}
                        </span>
                      </div>

                      {/* Completion Check */}
                      {isCompleted && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-3 -right-3 bg-emerald-500 rounded-full p-1.5 shadow-xl border-2 border-white"
                        >
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </motion.div>
                      )}

                      {/* Current Indicator */}
                      {isCurrent && (
                        <motion.div 
                          animate={{ y: [0, -8, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col items-center"
                        >
                          <div className="bg-brand-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter mb-1 shadow-lg shadow-brand-200">Você</div>
                          <div className="w-3 h-3 bg-brand-500 rounded-full border-2 border-white shadow-md" />
                        </motion.div>
                      )}
                    </motion.button>
                  </div>

                  {/* Island Label */}
                  <div className="mt-6 text-center max-w-[160px]">
                    <h4 className={`text-base font-display font-black leading-tight tracking-tight ${isCompleted ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {m.title}
                    </h4>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded-full border border-slate-100">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold">
                          {differenceInMinutes(parseISO(m.endTime), parseISO(m.startTime))}m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Task Floating Card */}
      <AnimatePresence>
        {nextTask && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-6 right-6 z-30"
          >
            <div className="bg-white/90 backdrop-blur-2xl p-4 rounded-[2rem] shadow-2xl border border-white/50 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getIslandColor(nextTask.status, nextTask.type)}`}>
                {getIslandIcon(nextTask.type, 0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-0.5">Próxima Parada</p>
                <h5 className="text-sm font-display font-bold text-slate-800 truncate">{nextTask.title}</h5>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-900">{format(parseISO(nextTask.startTime), 'HH:mm')}</p>
                <p className="text-[10px] font-bold text-slate-400">em {differenceInMinutes(parseISO(nextTask.startTime), now)} min</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
