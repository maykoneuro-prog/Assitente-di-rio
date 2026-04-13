import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Clock, 
  MapPin, 
  Utensils, 
  Dumbbell, 
  Church, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Users,
  Heart,
  ShoppingBag,
  Plus,
  Trash2,
  X,
  Trophy as TrophyIcon
} from 'lucide-react';
import { UserProfile, Routine } from '../types';

interface OnboardingProps {
  onComplete: (settings: UserProfile['settings']) => void;
  userName: string;
  initialSettings?: UserProfile['settings'];
}

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, userName, initialSettings }) => {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<UserProfile['settings']>(initialSettings || {
    adhdMode: true,
    notificationsEnabled: true,
    onboardingCompleted: false,
    workDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
    workStart: '09:00',
    workEnd: '18:00',
    commuteToWork: 30,
    commuteToHome: 30,
    lunchDuration: 60,
    routines: []
  });

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customRoutine, setCustomRoutine] = useState({
    title: '',
    days: ['Seg'],
    startTime: '18:00',
    duration: 60
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const toggleDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day) 
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };

  const addRoutine = (type: string, customTitle?: string) => {
    const titles: Record<string, string> = { 
      academia: 'Academia', 
      igreja: 'Igreja', 
      estudo: 'Estudo/Leitura',
      familia: 'Visitar Família',
      terapia: 'Terapia',
      esporte: 'Esporte/Lazer',
      mercado: 'Mercado/Compras'
    };

    const newRoutine: Routine = {
      id: Math.random().toString(36).substr(2, 9),
      title: customTitle || titles[type] || 'Nova Rotina',
      days: customTitle ? customRoutine.days : ['Seg', 'Qua', 'Sex'],
      startTime: customTitle ? customRoutine.startTime : '19:00',
      duration: customTitle ? customRoutine.duration : 60
    };

    setSettings(prev => ({
      ...prev,
      routines: [...prev.routines, newRoutine]
    }));
    setShowCustomForm(false);
    setCustomRoutine({ title: '', days: ['Seg'], startTime: '18:00', duration: 60 });
  };

  const toggleCustomDay = (day: string) => {
    setCustomRoutine(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const removeRoutine = (id: string) => {
    setSettings(prev => ({
      ...prev,
      routines: prev.routines.filter(r => r.id !== id)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl overflow-hidden relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
          <motion.div 
            className="h-full bg-brand-500"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {initialSettings && (
          <button 
            onClick={() => onComplete(initialSettings)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 z-50"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-brand-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Olá, {userName}!</h2>
                  <p className="text-slate-500 text-sm mt-2">Vamos configurar seu horário de trabalho.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Dias de Trabalho</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            settings.workDays.includes(day)
                              ? 'bg-brand-500 text-white shadow-md shadow-brand-100'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Início</label>
                      <input 
                        type="time" 
                        value={settings.workStart}
                        onChange={e => setSettings({...settings, workStart: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Fim</label>
                      <input 
                        type="time" 
                        value={settings.workEnd}
                        onChange={e => setSettings({...settings, workEnd: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Deslocamento</h2>
                  <p className="text-slate-500 text-sm mt-2">Quanto tempo você leva no trânsito?</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Casa → Trabalho (minutos)</label>
                    <input 
                      type="number" 
                      value={settings.commuteToWork}
                      onChange={e => setSettings({...settings, commuteToWork: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Trabalho → Casa (minutos)</label>
                    <input 
                      type="number" 
                      value={settings.commuteToHome}
                      onChange={e => setSettings({...settings, commuteToHome: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                      <Utensils className="w-3 h-3" /> Tempo de Almoço (minutos)
                    </label>
                    <input 
                      type="number" 
                      value={settings.lunchDuration}
                      onChange={e => setSettings({...settings, lunchDuration: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Suas Rotinas</h2>
                  <p className="text-slate-500 text-sm mt-2">Adicione atividades fixas recorrentes.</p>
                </div>

                <div className="space-y-4">
                  {!showCustomForm ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addRoutine('academia')} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-brand-500" /> Academia
                      </button>
                      <button onClick={() => addRoutine('igreja')} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <Church className="w-4 h-4 text-brand-500" /> Igreja
                      </button>
                      <button onClick={() => addRoutine('estudo')} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-brand-500" /> Estudo
                      </button>
                      <button onClick={() => addRoutine('familia')} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-500" /> Família
                      </button>
                      <button onClick={() => addRoutine('terapia')} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-brand-500" /> Terapia
                      </button>
                      <button onClick={() => addRoutine('esporte')} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <TrophyIcon className="w-4 h-4 text-brand-500" /> Esporte
                      </button>
                      <button onClick={() => addRoutine('mercado')} className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-brand-500" /> Mercado
                      </button>
                      <button 
                        onClick={() => setShowCustomForm(true)}
                        className="p-3 bg-brand-50 rounded-xl text-xs font-bold text-brand-600 hover:bg-brand-100 flex items-center gap-2 border border-brand-100"
                      >
                        <Plus className="w-4 h-4" /> Personalizar
                      </button>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 p-4 rounded-2xl space-y-4 border border-slate-200"
                    >
                      <h3 className="text-sm font-bold text-slate-700">Nova Rotina Personalizada</h3>
                      <input 
                        type="text"
                        placeholder="Ex: Visitar os pais"
                        value={customRoutine.title}
                        onChange={e => setCustomRoutine({...customRoutine, title: e.target.value})}
                        className="w-full bg-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20"
                      />
                      <div className="flex flex-wrap gap-1">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            onClick={() => toggleCustomDay(day)}
                            className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                              customRoutine.days.includes(day)
                                ? 'bg-brand-500 text-white'
                                : 'bg-white text-slate-400'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="time"
                          value={customRoutine.startTime}
                          onChange={e => setCustomRoutine({...customRoutine, startTime: e.target.value})}
                          className="flex-1 bg-white border-none rounded-xl p-3 text-sm"
                        />
                        <button 
                          onClick={() => addRoutine('custom', customRoutine.title)}
                          disabled={!customRoutine.title}
                          className="bg-brand-500 text-white px-4 rounded-xl text-xs font-bold disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                        <button 
                          onClick={() => setShowCustomForm(false)}
                          className="text-slate-400 px-2 text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {settings.routines.map(r => (
                      <div key={r.id} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{r.title}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{r.days.join(', ')} às {r.startTime}</p>
                        </div>
                        <button onClick={() => removeRoutine(r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-8"
              >
                <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-brand-100">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Tudo Pronto!</h2>
                  <p className="text-slate-500 text-sm mt-2">
                    Agora o Tempo Amigo conhece sua rotina e vai te ajudar a orquestrar seu dia de forma muito mais inteligente.
                  </p>
                </div>
                <button
                  onClick={() => onComplete({...settings, onboardingCompleted: true})}
                  className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all"
                >
                  Começar meu dia
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 4 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className="p-3 text-slate-400 hover:text-slate-600 disabled:opacity-0 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextStep}
                className="bg-brand-500 text-white p-3 rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all flex items-center gap-2 px-6"
              >
                <span className="font-bold">Próximo</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
