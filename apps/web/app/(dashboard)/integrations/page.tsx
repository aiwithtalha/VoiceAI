'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Search,
  Plug,
  Check,
  X,
  RefreshCw,
  Settings,
  ExternalLink,
  Salesforce,
  Hubspot,
  Slack,
  Zapier,
  Calendar,
  Mail,
} from 'lucide-react';

const integrations = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync calls and contacts with Salesforce CRM',
    icon: 'salesforce',
    category: 'CRM',
    connected: true,
    lastSync: '2 minutes ago',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Integrate with HubSpot CRM and workflows',
    icon: 'hubspot',
    category: 'CRM',
    connected: false,
    lastSync: null,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and alerts in Slack',
    icon: 'slack',
    category: 'Communication',
    connected: true,
    lastSync: '5 minutes ago',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps via Zapier',
    icon: 'zapier',
    category: 'Automation',
    connected: false,
    lastSync: null,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Schedule and manage appointments',
    icon: 'calendar',
    category: 'Calendar',
    connected: true,
    lastSync: '1 minute ago',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Send transactional emails',
    icon: 'mail',
    category: 'Email',
    connected: false,
    lastSync: null,
  },
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'salesforce':
      return <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">S</div>;
    case 'hubspot':
      return <div className="h-6 w-6 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">H</div>;
    case 'slack':
      return <div className="h-6 w-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">S</div>;
    case 'zapier':
      return <div className="h-6 w-6 bg-orange-400 rounded flex items-center justify-center text-white text-xs font-bold">Z</div>;
    case 'calendar':
      return <Calendar className="h-6 w-6 text-blue-500" />;
    case 'mail':
      return <Mail className="h-6 w-6 text-blue-400" />;
    default:
      return <Plug className="h-6 w-6 text-slate-400" />;
  }
};

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntegrations = integrations.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
          <p className="text-slate-500">
            {connectedCount} of {integrations.length} integrations connected
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => (
          <Card key={integration.id} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    {getIcon(integration.icon)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{integration.name}</h3>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {integration.category}
                    </Badge>
                  </div>
                </div>
                {integration.connected ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                    <X className="h-4 w-4 text-slate-400" />
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-500 mb-4">{integration.description}</p>

              <div className="flex items-center justify-between">
                {integration.connected ? (
                  <>
                    <span className="text-xs text-slate-400">
                      Synced {integration.lastSync}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-slate-400">Not connected</span>
                    <Button size="sm">Connect</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Integration CTA */}
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                <Plug className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Need a Custom Integration?</h3>
                <p className="text-sm text-slate-600">
                  We can build custom integrations for your specific needs
                </p>
              </div>
            </div>
            <Button variant="outline">
              Contact Sales
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
