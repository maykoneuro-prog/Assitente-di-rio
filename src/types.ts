export interface Routine {
  id: string;
  title: string;
  days: string[]; // ['Seg', 'Ter', ...]
  startTime: string; // HH:mm
  duration: number; // minutes
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  settings: {
    adhdMode: boolean;
    notificationsEnabled: boolean;
    onboardingCompleted: boolean;
    workDays: string[];
    workStart: string; // HH:mm
    workEnd: string; // HH:mm
    commuteToWork: number; // minutes
    commuteToHome: number; // minutes
    lunchDuration: number; // minutes
    routines: Routine[];
  };
  stats: {
    points: number;
    streak: number;
    completedMilestones: number;
    totalMilestones: number;
  };
}

export interface Milestone {
  id: string;
  planId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  type: 'fixed' | 'flexible' | 'transition' | 'preparation';
  status: 'pending' | 'completed' | 'skipped' | 'delayed';
  isActionable: boolean;
  order: number;
}

export interface DailyPlan {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'draft' | 'active' | 'completed';
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
