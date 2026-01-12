// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Quit Plan types
export interface QuitPlan {
  id: string;
  userId: string;
  quitDate: string;
  cigarettesPerDay: number;
  costPerPack: number;
  cigarettesPerPack: number;
  motivations: string[];
  createdAt: string;
  updatedAt: string;
}

// Statistics types
export interface Statistics {
  smokeFreeTime: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  moneySaved: number;
  cigarettesNotSmoked: number;
  lifeRegained: {
    days: number;
    hours: number;
    minutes: number;
  };
  currentStreak: number;
}

// Craving types
export interface Craving {
  id: string;
  userId: string;
  intensity: number;
  triggers: string[];
  notes?: string;
  overcomeTechniques?: string[];
  wasOvercome: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CravingAnalytics {
  totalCravings: number;
  averageIntensity: number;
  mostCommonTriggers: Array<{ trigger: string; count: number }>;
  overcomRate: number;
  cravingsByDay: Array<{ date: string; count: number; avgIntensity: number }>;
}

// Milestone types
export interface Milestone {
  id: string;
  name: string;
  description: string;
  type: 'time' | 'health' | 'savings' | 'achievement';
  category: string;
  requiredValue: number;
  unit: string;
  icon: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserMilestone {
  id: string;
  userId: string;
  milestoneId: string;
  unlockedAt: string;
  milestone: Milestone;
}

// Resource types
export interface Resource {
  id: string;
  title: string;
  description: string;
  content: string | null;
  type: 'article' | 'video' | 'tip';
  category: string;
  url: string | null;
  readingTimeMinutes: number | null;
  tags: string[];
  isFeatured: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Navigation types
export type RootStackParamList = {
  // Auth
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  
  // Onboarding
  OnboardingQuitDate: undefined;
  OnboardingMotivations: { quitDate: string };
  OnboardingHabits: { quitDate: string; motivations: string[] };
  
  // Main App
  MainTabs: undefined;
  Home: undefined;
  HomeTab: undefined;
  Progress: undefined;
  ProgressTab: undefined;
  Resources: undefined;
  ResourcesTab: undefined;
  Chat: undefined;
  ChatTab: undefined;
  Settings: undefined;
  SettingsTab: undefined;
  
  // Details
  ResourceDetail: { resourceId: string };
  MilestoneDetail: { milestoneId: string };
  CravingLog: undefined;
  CravingHistory: undefined;
};
