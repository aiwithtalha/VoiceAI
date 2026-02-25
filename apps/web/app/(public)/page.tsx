'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import {
  Phone,
  Bot,
  Zap,
  Shield,
  BarChart3,
  Globe,
  Headphones,
  Calendar,
  MessageSquare,
  Check,
  ArrowRight,
  Play,
  Star,
  Users,
  Building2,
  PhoneCall,
} from 'lucide-react';

const useCases = [
  {
    icon: PhoneCall,
    title: 'Sales Calls',
    description: 'Automate outbound sales calls, qualify leads, and book meetings 24/7.',
  },
  {
    icon: Headphones,
    title: 'Customer Support',
    description: 'Handle support inquiries, troubleshoot issues, and escalate when needed.',
  },
  {
    icon: Calendar,
    title: 'Appointment Booking',
    description: 'Let customers schedule, reschedule, and cancel appointments by voice.',
  },
  {
    icon: MessageSquare,
    title: 'Surveys & Feedback',
    description: 'Conduct phone surveys and collect customer feedback at scale.',
  },
];

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Conversations',
    description: 'Natural, human-like conversations powered by state-of-the-art language models.',
  },
  {
    icon: Globe,
    title: 'Multi-Language Support',
    description: 'Support for 30+ languages with native-sounding voices and accents.',
  },
  {
    icon: Zap,
    title: 'Real-Time Processing',
    description: 'Sub-second latency for natural, flowing conversations without awkward pauses.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 Type II, HIPAA, and GDPR compliant with end-to-end encryption.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Detailed call transcripts, sentiment analysis, and outcome tracking.',
  },
  {
    icon: Phone,
    title: 'Universal Telephony',
    description: 'Connect any provider: Twilio, Vonage, Plivo, or bring your own SIP.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Design Your Agent',
    description: 'Use our visual composer or write prompts to define how your AI agent behaves.',
  },
  {
    number: '02',
    title: 'Connect & Configure',
    description: 'Link your telephony provider, choose voices, and set up integrations.',
  },
  {
    number: '03',
    title: 'Deploy & Scale',
    description: 'Go live in minutes with phone numbers, web calls, or API integration.',
  },
];

const testimonials = [
  {
    quote: "VoiceAI reduced our support costs by 60% while improving customer satisfaction scores.",
    author: "Sarah Chen",
    role: "VP of Customer Success",
    company: "TechCorp Inc.",
  },
  {
    quote: "We booked 3x more meetings after deploying VoiceAI for our outbound sales team.",
    author: "Michael Ross",
    role: "Sales Director",
    company: "GrowthLabs",
  },
  {
    quote: "The best voice AI platform we've tried. Setup took less than an hour.",
    author: "Emily Watson",
    role: "CTO",
    company: "HealthFirst",
  },
];

const faqs = [
  {
    question: "What is VoiceAI Platform?",
    answer: "VoiceAI Platform is a comprehensive solution for building, deploying, and managing AI-powered voice agents. It connects any telephony provider with speech-to-text, language models, and text-to-speech services.",
  },
  {
    question: "How quickly can I get started?",
    answer: "You can create your first voice agent in minutes using our visual composer. Simply describe what you want your agent to do, and we'll generate the configuration for you.",
  },
  {
    question: "What telephony providers are supported?",
    answer: "We support Twilio, Vonage, Plivo, and any SIP-compatible provider. You can also use our built-in web calling feature for browser-based calls.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We're SOC 2 Type II certified, HIPAA compliant, and GDPR ready. All data is encrypted in transit and at rest. Enterprise plans include dedicated infrastructure.",
  },
  {
    question: "Can I use my own AI models?",
    answer: "Yes! You can bring your own API keys for OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint. You have full control over model selection and configuration.",
  },
  {
    question: "What languages are supported?",
    answer: "We support 30+ languages including English, Spanish, French, German, Portuguese, Japanese, Mandarin, and more. Each language has multiple voice options.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-20 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-100/50 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-violet-100/50 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-8">
              <Star className="h-4 w-4" />
              Now with GPT-4 Turbo support
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Build Voice AI Agents
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                That Sound Human
              </span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Create, deploy, and scale AI-powered voice agents for sales, support, and operations. 
              Connect any telephony, STT, LLM, and TTS provider.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Building Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Play className="mr-2 h-4 w-4" />
                  Try Live Demo
                </Button>
              </Link>
            </div>
            
            <div className="mt-10 flex items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Free tier included
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="features" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Use Cases</h2>
            <p className="mt-4 text-lg text-slate-600">
              Deploy voice AI for any business scenario
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 mb-4">
                    <useCase.icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-sm text-slate-600">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Platform Features</h2>
            <p className="mt-4 text-lg text-slate-600">
              Everything you need to build production-ready voice AI
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                    <feature.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
            <p className="mt-4 text-lg text-slate-600">
              From idea to production in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="text-6xl font-bold text-indigo-100 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-16 bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white">10M+</div>
              <div className="mt-1 text-sm text-slate-400">Calls Handled</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">500+</div>
              <div className="mt-1 text-sm text-slate-400">Companies</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">99.9%</div>
              <div className="mt-1 text-sm text-slate-400">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">&lt;500ms</div>
              <div className="mt-1 text-sm text-slate-400">Avg Latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Trusted by Teams</h2>
            <p className="mt-4 text-lg text-slate-600">
              See what our customers have to say
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                      <span className="text-sm font-medium text-indigo-700">
                        {testimonial.author.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {testimonial.author}
                      </p>
                      <p className="text-xs text-slate-500">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg text-slate-600">
              Everything you need to know about VoiceAI
            </p>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Your Voice AI Agent?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Start free today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10"
              >
                <Phone className="mr-2 h-4 w-4" />
                Try Demo Call
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
