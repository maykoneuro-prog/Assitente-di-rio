import { useState, useEffect, useRef } from 'react';
import { auth, db, messaging } from './lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { UserProfile, DailyPlan, Milestone, ChatMessage, Routine } from './types';
import { orchestrateDay, generateInitialPlan } from './services/geminiService';
import { ChatInput } from './components/ChatInput';
import { Timeline } from './components/Timeline';
import { ChatBubble } from './components/ChatBubble';
import { StatsView } from './components/StatsView';
import { Onboarding } from './components/Onboarding';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings,
  Trophy, 
  LogOut,
  Sparkles,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { orderBy, limit, deleteDoc } from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<DailyPlan | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'timeline' | 'stats'>('timeline');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Push Notifications Setup
  useEffect(() => {
    if (user) {
      const requestPermission = async () => {
        try {
          const m = await messaging;
          if (!m) return;

          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(m, {
              vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE' // User needs to replace this
            });
            if (token) {
              console.log('FCM Token:', token);
              await updateDoc(doc(db, 'users', user.uid), {
                fcmToken: token
              });
            }
          }

          const unsubscribe = onMessage(m, (payload) => {
            console.log('Message received in foreground:', payload);
          });
          return unsubscribe;
        } catch (error) {
          console.error('Error getting notification permission:', error);
        }
      };

      const unsubPromise = requestPermission();
      return () => {
        unsubPromise.then(unsub => unsub?.());
      };
    }
  }, [user]);

  // Auth & Data Listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubPlan: (() => void) | null = null;
    let unsubMilestones: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthLoading(false);
      
      // Cleanup previous listeners
      unsubProfile?.();
      unsubPlan?.();
      unsubMilestones?.();

      if (u) {
        // Load or create profile
        const profileRef = doc(db, 'users', u.uid);
        unsubProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            // Create initial profile if missing
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email!,
              displayName: u.displayName!,
              photoURL: u.photoURL || undefined,
              settings: {
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
              },
              stats: { points: 0, streak: 0, completedMilestones: 0, totalMilestones: 0 }
            };
            setDoc(profileRef, newProfile);
          }
        });

        // Load chat history
        const messagesRef = collection(db, 'users', u.uid, 'messages');
        const msgQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));
        onSnapshot(msgQuery, (snapshot) => {
          const msgs = snapshot.docs.map(doc => doc.data() as ChatMessage);
          if (msgs.length > 0) setMessages(msgs);
        });

        // Load today's plan
        const today = format(new Date(), 'yyyy-MM-dd');
        const plansRef = collection(db, 'plans');
        const q = query(plansRef, where('userId', '==', u.uid), where('date', '==', today));
        
        unsubPlan = onSnapshot(q, (snapshot) => {
          unsubMilestones?.(); // Cleanup old milestone listener
          
          if (!snapshot.empty) {
            const planDoc = snapshot.docs[0];
            const planData = planDoc.data() as DailyPlan;
            setCurrentPlan(planData);

            // Load milestones
            const milestonesRef = collection(db, 'plans', planDoc.id, 'milestones');
            unsubMilestones = onSnapshot(milestonesRef, (mSnap) => {
              const mData = mSnap.docs.map(doc => doc.data() as Milestone);
              setMilestones(mData);
            });
          } else {
            setCurrentPlan(null);
            setMilestones([]);
            // New day, show welcome message
            setMessages(prev => prev.length === 0 ? [{
              id: 'welcome',
              role: 'model',
              content: "Bom dia! Sou o Organiza.ai. O que temos para hoje? Pode me contar tudo o que você lembra, sem pressa e sem ordem.",
              timestamp: Date.now()
            }] : prev);
            setView('chat');
          }
        });
      }
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubPlan?.();
      unsubMilestones?.();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogout = () => auth.signOut();

  const handleResetProfile = async () => {
    if (!user) return;
    try {
      const pRef = doc(db, 'users', user.uid);
      // Reset settings to trigger onboarding
      await updateDoc(pRef, {
        'settings.onboardingCompleted': false,
        'stats.points': 0,
        'stats.streak': 0,
        'stats.completedMilestones': 0,
        'stats.totalMilestones': 0
      });
      setProfile(prev => prev ? { 
        ...prev, 
        settings: { ...prev.settings, onboardingCompleted: false },
        stats: { points: 0, streak: 0, completedMilestones: 0, totalMilestones: 0 }
      } : null);
      setIsEditingProfile(true);
      setView('timeline');
    } catch (error) {
      console.error("Error resetting profile:", error);
    }
  };

  const processAIResponse = async (response: any) => {
    if (!user || !profile) {
      console.warn("processAIResponse: missing user or profile");
      return;
    }

    console.log("Processing AI response with milestones:", response.suggestedMilestones?.length);

    if (response.suggestedMilestones && response.suggestedMilestones.length > 0) {
      try {
        // Create or update plan
        let planId = currentPlan?.id;
        const today = format(new Date(), 'yyyy-MM-dd');

        if (!planId) {
          console.log("Creating new plan for today:", today);
          const newPlanRef = await addDoc(collection(db, 'plans'), {
            userId: user.uid,
            date: today,
            status: 'draft',
            createdAt: serverTimestamp()
          });
          planId = newPlanRef.id;
          await updateDoc(newPlanRef, { id: planId });
        } else {
          console.log("Updating existing plan:", planId);
          // If plan exists, clean up old milestones to avoid duplicates
          const oldMilestonesRef = collection(db, 'plans', planId, 'milestones');
          const oldSnap = await getDocs(oldMilestonesRef);
          const deletePromises = oldSnap.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        }

        // Add milestones
        const milestonesRef = collection(db, 'plans', planId!, 'milestones');
        for (const m of response.suggestedMilestones) {
          const newMRef = doc(milestonesRef);
          const newMilestone: Milestone = {
            id: newMRef.id,
            planId: planId!,
            userId: user.uid,
            title: m.title || 'Sem título',
            description: m.description || '',
            startTime: m.startTime || new Date().toISOString(),
            endTime: m.endTime || new Date().toISOString(),
            type: m.type || 'flexible',
            status: 'pending',
            isActionable: true,
            order: milestones.length
          };
          await setDoc(newMRef, newMilestone);
        }
        
        console.log("Successfully added milestones to plan:", planId);

        // If it was a "Carga Inicial" or major update, maybe switch back to timeline
        if (response.isPlanComplete) {
          setTimeout(() => setView('timeline'), 1500);
        }
      } catch (err) {
        console.error("Error in processAIResponse:", err);
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'model',
          content: "Tive um erro técnico ao salvar seu plano no banco de dados. Por favor, tente novamente em alguns instantes.",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } else {
      console.warn("processAIResponse: No milestones found in response");
    }
  };

  const handleVoiceTranscript = async (text: string) => {
    if (!user || !profile) return;
    
    setIsProcessing(true);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    
    // Persist user message
    const userMsgRef = doc(db, 'users', user.uid, 'messages', userMsg.id);
    await setDoc(userMsgRef, userMsg);
    
    setMessages(prev => [...prev, userMsg]);
    setView('chat');

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await orchestrateDay(text, history, profile, milestones);
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.message,
        timestamp: Date.now()
      };
      
      // Persist model message
      const modelMsgRef = doc(db, 'users', user.uid, 'messages', modelMsg.id);
      await setDoc(modelMsgRef, modelMsg);
      
      setMessages(prev => [...prev, modelMsg]);

      // Handle New Routine Learning
      if (response.newRoutine && response.newRoutine.title) {
        const pRef = doc(db, 'users', user.uid);
        const newRoutine: Routine = {
          id: Math.random().toString(36).substr(2, 9),
          title: response.newRoutine.title,
          days: response.newRoutine.days || ['Seg'],
          startTime: response.newRoutine.startTime || '09:00',
          duration: response.newRoutine.duration || 60
        };
        
        const updatedRoutines = [...(profile.settings.routines || []), newRoutine];
        await updateDoc(pRef, {
          'settings.routines': updatedRoutines
        });
        setProfile(prev => prev ? {
          ...prev,
          settings: { ...prev.settings, routines: updatedRoutines }
        } : null);
      }

      // Handle Summary
      if (response.summary) {
        // You could show this in a special modal or just as a message
        console.log("End of Day Summary:", response.summary);
      }

      await processAIResponse(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMilestone = async (id: string) => {
    if (!currentPlan) return;
    const milestone = milestones.find(m => m.id === id);
    if (!milestone) return;

    const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    const mRef = doc(db, 'plans', currentPlan.id, 'milestones', id);
    await updateDoc(mRef, { status: newStatus });

    // Update stats
    if (profile) {
      const pRef = doc(db, 'users', user!.uid);
      const pointsGain = newStatus === 'completed' ? 10 : -10;
      await updateDoc(pRef, {
        'stats.points': Math.max(0, profile.stats.points + pointsGain),
        'stats.completedMilestones': profile.stats.completedMilestones + (newStatus === 'completed' ? 1 : -1)
      });
    }
  };

  const completeOnboarding = async (settings: UserProfile['settings']) => {
    if (!user) {
      console.error("No user found during onboarding completion");
      return;
    }
    setIsProcessing(true);
    try {
      const pRef = doc(db, 'users', user.uid);
      await updateDoc(pRef, { 
        settings,
        'settings.onboardingCompleted': true 
      });
      
      const updatedProfile = profile ? { 
        ...profile, 
        settings: { ...settings, onboardingCompleted: true } 
      } : null;
      
      setProfile(updatedProfile);
      setIsEditingProfile(false);

      if (updatedProfile) {
        console.log("Generating initial plan for profile:", updatedProfile.uid);
        const response = await generateInitialPlan(updatedProfile);
        
        const modelMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'model',
          content: response.message,
          timestamp: Date.now()
        };
        
        const modelMsgRef = doc(db, 'users', user.uid, 'messages', modelMsg.id);
        await setDoc(modelMsgRef, modelMsg);
        setMessages(prev => [...prev, modelMsg]);

        await processAIResponse(response);
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-brand-500 rounded-3xl shadow-2xl shadow-brand-200"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-100 rounded-full blur-3xl opacity-40" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm relative z-10"
        >
          <div className="mb-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-24 h-24 bg-brand-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-200"
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>
            
            <h1 className="text-5xl font-display font-black text-slate-900 mb-4 tracking-tight leading-none">
              Organiza <br /> <span className="text-brand-500 italic">.ai</span>
            </h1>
            <div className="w-12 h-1 bg-brand-500 mx-auto mb-6 rounded-full" />
            <p className="text-slate-500 text-lg font-medium leading-relaxed px-4">
              Seu orquestrador de tempo inteligente para um dia com mais <span className="text-slate-900">foco</span> e menos <span className="text-slate-900">estresse</span>.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="Google" />
              Começar agora
            </button>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
              Focado em TDAH & Organização
            </p>
          </div>
        </motion.div>

        {/* Bottom Decorative Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 w-full max-w-[280px] aspect-square rounded-[3rem] overflow-hidden border-8 border-slate-50 shadow-inner"
        >
          <img 
            src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=800" 
            className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
            alt="Peaceful morning"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>
    );
  }

  if (profile && (!profile.settings.onboardingCompleted || isEditingProfile)) {
    return (
      <Onboarding 
        userName={user.displayName?.split(' ')[0] || ''} 
        onComplete={completeOnboarding} 
        initialSettings={profile.settings}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Header */}
      <header className="p-6 pb-4 glass sticky top-0 z-30 flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <h1 className="text-3xl font-display font-black text-slate-900">
            Olá, <span className="text-brand-500">{user.displayName?.split(' ')[0]}</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-brand-500 transition-colors bg-slate-50 rounded-xl"
            title="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-brand-100">
            <Trophy className="w-3 h-3" />
            {profile?.stats.points || 0} pts
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto pt-4 pb-32 no-scrollbar ${view === 'timeline' ? 'px-0' : 'px-6'}`}>
        <AnimatePresence mode="wait">
          {view === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Timeline milestones={milestones} onToggleMilestone={toggleMilestone} />
            </motion.div>
          )}

          {view === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm">Nenhuma conversa ainda.</p>
                </div>
              )}
              {messages.map(msg => (
                <ChatBubble key={msg.id} message={msg.content} role={msg.role} />
              ))}
              <div ref={chatEndRef} />
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StatsView 
                profile={profile} 
                onGenerateSummary={() => handleVoiceTranscript("Gere um resumo do meu dia até agora, por favor.")} 
                onEditProfile={() => setIsEditingProfile(true)}
                onResetProfile={() => setIsResetModalOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation & Input Area */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pointer-events-none">
        <div className="flex flex-col items-center gap-6 pointer-events-auto">
          <ChatInput onSend={handleVoiceTranscript} isProcessing={isProcessing} />
          
          <nav className="w-full glass rounded-3xl p-2 flex items-center justify-around shadow-lg">
            <button 
              onClick={() => setView('timeline')}
              className={`p-3 rounded-2xl transition-all ${view === 'timeline' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutDashboard className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView('chat')}
              className={`p-3 rounded-2xl transition-all ${view === 'chat' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <MessageSquare className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView('stats')}
              className={`p-3 rounded-2xl transition-all ${view === 'stats' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Trophy className="w-6 h-6" />
            </button>
          </nav>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetProfile}
        title="Recomeçar do Zero?"
        message="Isso irá resetar suas configurações e pontos. Suas mensagens e planos anteriores não serão apagados, mas você precisará configurar seu perfil novamente."
        confirmLabel="Sim, Resetar"
        cancelLabel="Não, Manter"
        variant="danger"
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onEditProfile={() => setIsEditingProfile(true)}
        onResetProfile={() => setIsResetModalOpen(true)}
        onLogout={handleLogout}
        userEmail={user?.email || ''}
      />
    </div>
    </ErrorBoundary>
  );
}
