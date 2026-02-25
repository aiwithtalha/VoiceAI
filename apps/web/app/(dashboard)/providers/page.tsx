'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import {
  Phone,
  Mic,
  Brain,
  Volume2,
  Check,
  Key,
  ExternalLink,
  Settings,
} from 'lucide-react';

const providers = {
  telephony: [
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'Cloud communications platform',
      connected: true,
      isDefault: true,
    },
    {
      id: 'vonage',
      name: 'Vonage',
      description: 'Business communications',
      connected: false,
      isDefault: false,
    },
    {
      id: 'plivo',
      name: 'Plivo',
      description: 'Voice and SMS API',
      connected: false,
      isDefault: false,
    },
  ],
  stt: [
    {
      id: 'deepgram',
      name: 'Deepgram',
      description: 'Speech recognition API',
      connected: true,
      isDefault: true,
    },
    {
      id: 'assemblyai',
      name: 'AssemblyAI',
      description: 'Speech-to-text API',
      connected: false,
      isDefault: false,
    },
  ],
  llm: [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4, GPT-3.5 models',
      connected: true,
      isDefault: true,
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude models',
      connected: false,
      isDefault: false,
    },
    {
      id: 'google',
      name: 'Google',
      description: 'Gemini models',
      connected: false,
      isDefault: false,
    },
  ],
  tts: [
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      description: 'Premium voice synthesis',
      connected: true,
      isDefault: true,
    },
    {
      id: 'openai-tts',
      name: 'OpenAI',
      description: 'Text-to-speech API',
      connected: false,
      isDefault: false,
    },
  ],
};

export default function ProvidersPage() {
  const [activeTab, setActiveTab] = useState('telephony');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Models & Providers</h1>
        <p className="text-slate-500">Configure your AI service providers</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="telephony">
            <Phone className="h-4 w-4 mr-2" />
            Telephony
          </TabsTrigger>
          <TabsTrigger value="stt">
            <Mic className="h-4 w-4 mr-2" />
            STT
          </TabsTrigger>
          <TabsTrigger value="llm">
            <Brain className="h-4 w-4 mr-2" />
            LLM
          </TabsTrigger>
          <TabsTrigger value="tts">
            <Volume2 className="h-4 w-4 mr-2" />
            TTS
          </TabsTrigger>
        </TabsList>

        {Object.entries(providers).map(([category, providerList]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {providerList.map((provider) => (
              <Card key={provider.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                        {category === 'telephony' && <Phone className="h-6 w-6 text-slate-600" />}
                        {category === 'stt' && <Mic className="h-6 w-6 text-slate-600" />}
                        {category === 'llm' && <Brain className="h-6 w-6 text-slate-600" />}
                        {category === 'tts' && <Volume2 className="h-6 w-6 text-slate-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                          {provider.isDefault && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                          {provider.connected && (
                            <Badge variant="success" className="text-xs">Connected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{provider.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {provider.connected ? (
                        <>
                          <Button variant="outline" size="sm">
                            <Key className="mr-2 h-4 w-4" />
                            Update Key
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </Button>
                        </>
                      ) : (
                        <Button size="sm">
                          <Key className="mr-2 h-4 w-4" />
                          Connect
                        </Button>
                      )}
                      <a
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Auto-fallback</p>
              <p className="text-sm text-slate-500">
                Automatically fallback to backup providers on failure
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Cost optimization</p>
              <p className="text-sm text-slate-500">
                Automatically select most cost-effective provider
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
