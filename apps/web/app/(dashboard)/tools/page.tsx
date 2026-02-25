'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
  Wrench,
  Plus,
  Search,
  Calendar,
  Database,
  Mail,
  Webhook,
  FileText,
  CreditCard,
  Check,
  ArrowRight,
  Code,
} from 'lucide-react';

const predefinedTools = [
  {
    id: 'calendar',
    name: 'Calendar Booking',
    description: 'Schedule, reschedule, and cancel appointments',
    icon: Calendar,
    category: 'Productivity',
    popular: true,
  },
  {
    id: 'crm',
    name: 'CRM Lookup',
    description: 'Search and update customer records',
    icon: Database,
    category: 'CRM',
    popular: true,
  },
  {
    id: 'email',
    name: 'Send Email',
    description: 'Send follow-up emails to callers',
    icon: Mail,
    category: 'Communication',
    popular: false,
  },
  {
    id: 'webhook',
    name: 'HTTP Webhook',
    description: 'Call external APIs and services',
    icon: Webhook,
    category: 'Integration',
    popular: true,
  },
  {
    id: 'notes',
    name: 'Take Notes',
    description: 'Save call summaries and notes',
    icon: FileText,
    category: 'Productivity',
    popular: false,
  },
  {
    id: 'payment',
    name: 'Process Payment',
    description: 'Collect payments over the phone',
    icon: CreditCard,
    category: 'Payments',
    popular: false,
  },
];

const customTools = [
  {
    id: 'custom-1',
    name: 'Check Order Status',
    description: 'Look up order status by order number',
    createdAt: '2024-01-15',
    usageCount: 234,
  },
];

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredTools = predefinedTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tools</h1>
          <p className="text-slate-500">Manage tools and functions for your assistants</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Custom Tool
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Predefined Tools */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Predefined Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <Card key={tool.id} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <tool.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  {tool.popular && (
                    <Badge variant="default" className="text-xs">Popular</Badge>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{tool.name}</h3>
                <p className="text-sm text-slate-500 mb-3">{tool.description}</p>
                <Badge variant="secondary" className="text-xs">{tool.category}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Tools */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Custom Tools</h2>
        {customTools.length > 0 ? (
          <div className="space-y-4">
            {customTools.map((tool) => (
              <Card key={tool.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        <Code className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{tool.name}</h3>
                        <p className="text-sm text-slate-500">{tool.description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Used {tool.usageCount} times
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-50">
            <CardContent className="p-8 text-center">
              <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No custom tools yet
              </h3>
              <p className="text-slate-500 mb-4">
                Create custom tools to extend your assistant&apos;s capabilities
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Tool
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Tool Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Custom Tool</DialogTitle>
            <DialogDescription>
              Define a custom function that your assistant can call
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Input label="Tool Name" placeholder="e.g., Check Order Status" />
            <Input
              label="Description"
              placeholder="What does this tool do?"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Function Code
              </label>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300">
                <pre>{`async function checkOrderStatus(orderNumber) {
  // Your code here
  const response = await fetch(
    \`https://api.example.com/orders/\${orderNumber}\`
  );
  return response.json();
}`}</pre>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                <Check className="mr-2 h-4 w-4" />
                Create Tool
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
