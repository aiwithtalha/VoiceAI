'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { Assistant, AgentSpec } from '@/types';
import toast from 'react-hot-toast';

interface CreateAssistantData {
  name: string;
  description?: string;
  spec: AgentSpec;
}

interface UpdateAssistantData {
  name?: string;
  description?: string;
  spec?: Partial<AgentSpec>;
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

export function useAssistants() {
  const queryClient = useQueryClient();

  const { data: assistants, isLoading, error } = useQuery({
    queryKey: ['assistants'],
    queryFn: () => api.get<Assistant[]>('/assistants'),
  });

  const createAssistant = useMutation({
    mutationFn: (data: CreateAssistantData) =>
      api.post<Assistant>('/assistants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Assistant created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create assistant');
    },
  });

  const updateAssistant = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssistantData }) =>
      api.patch<Assistant>(`/assistants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Assistant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update assistant');
    },
  });

  const deleteAssistant = useMutation({
    mutationFn: (id: string) => api.delete(`/assistants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Assistant deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete assistant');
    },
  });

  const publishAssistant = useMutation({
    mutationFn: (id: string) =>
      api.post<Assistant>(`/assistants/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Assistant published successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish assistant');
    },
  });

  const testAssistant = useMutation({
    mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
      api.post(`/assistants/${id}/test`, { phoneNumber }),
    onSuccess: () => {
      toast.success('Test call initiated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate test call');
    },
  });

  return {
    assistants: assistants || [],
    isLoading,
    error,
    createAssistant: createAssistant.mutateAsync,
    updateAssistant: updateAssistant.mutateAsync,
    deleteAssistant: deleteAssistant.mutateAsync,
    publishAssistant: publishAssistant.mutateAsync,
    testAssistant: testAssistant.mutateAsync,
    isCreating: createAssistant.isPending,
    isUpdating: updateAssistant.isPending,
    isDeleting: deleteAssistant.isPending,
    isPublishing: publishAssistant.isPending,
    isTesting: testAssistant.isPending,
  };
}

export function useAssistant(id: string | null) {
  const { data: assistant, isLoading, error } = useQuery({
    queryKey: ['assistant', id],
    queryFn: () => api.get<Assistant>(`/assistants/${id}`),
    enabled: !!id,
  });

  return {
    assistant,
    isLoading,
    error,
  };
}
