import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Workspace } from '@/types';

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  login: (user: User, workspace: Workspace, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
  updateWorkspace: (updates: Partial<Workspace>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setWorkspace: (workspace) => set({ workspace }),
      
      login: (user, workspace, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }
        set({ user, workspace, isAuthenticated: true, isLoading: false });
      },
      
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        set({ user: null, workspace: null, isAuthenticated: false, isLoading: false });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
        
      updateWorkspace: (updates) =>
        set((state) => ({
          workspace: state.workspace ? { ...state.workspace, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, workspace: state.workspace, isAuthenticated: state.isAuthenticated }),
    }
  )
);
