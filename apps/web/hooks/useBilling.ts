'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { Wallet, Transaction, Invoice } from '@/types';
import toast from 'react-hot-toast';

interface TopupData {
  amount: number;
  paymentMethodId: string;
}

interface AutoTopupSettings {
  enabled: boolean;
  threshold: number;
  amount: number;
}

export function useBilling() {
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: isWalletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get<Wallet>('/billing/wallet'),
  });

  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get<Transaction[]>('/billing/transactions'),
  });

  const { data: invoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<Invoice[]>('/billing/invoices'),
  });

  const topup = useMutation({
    mutationFn: (data: TopupData) =>
      api.post<Wallet>('/billing/topup', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Wallet topped up successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to top up wallet');
    },
  });

  const updateAutoTopup = useMutation({
    mutationFn: (settings: AutoTopupSettings) =>
      api.patch<Wallet>('/billing/auto-topup', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Auto top-up settings updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update auto top-up settings');
    },
  });

  return {
    wallet,
    transactions: transactions || [],
    invoices: invoices || [],
    isWalletLoading,
    isTransactionsLoading,
    isInvoicesLoading,
    topup: topup.mutateAsync,
    updateAutoTopup: updateAutoTopup.mutateAsync,
    isToppingUp: topup.isPending,
    isUpdatingAutoTopup: updateAutoTopup.isPending,
  };
}

export function useUsageStats(period: 'day' | 'week' | 'month' = 'day') {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['usage', period],
    queryFn: () =>
      api.get<{
        calls: number;
        duration: number;
        cost: number;
        breakdown: { date: string; calls: number; cost: number }[];
      }>(`/billing/usage?period=${period}`),
  });

  return {
    stats,
    isLoading,
  };
}
