'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import {
  Settings,
  Building2,
  Shield,
  Bell,
  Webhook,
  Globe,
  Clock,
  Save,
  AlertTriangle,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('workspace');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your workspace settings</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="workspace">
            <Building2 className="h-4 w-4 mr-2" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Workspace Name" defaultValue="Acme Corp" />
              <Input label="Workspace Slug" defaultValue="acme-corp" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Timezone
                </label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option>America/New_York (EST)</option>
                  <option>America/Chicago (CST)</option>
                  <option>America/Denver (MST)</option>
                  <option>America/Los_Angeles (PST)</option>
                  <option>Europe/London (GMT)</option>
                  <option>Europe/Paris (CET)</option>
                  <option>Asia/Tokyo (JST)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Currency
                </label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                  <option>JPY (¥)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">HIPAA Compliance</p>
                  <p className="text-sm text-slate-500">
                    Enable HIPAA-compliant data handling
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">GDPR Compliance</p>
                  <p className="text-sm text-slate-500">
                    Enable GDPR data protection features
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">SOC 2 Mode</p>
                  <p className="text-sm text-slate-500">
                    Enhanced security and audit logging
                  </p>
                </div>
                <Switch />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recording Consent
                </label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option>Always require consent</option>
                  <option>Optional consent</option>
                  <option>Never require consent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data Retention (days)
                </label>
                <Slider defaultValue={[90]} min={7} max={365} step={1} />
                <p className="text-xs text-slate-500 mt-1">
                  Call recordings and transcripts will be deleted after this period
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Call Completion</p>
                  <p className="text-sm text-slate-500">
                    Notify when calls complete
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Failed Calls</p>
                  <p className="text-sm text-slate-500">
                    Notify when calls fail
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Low Balance</p>
                  <p className="text-sm text-slate-500">
                    Notify when wallet balance is low
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Weekly Summary</p>
                  <p className="text-sm text-slate-500">
                    Receive weekly usage summary
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">Production Endpoint</span>
                    <Switch defaultChecked />
                  </div>
                  <Input
                    defaultValue="https://api.example.com/webhooks/voiceai"
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Badge>call.completed</Badge>
                    <Badge>call.failed</Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Endpoint
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Debug Mode</p>
                  <p className="text-sm text-slate-500">
                    Enable detailed logging for troubleshooting
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Beta Features</p>
                  <p className="text-sm text-slate-500">
                    Access experimental features
                  </p>
                </div>
                <Switch />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="font-medium text-rose-600 mb-2">Danger Zone</p>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start text-rose-600">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Delete All Call Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-rose-600">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Delete Workspace
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
