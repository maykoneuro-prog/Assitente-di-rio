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
  serverTimestamp
} from 'firebase/firestore';
import { UserProfile, DailyPlan, Milestone, ChatMessage, Routine } from './types';
import { orchestrateDay } from './services/geminiService';
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
import { orderBy, limit } from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<DailyPlan | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [view, setView] = useState<'chat' | 'timeline' | 'stats'>('timeline');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Push Notifications Setup
  useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, {
              vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE' // User needs to replace this
            });
            if (token) {
              console.log('FCM Token:', token);
              // Save token to user profile if needed for server-side pushes
              await updateDoc(doc(db, 'users', user.uid), {
                fcmToken: token
              });
            }
          }
        } catch (error) {
          console.error('Error getting notification permission:', error);
        }
      };

      requestPermission();

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);
        // You could show a custom toast here
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Load or create profile
        const profileRef = doc(db, 'users', u.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (!profileSnap.exists()) {
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
            stats: {
              points: 0,
              streak: 0,
              completedMilestones: 0,
              totalMilestones: 0
            }
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(profileSnap.data() as UserProfile);
        }

        // Load chat history
        const messagesRef = collection(db, 'users', u.uid, 'messages');
        const msgQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));
        onSnapshot(msgQuery, (snapshot) => {
          const msgs = snapshot.docs.map(doc => doc.data() as ChatMessage);
          if (msgs.length > 0) {
            setMessages(msgs);
          }
        });

        // Load today's plan
        const today = format(new Date(), 'yyyy-MM-dd');
        const plansRef = collection(db, 'plans');
        const q = query(plansRef, where('userId', '==', u.uid), where('date', '==', today));
        
        onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const planDoc = snapshot.docs[0];
            const planData = planDoc.data() as DailyPlan;
            setCurrentPlan(planData);

            // Load milestones
            const milestonesRef = collection(db, 'plans', planDoc.id, 'milestones');
            onSnapshot(milestonesRef, (mSnap) => {
              const mData = mSnap.docs.map(doc => doc.data() as Milestone);
              setMilestones(mData);
            });
          } else {
            // New day, show welcome message
            setMessages([{
              id: 'welcome',
              role: 'model',
              content: "Bom dia! Sou o seu Tempo Amigo. O que temos para hoje? Pode me contar tudo o que você lembra, sem pressa e sem ordem.",
              timestamp: Date.now()
            }]);
            setView('chat');
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogout = () => auth.signOut();

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

      if (response.suggestedMilestones && response.suggestedMilestones.length > 0) {
        // Create or update plan
        let planId = currentPlan?.id;
        if (!planId) {
          const today = format(new Date(), 'yyyy-MM-dd');
          const newPlanRef = await addDoc(collection(db, 'plans'), {
            userId: user.uid,
            date: today,
            status: 'draft',
            createdAt: serverTimestamp()
          });
          planId = newPlanRef.id;
          await updateDoc(newPlanRef, { id: planId });
        }

        // Add milestones
        const milestonesRef = collection(db, 'plans', planId, 'milestones');
        for (const m of response.suggestedMilestones) {
          const newMRef = doc(milestonesRef);
          const newMilestone: Milestone = {
            id: newMRef.id,
            planId: planId,
            userId: user.uid,
            title: m.title || 'Sem título',
            description: m.description,
            startTime: m.startTime || new Date().toISOString(),
            endTime: m.endTime || new Date().toISOString(),
            type: m.type || 'flexible',
            status: 'pending',
            isActionable: true,
            order: milestones.length
          };
          await setDoc(newMRef, newMilestone);
        }
        
        // If it was a "Carga Inicial" or major update, maybe switch back to timeline
        if (response.isPlanComplete) {
          setTimeout(() => setView('timeline'), 2000);
        }
      }
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
    if (!user) return;
    const pRef = doc(db, 'users', user.uid);
    await updateDoc(pRef, { settings });
    setProfile(prev => prev ? { ...prev, settings } : null);
    setIsEditingProfile(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-200">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Tempo Amigo</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Seu assistente pessoal para um dia mais calmo, organizado e produtivo.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <h1 className="text-2xl font-bold text-slate-800">Olá, {user.displayName?.split(' ')[0]}!</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
            title="Configurações de Perfil"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {profile?.stats.points || 0} pts
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pt-4 pb-32 no-scrollbar">
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
    </div>
    </ErrorBoundary>
  );
}
