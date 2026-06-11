import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CLIENT' | 'PROVIDER' | 'ADMIN';
  avatarUrl?: string;
  status: string;
  provider?: {
    id: string;
    skills: string;
    bio?: string;
    hourlyRate: number;
    rating: number;
    totalReviews: number;
    location?: string;
    availability: string;
    verificationStatus: string;
    completedJobs: number;
    bankName?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
  } | null;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) =>
        set({ token, user, isAuthenticated: true }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'domestic-services-auth',
      // Use sessionStorage so each browser tab has its own auth session.
      // This allows logging into different accounts on different tabs
      // without one tab overwriting the other's session.
      storage: typeof window !== 'undefined'
        ? createJSONStorage(() => {
            // Clean up old localStorage entry to avoid stale auth confusion
            try { localStorage.removeItem('domestic-services-auth'); } catch {}
            return sessionStorage;
          })
        : undefined,
      // Only persist these specific fields (not temporary UI state)
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);