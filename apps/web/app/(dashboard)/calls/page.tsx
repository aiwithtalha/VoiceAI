'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Phone,
  Search,
  Filter,
  Play,
  FileText,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDuration, formatDateTime } from '@/utils/format';

const calls = [
  {
    id: '1',
    assistantName: 'Sales Assistant',
    phoneNumber: '+1 (555) 123-4567',
    direction: 'outbound',
    status: 'completed',
    duration: 245,
    cost: 0.42,
    startedAt: '2024-01-20T14:30:00Z',
    transcript: [
      { role: 'assistant', content: 'Hello! This is Sarah from Acme Corp. How can I help you today?', timestamp: '00:00' },
      { role: 'user', content: 'Hi, I\'m interested in your enterprise plan.', timestamp: '00:05' },
      { role: 'assistant', content: 'Great! I\'d be happy to help. Can you tell me a bit about your team size?', timestamp: '00:08' },
    ],
    summary: 'Customer inquired about enterprise plan. Qualified lead with 50+ team members. Scheduled demo for next week.',
    outcomes: [
      { key: 'lead_qualified', value: 'true', confidence: 0.95 },
      { key: 'team_size', value: '50+', confidence: 0.88 },
    ],
  },
  {
    id: '2',
    assistantName: 'Support Bot',
    phoneNumber: '+1 (555) 987-6543',
    direction: 'inbound',
    status: 'completed',
    duration: 180,
    cost: 0.31,
    startedAt: '2024-01-20T13:15:00Z',
    transcript: [],
    summary: 'Customer had login issues. Walked through password reset process. Issue resolved.',
    outcomes: [
      { key: 'issue_resolved', value: 'true', confidence: 0.98 },
      { key: 'satisfaction', value: 'high', confidence: 0.92 },
    ],
  },
  {
    id: '3',
    assistantName: 'Booking Agent',
    phoneNumber: '+1 (555) 456-7890',
    direction: 'outbound',
    status: 'in_progress',
    duration: 120,
    cost: 0.18,
    startedAt: '2024-01-20T14:45:00Z',
    transcript: [],
    summary: null,
    outcomes: [],
  },
  {
    id: '4',
    assistantName: 'Sales Assistant',
    phoneNumber: '+1 (555) 234-5678',
    direction: 'outbound',
    status: 'failed',
    duration: 0,
    cost: 0,
    startedAt: '2024-01-20T12:00:00Z',
    transcript: [],
    summary: 'Call failed - number disconnected',
    outcomes: [],
  },
];

export default function CallsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCall, setSelectedCall] = useState<typeof calls[0] | null>(null);

  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      call.assistantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.phoneNumber.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
          <p className="text-slate-500">View and analyze your call history</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Assistant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCalls.map((call) => (
                  <tr
                    key={call.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedCall(call)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            call.direction === 'outbound'
                              ? 'bg-indigo-100'
                              : 'bg-emerald-100'
                          }`}
                        >
                          <Phone
                            className={`h-4 w-4 ${
                              call.direction === 'outbound'
                                ? 'text-indigo-600'
                                : 'text-emerald-600'
                            }`}
                          />
                        </div>
                        <span className="font-medium text-slate-900">{call.assistantName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{call.phoneNumber}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          call.status === 'completed'
                            ? 'success'
                            : call.status === 'in_progress'
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {call.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {call.duration > 0 ? formatDuration(call.duration) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {call.cost > 0 ? formatCurrency(call.cost) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDateTime(call.startedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {filteredCalls.length} of {filteredCalls.length} calls
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
