'use client';

import { useState } from 'react';
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
} from '@/components/ui/Dialog';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
} from 'lucide-react';

const apiKeys = [
  {
    id: '1',
    name: 'Production API Key',
    keyPreview: 'sk_live_...x7y9z',
    scopes: ['assistants:read', 'assistants:write', 'calls:read', 'calls:write'],
    lastUsedAt: '2024-01-20T14:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Development API Key',
    keyPreview: 'sk_test_...a1b2c',
    scopes: ['assistants:read', 'assistants:write', 'calls:read', 'calls:write'],
    lastUsedAt: '2024-01-19T10:15:00Z',
    createdAt: '2024-01-05T00:00:00Z',
  },
  {
    id: '3',
    name: 'Read-only Key',
    keyPreview: 'sk_live_...d4e5f',
    scopes: ['assistants:read', 'calls:read'],
    lastUsedAt: null,
    createdAt: '2024-01-10T00:00:00Z',
  },
];

const availableScopes = [
  { id: 'assistants:read', label: 'Read Assistants', description: 'View assistant configurations' },
  { id: 'assistants:write', label: 'Write Assistants', description: 'Create and modify assistants' },
  { id: 'calls:read', label: 'Read Calls', description: 'View call logs and transcripts' },
  { id: 'calls:write', label: 'Write Calls', description: 'Initiate and manage calls' },
  { id: 'phone-numbers:read', label: 'Read Phone Numbers', description: 'View phone numbers' },
  { id: 'phone-numbers:write', label: 'Write Phone Numbers', description: 'Manage phone numbers' },
  { id: 'billing:read', label: 'Read Billing', description: 'View billing information' },
];

export default function ApiKeysPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (keyId: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreate = () => {
    setCreateDialogOpen(false);
    setNewKey('sk_live_' + Math.random().toString(36).substring(2, 15));
    setNewKeyDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="text-slate-500">Manage API keys for programmatic access</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Security Warning */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Keep your API keys secure</p>
              <p className="text-sm text-amber-700">
                Never share your API keys or commit them to version control. 
                Rotate keys regularly for enhanced security.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <Card key={apiKey.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <Key className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{apiKey.name}</h3>
                    <p className="text-sm text-slate-500">{apiKey.keyPreview}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {apiKey.scopes.slice(0, 3).map((scope) => (
                      <Badge key={scope} variant="secondary" className="text-xs">
                        {scope.split(':')[0]}
                      </Badge>
                    ))}
                    {apiKey.scopes.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{apiKey.scopes.length - 3}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(apiKey.id, apiKey.keyPreview)}
                  >
                    {copiedKey === apiKey.id ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6 text-sm text-slate-500">
                <span>Created {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                {apiKey.lastUsedAt ? (
                  <span>Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>
                ) : (
                  <span>Never used</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key with specific permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Input label="Key Name" placeholder="e.g., Production API Key" />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Permissions
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {availableScopes.map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input type="checkbox" className="mt-1" defaultChecked />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{scope.label}</p>
                      <p className="text-xs text-slate-500">{scope.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Key Dialog */}
      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              Copy this key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="relative">
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300 break-all">
                {newKey}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => newKey && handleCopy('new', newKey)}
              >
                {copiedKey === 'new' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This key will only be shown once. Make sure to copy it and store it securely.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setNewKeyDialogOpen(false);
                setNewKey(null);
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              I&apos;ve Copied My Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
