'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { 
  BookOpen, 
  Code, 
  Rocket, 
  Phone, 
  Settings, 
  Zap,
  ArrowRight,
  FileText,
  MessageSquare,
  Webhook,
} from 'lucide-react';

const quickStartGuides = [
  {
    icon: Rocket,
    title: 'Getting Started',
    description: 'Create your first voice agent in under 5 minutes.',
    href: '#',
    readTime: '5 min',
  },
  {
    icon: Phone,
    title: 'Making Your First Call',
    description: 'Learn how to make outbound calls with your agent.',
    href: '#',
    readTime: '3 min',
  },
  {
    icon: Settings,
    title: 'Configuring Providers',
    description: 'Set up telephony, STT, LLM, and TTS providers.',
    href: '#',
    readTime: '8 min',
  },
  {
    icon: Zap,
    title: 'Advanced Features',
    description: 'Explore tools, webhooks, and custom integrations.',
    href: '#',
    readTime: '12 min',
  },
];

const apiSections = [
  {
    icon: Code,
    title: 'REST API',
    description: 'Complete API reference for all endpoints.',
    href: '#',
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    description: 'Receive real-time events from the platform.',
    href: '#',
  },
  {
    icon: MessageSquare,
    title: 'WebSocket API',
    description: 'Real-time streaming for advanced use cases.',
    href: '#',
  },
  {
    icon: FileText,
    title: 'SDKs',
    description: 'Official client libraries for popular languages.',
    href: '#',
  },
];

const docCategories = [
  {
    title: 'Assistants',
    links: [
      { name: 'Creating Assistants', href: '#' },
      { name: 'System Prompts', href: '#' },
      { name: 'Voice Configuration', href: '#' },
      { name: 'Tools & Functions', href: '#' },
    ],
  },
  {
    title: 'Phone Numbers',
    links: [
      { name: 'Buying Numbers', href: '#' },
      { name: 'Importing Numbers', href: '#' },
      { name: 'Number Porting', href: '#' },
      { name: 'SIP Configuration', href: '#' },
    ],
  },
  {
    title: 'Calls',
    links: [
      { name: 'Outbound Calls', href: '#' },
      { name: 'Inbound Calls', href: '#' },
      { name: 'Call Transfers', href: '#' },
      { name: 'Recording & Transcripts', href: '#' },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { name: 'CRM Integrations', href: '#' },
      { name: 'Calendar Booking', href: '#' },
      { name: 'Custom Tools', href: '#' },
      { name: 'Zapier', href: '#' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Documentation
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to build, deploy, and scale voice AI agents.
          </p>
        </div>

        {/* Quick Start Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickStartGuides.map((guide) => (
              <Link key={guide.title} href={guide.href}>
                <Card className="card-hover h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 flex-shrink-0">
                        <guide.icon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900">{guide.title}</h3>
                          <span className="text-xs text-slate-400">{guide.readTime}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{guide.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* API Reference Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">API Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {apiSections.map((section) => (
              <Link key={section.title} href={section.href}>
                <Card className="card-hover h-full">
                  <CardContent className="p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 mx-auto mb-4">
                      <section.icon className="h-6 w-6 text-slate-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{section.title}</h3>
                    <p className="text-sm text-slate-600">{section.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Documentation Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {docCategories.map((category) => (
            <div key={category.title}>
              <h3 className="font-semibold text-slate-900 mb-4">{category.title}</h3>
              <ul className="space-y-2">
                {category.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-16 bg-slate-50 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Can&apos;t find what you&apos;re looking for?
              </h2>
              <p className="text-slate-600">
                Our support team is here to help you get started.
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="#">
                <Button variant="outline">Browse All Docs</Button>
              </Link>
              <Link href="/contact">
                <Button>Contact Support</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
