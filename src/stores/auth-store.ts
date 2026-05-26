import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    }
  )
);
