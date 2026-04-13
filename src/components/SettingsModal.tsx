import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Trash2, LogOut, UserCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onResetProfile: () => void;
  onLogout: () => void;
  userEmail: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onEditProfile,
  onResetProfile,
  onLogout,
  userEmail
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-display font-bold text-slate-900">Configurações</h2>
                <button 
                  onClick={onClose}
                  className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                    <UserCircle className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conta</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{userEmail}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onEditProfile();
                    onClose();
                  }}
                  className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-all group"
                >
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500 group-hover:bg-brand-100 transition-colors">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700">Ajustar Perfil e Rotinas</span>
                </button>

                <button
                  onClick={() => {
                    onResetProfile();
                    onClose();
                  }}
                  className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:bg-red-50 transition-all group"
                >
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700">Esquecer Perfil e Recomeçar</span>
                </button>

                <div className="pt-4">
                  <button
                    onClick={onLogout}
                    className="w-full p-4 text-slate-400 font-bold flex items-center justify-center gap-2 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
