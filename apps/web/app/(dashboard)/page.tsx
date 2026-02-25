'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Phone,
  Wallet,
  Activity,
  TrendingUp,
  TrendingDown,
  Bot,
  ArrowRight,
  Plus,
  Clock,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { formatCurrency, formatDuration, formatRelativeTime } from '@/utils/format';

// Mock data for demonstration
const stats = [
  {
    title: 'Calls Today',
    value: '24',
    change: '+12%',
    trend: 'up',
    icon: Phone,
    color: 'indigo',
  },
  {
    title: 'Wallet Balance',
    value: formatCurrency(125.5),
    change: '-8%',
    trend: 'down',
    icon: Wallet,
    color: 'emerald',
  },
  {
    title: 'Active Calls',
    value: '3',
    change: '+1',
    trend: 'up',
    icon: Activity,
    color: 'amber',
  },
  {
    title: 'Success Rate',
    value: '94%',
    change: '+3%',
    trend: 'up',
    icon: TrendingUp,
    color: 'violet',
  },
];

const recentCalls = [
  {
    id: '1',
    assistantName: 'Sales Assistant',
    phoneNumber: '+1 (555) 123-4567',
    status: 'completed',
    duration: 245,
    cost: 0.42,
    startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    assistantName: 'Support Bot',
    phoneNumber: '+1 (555) 987-6543',
    status: 'in_progress',
    duration: 120,
    cost: 0.18,
    startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: '3',
    assistantName: 'Booking Agent',
    phoneNumber: '+1 (555) 456-7890',
    status: 'completed',
    duration: 180,
    cost: 0.31,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '4',
    assistantName: 'Sales Assistant',
    phoneNumber: '+1 (555) 234-5678',
    status: 'failed',
    duration: 0,
    cost: 0,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

const quickActions = [
  { name: 'Create Assistant', href: '/dashboard/assistants/new', icon: Plus, color: 'indigo' },
  { name: 'Buy Number', href: '/dashboard/phone-numbers', icon: Phone, color: 'emerald' },
  { name: 'View Calls', href: '/dashboard/calls', icon: BarChart3, color: 'violet' },
  { name: 'Top Up', href: '/dashboard/billing', icon: DollarSign, color: 'amber' },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="text-slate-500">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <Link href="/dashboard/assistants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Assistant
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-slate-400">vs yesterday</span>
                  </div>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg bg-${stat.color}-100`}
                >
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>Recent Calls</CardTitle>
              <Link href="/dashboard/calls">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          call.status === 'completed'
                            ? 'bg-emerald-100'
                            : call.status === 'in_progress'
                            ? 'bg-amber-100'
                            : 'bg-rose-100'
                        }`}
                      >
                        <Phone
                          className={`h-5 w-5 ${
                            call.status === 'completed'
                              ? 'text-emerald-600'
                              : call.status === 'in_progress'
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{call.assistantName}</p>
                        <p className="text-sm text-slate-500">{call.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <Badge
                          variant={
                            call.status === 'completed'
                              ? 'success'
                              : call.status === 'in_progress'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {call.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatRelativeTime(call.startedAt)}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-900">
                          {call.duration > 0 ? formatDuration(call.duration) : '-'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {call.cost > 0 ? formatCurrency(call.cost) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <Link key={action.name} href={action.href}>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${action.color}-100 mr-3`}
                      >
                        <action.icon className={`h-4 w-4 text-${action.color}-600`} />
                      </div>
                      {action.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Assistants */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Active Assistants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Sales Assistant', 'Support Bot', 'Booking Agent'].map((name) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                        <Bot className="h-4 w-4 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-500">Active</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/assistants">
                <Button variant="ghost" size="sm" className="w-full mt-4">
                  Manage Assistants
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
