'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
import { Slider } from '@/components/ui/Slider';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Settings,
  Play,
  Save,
  Bot,
  Phone,
  Volume2,
  Wand2,
  Check,
} from 'lucide-react';

const templates = [
  {
    id: 'sales',
    name: 'Sales Qualification',
    description: 'Qualify leads and book meetings',
    icon: Phone,
  },
  {
    id: 'support',
    name: 'Customer Support',
    description: 'Handle support inquiries',
    icon: MessageSquare,
  },
  {
    id: 'booking',
    name: 'Appointment Booking',
    description: 'Schedule and manage appointments',
    icon: Bot,
  },
  {
    id: 'survey',
    name: 'Phone Survey',
    description: 'Collect feedback via phone calls',
    icon: MessageSquare,
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    description: 'Build your own assistant',
    icon: Sparkles,
  },
];

const voices = [
  { id: 'alloy', name: 'Alloy', provider: 'OpenAI', gender: 'neutral' },
  { id: 'echo', name: 'Echo', provider: 'OpenAI', gender: 'male' },
  { id: 'fable', name: 'Fable', provider: 'OpenAI', gender: 'male' },
  { id: 'onyx', name: 'Onyx', provider: 'OpenAI', gender: 'male' },
  { id: 'nova', name: 'Nova', provider: 'OpenAI', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', provider: 'OpenAI', gender: 'female' },
];

export default function NewAssistantPage() {
  const router = useRouter();
  const [step, setStep] = useState<'template' | 'configure' | 'test'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [temperature, setTemperature] = useState([0.7]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'sales') {
      setName('Sales Assistant');
      setDescription('Qualifies leads and books meetings');
      setSystemPrompt(`You are a helpful sales assistant. Your goal is to qualify leads and book meetings with our sales team.

Be friendly and professional. Ask about their needs and budget. If they're a good fit, offer to schedule a meeting.`);
      setFirstMessage('Hi! Thanks for your interest. I\'d love to learn more about what you\'re looking for. What brings you in today?');
    } else if (templateId === 'support') {
      setName('Support Bot');
      setDescription('Handles customer support inquiries');
      setSystemPrompt(`You are a customer support specialist. Help customers with their issues and questions.

Be empathetic and solution-oriented. If you can't solve the issue, offer to escalate to a human agent.`);
      setFirstMessage('Hello! I\'m here to help. What can I assist you with today?');
    } else if (templateId === 'booking') {
      setName('Booking Agent');
      setDescription('Schedules appointments and sends reminders');
      setSystemPrompt(`You are an appointment scheduling assistant. Help customers book, reschedule, or cancel appointments.

Be efficient and clear about available times. Confirm all details before finalizing.`);
      setFirstMessage('Hi! I can help you schedule an appointment. What service are you looking for?');
    }
    setStep('configure');
  };

  const handleSave = () => {
    // Simulate saving
    router.push('/dashboard/assistants');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assistants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Assistant</h1>
          <p className="text-slate-500">Build a new AI voice agent</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {['template', 'configure', 'test'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? 'bg-indigo-600 text-white'
                  : ['template', 'configure', 'test'].indexOf(step) > i
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {['template', 'configure', 'test'].indexOf(step) > i ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`ml-2 text-sm capitalize ${
                step === s ? 'text-indigo-600 font-medium' : 'text-slate-500'
              }`}
            >
              {s}
            </span>
            {i < 2 && <div className="w-8 h-px bg-slate-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'template' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Choose a Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer card-hover ${
                  selectedTemplate === template.id ? 'border-indigo-500 ring-2 ring-indigo-500' : ''
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 mb-4">
                    <template.icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-slate-500">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === 'configure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sales Assistant"
                />
                <Input
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this assistant do?"
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
                  placeholder="Instructions for how the assistant should behave..."
                  rows={6}
                />
                <Input
                  label="First Message"
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="What the assistant says first..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Voice & Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Voice
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {voices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedVoice === voice.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Volume2 className="h-4 w-4 text-slate-400" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-900">{voice.name}</p>
                          <p className="text-xs text-slate-500">{voice.provider}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Temperature: {temperature[0]}
                  </label>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Lower values make responses more focused and deterministic.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-2">AgentSpec</p>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(
                      {
                        name,
                        description,
                        systemPrompt: systemPrompt.slice(0, 100) + '...',
                        firstMessage,
                        voice: selectedVoice,
                        temperature: temperature[0],
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" onClick={() => setStep('test')}>
                    <Play className="mr-2 h-4 w-4" />
                    Test Assistant
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {step === 'test' && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 mx-auto mb-6">
                <Phone className="h-10 w-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Test Your Assistant
              </h2>
              <p className="text-slate-600 mb-6">
                We&apos;ll call you so you can experience your assistant in action.
              </p>

              <div className="flex gap-3 justify-center">
                <Input
                  placeholder="Enter your phone number"
                  className="max-w-xs"
                />
                <Button>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Me
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200">
                <Button variant="outline" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save & Finish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
