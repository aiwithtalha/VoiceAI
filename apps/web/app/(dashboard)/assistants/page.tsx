'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  Bot,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Play,
  Pause,
  Trash2,
  Copy,
  Phone,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/utils/format';

// Mock data
const assistants = [
  {
    id: '1',
    name: 'Sales Assistant',
    description: 'Handles outbound sales calls and lead qualification',
    status: 'active',
    version: 3,
    phoneNumber: '+1 (555) 123-4567',
    analytics: {
      totalCalls: 1247,
      avgDuration: 180,
      successRate: 87,
      costPerCall: 0.42,
    },
    lastCallAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '2',
    name: 'Support Bot',
    description: '24/7 customer support and troubleshooting',
    status: 'active',
    version: 5,
    phoneNumber: '+1 (555) 987-6543',
    analytics: {
      totalCalls: 3421,
      avgDuration: 240,
      successRate: 94,
      costPerCall: 0.38,
    },
    lastCallAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    name: 'Booking Agent',
    description: 'Appointment scheduling and reminders',
    status: 'paused',
    version: 2,
    phoneNumber: '+1 (555) 456-7890',
    analytics: {
      totalCalls: 892,
      avgDuration: 120,
      successRate: 91,
      costPerCall: 0.28,
    },
    lastCallAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: '4',
    name: 'Survey Bot',
    description: 'Customer feedback collection',
    status: 'draft',
    version: 1,
    phoneNumber: null,
    analytics: null,
    lastCallAt: null,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

export default function AssistantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<typeof assistants[0] | null>(null);

  const filteredAssistants = assistants.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (assistant: typeof assistants[0]) => {
    setSelectedAssistant(assistant);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assistants</h1>
          <p className="text-slate-500">Manage your AI voice agents</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/assistants/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Assistant
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search assistants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Assistants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAssistants.map((assistant) => (
          <Card key={assistant.id} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                    <Bot className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{assistant.name}</h3>
                    <p className="text-sm text-slate-500">{assistant.description}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/assistants/${assistant.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    {assistant.status === 'active' ? (
                      <DropdownMenuItem>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-rose-600"
                      onClick={() => handleDelete(assistant)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status & Version */}
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  variant={
                    assistant.status === 'active'
                      ? 'success'
                      : assistant.status === 'paused'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  {assistant.status}
                </Badge>
                <span className="text-xs text-slate-400">v{assistant.version}</span>
                {assistant.phoneNumber && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {assistant.phoneNumber}
                  </span>
                )}
              </div>

              {/* Analytics */}
              {assistant.analytics ? (
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">Calls</p>
                    <p className="text-sm font-medium text-slate-900">
                      {assistant.analytics.totalCalls.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Success</p>
                    <p className="text-sm font-medium text-emerald-600">
                      {assistant.analytics.successRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Cost/call</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatCurrency(assistant.analytics.costPerCall)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Last call</p>
                    <p className="text-sm font-medium text-slate-900">
                      {assistant.lastCallAt ? formatRelativeTime(assistant.lastCallAt) : '-'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-400 italic">No call data yet</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Link href={`/dashboard/assistants/${assistant.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Link href={`/dashboard/calls?assistant=${assistant.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assistant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedAssistant?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(false)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
