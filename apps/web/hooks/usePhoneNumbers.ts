'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { PhoneNumber } from '@/types';
import toast from 'react-hot-toast';

interface SearchNumbersParams {
  country: string;
  areaCode?: string;
  contains?: string;
}

interface PurchaseNumberData {
  number: string;
  provider: string;
}

export function usePhoneNumbers() {
  const queryClient = useQueryClient();

  const { data: phoneNumbers, isLoading, error } = useQuery({
    queryKey: ['phone-numbers'],
    queryFn: () => api.get<PhoneNumber[]>('/phone-numbers'),
  });

  const searchNumbers = useMutation({
    mutationFn: (params: SearchNumbersParams) =>
      api.post<string[]>('/phone-numbers/search', params),
  });

  const purchaseNumber = useMutation({
    mutationFn: (data: PurchaseNumberData) =>
      api.post<PhoneNumber>('/phone-numbers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success('Phone number purchased successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to purchase phone number');
    },
  });

  const assignAssistant = useMutation({
    mutationFn: ({ id, assistantId }: { id: string; assistantId: string | null }) =>
      api.patch<PhoneNumber>(`/phone-numbers/${id}`, { assistantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success('Assistant assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign assistant');
    },
  });

  const releaseNumber = useMutation({
    mutationFn: (id: string) => api.delete(`/phone-numbers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success('Phone number released successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to release phone number');
    },
  });

  return {
    phoneNumbers: phoneNumbers || [],
    isLoading,
    error,
    searchNumbers: searchNumbers.mutateAsync,
    purchaseNumber: purchaseNumber.mutateAsync,
    assignAssistant: assignAssistant.mutateAsync,
    releaseNumber: releaseNumber.mutateAsync,
    isSearching: searchNumbers.isPending,
    isPurchasing: purchaseNumber.isPending,
    isAssigning: assignAssistant.isPending,
    isReleasing: releaseNumber.isPending,
  };
}
