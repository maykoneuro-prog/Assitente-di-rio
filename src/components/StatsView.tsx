import React from 'react';
import { UserProfile } from '../types';
import { Trophy, Star, Target, Zap, CheckCircle, Sparkles, Settings, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface StatsViewProps {
  profile: UserProfile | null;
  onGenerateSummary: () => void;
  onEditProfile: () => void;
  onResetProfile: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ profile, onGenerateSummary, onEditProfile, onResetProfile }) => {
  if (!profile) return null;

  const stats = [
    { label: 'Pontos Totais', value: profile.stats.points, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Sequência', value: `${profile.stats.streak} dias`, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Concluídos', value: profile.stats.completedMilestones, icon: CheckCircle, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Total Criado', value: profile.stats.totalMilestones, icon: Target, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-3xl text-center">
        <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-100">
          <Star className="w-10 h-10 text-white fill-current" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Nível {Math.floor(profile.stats.points / 100) + 1}</h2>
        <p className="text-slate-500 text-sm">Continue assim para subir de nível!</p>
        
        <div className="mt-6 w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${profile.stats.points % 100}%` }}
            className="bg-brand-500 h-full"
          />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">
          {profile.stats.points % 100} / 100 XP para o próximo nível
        </p>
      </div>

      <button
        onClick={onGenerateSummary}
        className="w-full py-4 bg-brand-50 border border-brand-200 rounded-2xl font-semibold text-brand-700 shadow-sm hover:bg-brand-100 transition-all flex items-center justify-center gap-3"
      >
        <Sparkles className="w-5 h-5" />
        Gerar Resumo do Dia
      </button>

      <button
        onClick={onEditProfile}
        className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
      >
        <Settings className="w-5 h-5" />
        Ajustar Perfil e Rotinas
      </button>

      <button
        onClick={onResetProfile}
        className="w-full py-4 bg-red-50 border border-red-100 rounded-2xl font-semibold text-red-600 shadow-sm hover:bg-red-100 transition-all flex items-center justify-center gap-3"
      >
        <Trash2 className="w-5 h-5" />
        Esquecer Perfil e Recomeçar
      </button>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-4 rounded-2xl"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-slate-800">{stat.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
