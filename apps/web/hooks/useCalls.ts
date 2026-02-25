'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { Call } from '@/types';
import toast from 'react-hot-toast';

interface CallFilters {
  assistantId?: string;
  status?: string;
  direction?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface CallsResponse {
  calls: Call[];
  total: number;
  hasMore: boolean;
}

export function useCalls(filters: CallFilters = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['calls', filters],
    queryFn: () =>
      api.get<CallsResponse>('/calls', {
        params: filters,
      }),
  });

  const initiateCall = useMutation({
    mutationFn: ({
      assistantId,
      phoneNumber,
    }: {
      assistantId: string;
      phoneNumber: string;
    }) =>
      api.post<Call>('/calls', {
        assistantId,
        to: phoneNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast.success('Call initiated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate call');
    },
  });

  const endCall = useMutation({
    mutationFn: (callId: string) =>
      api.post(`/calls/${callId}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast.success('Call ended');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to end call');
    },
  });

  return {
    calls: data?.calls || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    initiateCall: initiateCall.mutateAsync,
    endCall: endCall.mutateAsync,
    isInitiating: initiateCall.isPending,
    isEnding: endCall.isPending,
  };
}

export function useCall(callId: string | null) {
  const { data: call, isLoading, error } = useQuery({
    queryKey: ['call', callId],
    queryFn: () => api.get<Call>(`/calls/${callId}`),
    enabled: !!callId,
    refetchInterval: (query) => {
      const data = query.state.data as Call | undefined;
      if (data?.status === 'in_progress' || data?.status === 'ringing') {
        return 3000; // Poll every 3 seconds for active calls
      }
      return false;
    },
  });

  return {
    call,
    isLoading,
    error,
  };
}
