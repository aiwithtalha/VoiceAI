'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  ArrowLeft,
  Edit,
  Play,
  Pause,
  Save,
  Bot,
  Phone,
  TrendingUp,
  Clock,
  DollarSign,
  MessageSquare,
  Settings,
  History,
  GitBranch,
  Check,
  RotateCcw,
} from 'lucide-react';
import { formatCurrency, formatDuration, formatRelativeTime } from '@/utils/format';

// Mock assistant data
const assistant = {
  id: '1',
  name: 'Sales Assistant',
  description: 'Handles outbound sales calls and lead qualification',
  status: 'active',
  version: 3,
  phoneNumber: '+1 (555) 123-4567',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-20T14:30:00Z',
  publishedAt: '2024-01-05T00:00:00Z',
  spec: {
    systemPrompt: `You are a helpful sales assistant for Acme Corp. Your goal is to qualify leads and book meetings with our sales team.

Be friendly and professional. Ask about their needs and budget. If they're a good fit, offer to schedule a meeting.

Key points:
- Always be polite and professional
- Ask qualifying questions
- Don't be pushy
- Offer value first`,
    firstMessage: "Hi! Thanks for your interest in Acme Corp. I'd love to learn more about what you're looking for. What brings you in today?",
    voice: 'nova',
    model: 'gpt-4',
    temperature: 0.7,
  },
  analytics: {
    totalCalls: 1247,
    avgDuration: 180,
    successRate: 87,
    costPerCall: 0.42,
    totalCost: 523.74,
  },
};

const versionHistory = [
  { version: 3, createdAt: '2024-01-20T14:30:00Z', author: 'John Smith', changes: 'Updated system prompt' },
  { version: 2, createdAt: '2024-01-10T10:00:00Z', author: 'John Smith', changes: 'Changed voice to Nova' },
  { version: 1, createdAt: '2024-01-01T00:00:00Z', author: 'John Smith', changes: 'Initial version' },
];

const recentCalls = [
  {
    id: '1',
    phoneNumber: '+1 (555) 111-2222',
    status: 'completed',
    duration: 245,
    cost: 0.42,
    startedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    phoneNumber: '+1 (555) 333-4444',
    status: 'completed',
    duration: 180,
    cost: 0.31,
    startedAt: '2024-01-20T13:15:00Z',
  },
];

export default function AssistantDetailPage() {
  const params = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [name, setName] = useState(assistant.name);
  const [description, setDescription] = useState(assistant.description);
  const [systemPrompt, setSystemPrompt] = useState(assistant.spec.systemPrompt);
  const [firstMessage, setFirstMessage] = useState(assistant.spec.firstMessage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assistants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{assistant.name}</h1>
              <Badge
                variant={assistant.status === 'active' ? 'success' : 'warning'}
              >
                {assistant.status}
              </Badge>
            </div>
            <p className="text-slate-500">{assistant.description}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Play className="mr-2 h-4 w-4" />
            Test
          </Button>
          {isEditing ? (
            <Button onClick={() => setIsEditing(false)}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="configure">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="versions">
            <GitBranch className="h-4 w-4 mr-2" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="calls">
            <Phone className="h-4 w-4 mr-2" />
            Calls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Calls</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {assistant.analytics.totalCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <Phone className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Success Rate</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {assistant.analytics.successRate}%
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Avg Duration</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatDuration(assistant.analytics.avgDuration)}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Cost</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(assistant.analytics.totalCost)}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                    <DollarSign className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Calls */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Calls</CardTitle>
              <Link href={`/dashboard/calls?assistant=${assistant.id}`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                        <Phone className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{call.phoneNumber}</p>
                        <p className="text-sm text-slate-500">
                          {formatRelativeTime(call.startedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="success">{call.status}</Badge>
                      <span className="text-sm text-slate-600">
                        {formatDuration(call.duration)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatCurrency(call.cost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isEditing}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="System Prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                disabled={!isEditing}
                rows={8}
              />
              <Input
                label="First Message"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                disabled={!isEditing}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice & Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Voice
                  </label>
                  <Select disabled={!isEditing} defaultValue={assistant.spec.voice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nova">Nova</SelectItem>
                      <SelectItem value="alloy">Alloy</SelectItem>
                      <SelectItem value="echo">Echo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Model
                  </label>
                  <Select disabled={!isEditing} defaultValue={assistant.spec.model}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versionHistory.map((version, index) => (
                  <div
                    key={version.version}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                        <GitBranch className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            Version {version.version}
                          </span>
                          {index === 0 && <Badge>Current</Badge>}
                        </div>
                        <p className="text-sm text-slate-500">{version.changes}</p>
                        <p className="text-xs text-slate-400">
                          by {version.author} on {new Date(version.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {index !== 0 && (
                      <Button variant="outline" size="sm">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restore
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCalls.map((call) => (
                  <Link key={call.id} href={`/dashboard/calls/${call.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                          <Phone className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{call.phoneNumber}</p>
                          <p className="text-sm text-slate-500">
                            {formatRelativeTime(call.startedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="success">{call.status}</Badge>
                        <span className="text-sm text-slate-600">
                          {formatDuration(call.duration)}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatCurrency(call.cost)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
