'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import {
  Bot,
  Send,
  Sparkles,
  Phone,
  Mic,
  Brain,
  Volume2,
  Play,
  Save,
  RotateCcw,
  Check,
  Loader2,
  MessageSquare,
  Code,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentSpec {
  name: string;
  description: string;
  systemPrompt: string;
  firstMessage: string;
  providerConfig: {
    telephonyProvider: string;
    sttProvider: string;
    llmProvider: string;
    ttsProvider: string;
    llmModel: string;
  };
  voiceConfig: {
    provider: string;
    voiceId: string;
  };
}

const templates = [
  { id: 'sales', name: 'Sales Qualification', icon: Phone },
  { id: 'support', name: 'Customer Support', icon: MessageSquare },
  { id: 'booking', name: 'Appointment Booking', icon: Bot },
  { id: 'survey', name: 'Phone Survey', icon: Mic },
];

const providers = {
  telephony: ['Twilio', 'Vonage', 'Plivo'],
  stt: ['Deepgram', 'AssemblyAI', 'Google'],
  llm: ['OpenAI', 'Anthropic', 'Google'],
  tts: ['ElevenLabs', 'OpenAI', 'Google'],
};

const voices = [
  { id: 'nova', name: 'Nova', provider: 'OpenAI' },
  { id: 'alloy', name: 'Alloy', provider: 'OpenAI' },
  { id: 'echo', name: 'Echo', provider: 'OpenAI' },
  { id: 'rachel', name: 'Rachel', provider: 'ElevenLabs' },
];

export function Composer() {
  const [step, setStep] = useState<'chat' | 'configure' | 'preview'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m here to help you create an AI voice assistant. What would you like your assistant to do?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [agentSpec, setAgentSpec] = useState<AgentSpec>({
    name: '',
    description: '',
    systemPrompt: '',
    firstMessage: '',
    providerConfig: {
      telephonyProvider: 'Twilio',
      sttProvider: 'Deepgram',
      llmProvider: 'OpenAI',
      ttsProvider: 'ElevenLabs',
      llmModel: 'gpt-4',
    },
    voiceConfig: {
      provider: 'ElevenLabs',
      voiceId: 'rachel',
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    // Simulate AI response and spec generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const assistantResponse: Message = {
      role: 'assistant',
      content: 'Great! I\'ll create a sales qualification assistant for you. It will ask about their needs, budget, and timeline.',
    };

    setMessages((prev) => [...prev, assistantResponse]);
    setAgentSpec((prev) => ({
      ...prev,
      name: 'Sales Qualification Assistant',
      description: 'Qualifies leads by asking about needs, budget, and timeline',
      systemPrompt: `You are a sales qualification assistant. Your goal is to qualify leads by asking about:
1. Their specific needs and pain points
2. Their budget range
3. Their timeline for making a decision

Be friendly and professional. Take notes on their responses.`,
      firstMessage: 'Hi! Thanks for your interest. I\'d love to learn more about what you\'re looking for. What brings you in today?',
    }));
    setIsGenerating(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setStep('configure');

    if (templateId === 'sales') {
      setAgentSpec((prev) => ({
        ...prev,
        name: 'Sales Qualification Assistant',
        description: 'Qualifies leads by asking about needs, budget, and timeline',
        systemPrompt: `You are a sales qualification assistant. Your goal is to qualify leads by asking about their needs, budget, and timeline.

Be friendly and professional. Don't be pushy.`,
        firstMessage: 'Hi! Thanks for your interest. I\'d love to learn more about what you\'re looking for.',
      }));
    } else if (templateId === 'support') {
      setAgentSpec((prev) => ({
        ...prev,
        name: 'Customer Support Bot',
        description: 'Handles customer support inquiries and troubleshooting',
        systemPrompt: `You are a customer support specialist. Help customers with their issues and questions.

Be empathetic and solution-oriented.`,
        firstMessage: 'Hello! I\'m here to help. What can I assist you with today?',
      }));
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Left Panel - Chat/Builder */}
      <div className="flex-1 flex flex-col">
        {step === 'chat' && (
          <>
            {/* Templates */}
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Start with a template</p>
              <div className="grid grid-cols-4 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <template.icon className="h-6 w-6 text-indigo-600" />
                    <span className="text-sm font-medium text-slate-900">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                      message.role === 'user'
                        ? 'bg-indigo-600'
                        : 'bg-indigo-100'
                    )}
                  >
                    {message.role === 'user' ? (
                      <span className="text-white text-sm">You</span>
                    ) : (
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2',
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-900 rounded-tl-none'
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-3">
              <Input
                placeholder="Describe what you want your assistant to do..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isGenerating}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 'configure' && (
          <div className="space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Configure Assistant</h3>
              <Button variant="outline" size="sm" onClick={() => setStep('chat')}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Name"
                  value={agentSpec.name}
                  onChange={(e) =>
                    setAgentSpec((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  label="Description"
                  value={agentSpec.description}
                  onChange={(e) =>
                    setAgentSpec((prev) => ({ ...prev, description: e.target.value }))
                  }
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
                  value={agentSpec.systemPrompt}
                  onChange={(e) =>
                    setAgentSpec((prev) => ({ ...prev, systemPrompt: e.target.value }))
                  }
                  rows={6}
                />
                <Input
                  label="First Message"
                  value={agentSpec.firstMessage}
                  onChange={(e) =>
                    setAgentSpec((prev) => ({ ...prev, firstMessage: e.target.value }))
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Telephony
                    </label>
                    <Select
                      value={agentSpec.providerConfig.telephonyProvider}
                      onValueChange={(value) =>
                        setAgentSpec((prev) => ({
                          ...prev,
                          providerConfig: { ...prev.providerConfig, telephonyProvider: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.telephony.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Speech-to-Text
                    </label>
                    <Select
                      value={agentSpec.providerConfig.sttProvider}
                      onValueChange={(value) =>
                        setAgentSpec((prev) => ({
                          ...prev,
                          providerConfig: { ...prev.providerConfig, sttProvider: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.stt.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Language Model
                    </label>
                    <Select
                      value={agentSpec.providerConfig.llmProvider}
                      onValueChange={(value) =>
                        setAgentSpec((prev) => ({
                          ...prev,
                          providerConfig: { ...prev.providerConfig, llmProvider: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.llm.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Text-to-Speech
                    </label>
                    <Select
                      value={agentSpec.providerConfig.ttsProvider}
                      onValueChange={(value) =>
                        setAgentSpec((prev) => ({
                          ...prev,
                          providerConfig: { ...prev.providerConfig, ttsProvider: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.tts.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Voice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {voices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() =>
                        setAgentSpec((prev) => ({
                          ...prev,
                          voiceConfig: { provider: voice.provider, voiceId: voice.id },
                        }))
                      }
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        agentSpec.voiceConfig.voiceId === voice.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Volume2 className="h-5 w-5 text-slate-400" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{voice.name}</p>
                        <p className="text-xs text-slate-500">{voice.provider}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('chat')}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep('preview')}>
                Preview & Test
                <Play className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Preview & Test</h3>
              <Button variant="outline" size="sm" onClick={() => setStep('configure')}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Edit Configuration
              </Button>
            </div>

            <Card className="bg-gradient-to-br from-indigo-50 to-violet-50">
              <CardContent className="p-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 mx-auto mb-6">
                  <Phone className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Ready to Test Your Assistant
                </h3>
                <p className="text-slate-600 mb-6">
                  We&apos;ll call you so you can experience your assistant in action
                </p>
                <div className="flex gap-3 justify-center">
                  <Input placeholder="Enter your phone number" className="max-w-xs" />
                  <Button>
                    <Phone className="mr-2 h-4 w-4" />
                    Test Call
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('configure')}>
                Back
              </Button>
              <Button className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Save Assistant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Live Preview */}
      <div className="w-96 flex-shrink-0">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              AgentSpec Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-slate-300 font-mono">
                {JSON.stringify(agentSpec, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
