'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/utils/api';
import { User, Workspace } from '@/types';
import toast from 'react-hot-toast';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
}

interface AuthResponse {
  user: User;
  workspace: Workspace;
  token: string;
}

export function useAuth() {
  const { user, workspace, isAuthenticated, isLoading, login, logout, setLoading } = useAuthStore();
  const queryClient = useQueryClient();

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<AuthResponse>('/auth/me');
        login(response.user, response.workspace, token);
      } catch {
        logout();
      }
    };

    checkAuth();
  }, [login, logout, setLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      return response;
    },
    onSuccess: (data) => {
      login(data.user, data.workspace, data.token);
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success('Welcome back!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await api.post<AuthResponse>('/auth/register', data);
      return response;
    },
    onSuccess: (data) => {
      login(data.user, data.workspace, data.token);
      toast.success('Account created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success('Logged out successfully');
    },
  });

  return {
    user,
    workspace,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();

  return {
    isAuthenticated,
    isLoading,
    shouldRedirect: !isLoading && !isAuthenticated,
  };
}
