'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Volume2,
  Play,
  Pause,
  Search,
  Filter,
  Star,
  Mic,
} from 'lucide-react';

const voices = [
  {
    id: 'nova',
    name: 'Nova',
    provider: 'OpenAI',
    language: 'English (US)',
    accent: 'American',
    gender: 'female',
    isPremium: false,
    isCloned: false,
  },
  {
    id: 'alloy',
    name: 'Alloy',
    provider: 'OpenAI',
    language: 'English (US)',
    accent: 'American',
    gender: 'neutral',
    isPremium: false,
    isCloned: false,
  },
  {
    id: 'echo',
    name: 'Echo',
    provider: 'OpenAI',
    language: 'English (US)',
    accent: 'American',
    gender: 'male',
    isPremium: false,
    isCloned: false,
  },
  {
    id: 'fable',
    name: 'Fable',
    provider: 'OpenAI',
    language: 'English (British)',
    accent: 'British',
    gender: 'male',
    isPremium: false,
    isCloned: false,
  },
  {
    id: 'onyx',
    name: 'Onyx',
    provider: 'OpenAI',
    language: 'English (US)',
    accent: 'American',
    gender: 'male',
    isPremium: false,
    isCloned: false,
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    provider: 'OpenAI',
    language: 'English (US)',
    accent: 'American',
    gender: 'female',
    isPremium: false,
    isCloned: false,
  },
  {
    id: 'rachel',
    name: 'Rachel',
    provider: 'ElevenLabs',
    language: 'English (US)',
    accent: 'American',
    gender: 'female',
    isPremium: true,
    isCloned: false,
  },
  {
    id: 'adam',
    name: 'Adam',
    provider: 'ElevenLabs',
    language: 'English (US)',
    accent: 'American',
    gender: 'male',
    isPremium: true,
    isCloned: false,
  },
  {
    id: 'custom-1',
    name: 'Brand Voice',
    provider: 'Custom',
    language: 'English (US)',
    accent: 'American',
    gender: 'female',
    isPremium: true,
    isCloned: true,
  },
];

export default function VoiceLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const filteredVoices = voices.filter((voice) => {
    const matchesSearch =
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.language.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider =
      providerFilter === 'all' || voice.provider.toLowerCase() === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const togglePlay = (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(voiceId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Voice Library</h1>
        <p className="text-slate-500">Browse and preview available voices</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVoices.map((voice) => (
          <Card key={voice.id} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <Volume2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{voice.name}</h3>
                    <p className="text-xs text-slate-500">{voice.provider}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {voice.isCloned && (
                    <Badge variant="secondary" className="text-xs">
                      <Mic className="h-3 w-3 mr-1" />
                      Cloned
                    </Badge>
                  )}
                  {voice.isPremium && (
                    <Badge variant="default" className="text-xs bg-amber-500">
                      <Star className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                <span>{voice.language}</span>
                <span>•</span>
                <span className="capitalize">{voice.gender}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => togglePlay(voice.id)}
                >
                  {playingVoice === voice.id ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Preview
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline">
                  Use Voice
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clone Voice CTA */}
      <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Clone Your Own Voice</h3>
                <p className="text-sm text-slate-600">
                  Create a custom voice clone for your brand
                </p>
              </div>
            </div>
            <Button>Get Started</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
