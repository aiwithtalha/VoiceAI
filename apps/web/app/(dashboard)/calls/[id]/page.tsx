'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  ArrowLeft,
  Phone,
  Play,
  Download,
  Clock,
  DollarSign,
  Bot,
  User,
  Wrench,
  FileText,
  BarChart3,
} from 'lucide-react';
import { formatCurrency, formatDuration, formatDateTime } from '@/utils/format';

// Mock call data
const call = {
  id: '1',
  assistantName: 'Sales Assistant',
  assistantId: '1',
  phoneNumber: '+1 (555) 123-4567',
  direction: 'outbound',
  status: 'completed',
  duration: 245,
  cost: 0.42,
  startedAt: '2024-01-20T14:30:00Z',
  endedAt: '2024-01-20T14:34:05Z',
  recordingUrl: '#',
  transcript: [
    { role: 'assistant', content: 'Hello! This is Sarah from Acme Corp. How can I help you today?', timestamp: 0 },
    { role: 'user', content: 'Hi, I\'m interested in your enterprise plan.', timestamp: 5 },
    { role: 'assistant', content: 'Great! I\'d be happy to help. Can you tell me a bit about your team size?', timestamp: 8 },
    { role: 'user', content: 'We have about 50 people in our sales team.', timestamp: 15 },
    { role: 'assistant', content: 'Perfect! Our enterprise plan would be a great fit. Would you like me to schedule a demo with our sales team?', timestamp: 20 },
    { role: 'user', content: 'Yes, that would be great.', timestamp: 28 },
    { role: 'assistant', content: 'Excellent! What day works best for you next week?', timestamp: 32 },
  ],
  summary: 'Customer inquired about enterprise plan. Qualified lead with 50+ team members. Scheduled demo for next week.',
  outcomes: [
    { key: 'lead_qualified', value: 'true', confidence: 0.95 },
    { key: 'team_size', value: '50+', confidence: 0.88 },
    { key: 'demo_scheduled', value: 'true', confidence: 0.92 },
  ],
  toolExecutions: [
    { tool: 'calendar_check_availability', timestamp: 32, result: 'success' },
    { tool: 'crm_create_lead', timestamp: 35, result: 'success' },
  ],
  costBreakdown: {
    telephony: 0.08,
    stt: 0.02,
    llm: 0.25,
    tts: 0.07,
  },
};

export default function CallDetailPage() {
  const params = useParams();
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/calls">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Call Details</h1>
              <Badge variant="success">{call.status}</Badge>
            </div>
            <p className="text-slate-500">{formatDateTime(call.startedAt)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Duration</p>
            <p className="text-xl font-bold text-slate-900">{formatDuration(call.duration)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Cost</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(call.cost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Assistant</p>
            <Link href={`/dashboard/assistants/${call.assistantId}`}>
              <p className="text-xl font-bold text-indigo-600">{call.assistantName}</p>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Phone Number</p>
            <p className="text-xl font-bold text-slate-900">{call.phoneNumber}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transcript">
        <TabsList>
          <TabsTrigger value="transcript">
            <FileText className="h-4 w-4 mr-2" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="recording">
            <Play className="h-4 w-4 mr-2" />
            Recording
          </TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart3 className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="costs">
            <DollarSign className="h-4 w-4 mr-2" />
            Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {call.transcript.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 ${
                      message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                        message.role === 'assistant'
                          ? 'bg-indigo-100'
                          : 'bg-slate-100'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <Bot className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <User className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.role === 'assistant'
                          ? 'bg-slate-100 rounded-tl-none'
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === 'assistant' ? 'text-slate-400' : 'text-indigo-200'
                        }`}
                      >
                        {Math.floor(message.timestamp / 60)}:
                        {(message.timestamp % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 mx-auto mb-4">
                <Play className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Call Recording</h3>
              <p className="text-slate-500 mb-6">
                Duration: {formatDuration(call.duration)}
              </p>
              <div className="flex justify-center gap-3">
                <Button>
                  <Play className="mr-2 h-4 w-4" />
                  Play Recording
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">{call.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extracted Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {call.outcomes.map((outcome) => (
                  <div
                    key={outcome.key}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900 capitalize">
                        {outcome.key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-slate-500">
                        Confidence: {(outcome.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <Badge variant="success">{outcome.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tool Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {call.toolExecutions.map((tool, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="h-5 w-5 text-slate-400" />
                      <span className="font-medium text-slate-900">{tool.tool}</span>
                    </div>
                    <Badge variant="success">{tool.result}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(call.costBreakdown).map(([category, cost]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <span className="font-medium text-slate-900 capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-900">{formatCurrency(cost)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(call.cost)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
