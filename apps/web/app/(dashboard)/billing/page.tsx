'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import {
  Wallet,
  Plus,
  CreditCard,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Check,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';

const wallet = {
  balance: 125.5,
  currency: 'USD',
  autoTopupEnabled: false,
  autoTopupThreshold: 50,
  autoTopupAmount: 100,
};

const transactions = [
  {
    id: '1',
    type: 'debit',
    amount: 45.23,
    description: 'Call charges - Jan 20, 2024',
    status: 'completed',
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '2',
    type: 'debit',
    amount: 12.5,
    description: 'Phone number rental',
    status: 'completed',
    createdAt: '2024-01-19T00:00:00Z',
  },
  {
    id: '3',
    type: 'credit',
    amount: 100,
    description: 'Wallet top-up',
    status: 'completed',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '4',
    type: 'debit',
    amount: 38.75,
    description: 'Call charges - Jan 15, 2024',
    status: 'completed',
    createdAt: '2024-01-15T00:00:00Z',
  },
];

const invoices = [
  {
    id: 'INV-2024-001',
    amount: 245.5,
    status: 'paid',
    periodStart: '2024-01-01',
    periodEnd: '2024-01-31',
    createdAt: '2024-02-01',
    paidAt: '2024-02-01',
  },
  {
    id: 'INV-2023-012',
    amount: 189.25,
    status: 'paid',
    periodStart: '2023-12-01',
    periodEnd: '2023-12-31',
    createdAt: '2024-01-01',
    paidAt: '2024-01-01',
  },
];

export default function BillingPage() {
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('50');

  const totalSpent = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500">Manage your wallet and payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Wallet Balance</p>
                <p className="text-3xl font-bold">{formatCurrency(wallet.balance)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-white text-emerald-600 hover:bg-emerald-50"
              onClick={() => setTopupDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Top Up
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">This Month</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
                <TrendingDown className="h-6 w-6 text-rose-600" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Est. Monthly</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(180)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">Based on current usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm font-medium ${
                              transaction.type === 'credit'
                                ? 'text-emerald-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="success">{transaction.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(transaction.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {invoice.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto Top-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Enable auto top-up</p>
                  <p className="text-sm text-slate-500">
                    Automatically add funds when balance is low
                  </p>
                </div>
                <Switch defaultChecked={wallet.autoTopupEnabled} />
              </div>

              {wallet.autoTopupEnabled && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      When balance falls below
                    </label>
                    <Input
                      type="number"
                      defaultValue={wallet.autoTopupThreshold}
                      prefix="$"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Top up amount
                    </label>
                    <Input
                      type="number"
                      defaultValue={wallet.autoTopupAmount}
                      prefix="$"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <CreditCard className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">•••• 4242</p>
                    <p className="text-sm text-slate-500">Expires 12/25</p>
                  </div>
                </div>
                <Badge>Default</Badge>
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top-up Dialog */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Wallet</DialogTitle>
            <DialogDescription>
              Add funds to your wallet balance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Amount
              </label>
              <div className="flex gap-2">
                {['25', '50', '100', '250'].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTopupAmount(amount)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      topupAmount === amount
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setTopupDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setTopupDialogOpen(false)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay ${topupAmount}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
