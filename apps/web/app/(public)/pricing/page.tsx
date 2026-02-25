'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Check, Sparkles, Building2, Phone } from 'lucide-react';

const payAsYouGoFeatures = [
  'Unlimited assistants',
  'All telephony providers',
  'All voice providers',
  'All LLM providers',
  'Call recordings & transcripts',
  'Basic analytics',
  'Email support',
  'API access',
];

const enterpriseFeatures = [
  'Everything in Pay-as-you-go',
  'Custom contracts',
  'Volume discounts',
  'Dedicated support',
  'SLA guarantees',
  'SSO & SAML',
  'Audit logs',
  'Custom integrations',
  'On-premise deployment',
];

const pricingTiers = [
  {
    name: 'Starter',
    description: 'For individuals and small projects',
    price: '$0',
    period: '/month',
    features: [
      '$5 free credit',
      'Up to 100 calls/month',
      '1 phone number',
      'Basic voices',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pay-as-you-go',
    description: 'For growing businesses',
    price: 'Custom',
    period: '',
    features: payAsYouGoFeatures,
    cta: 'Start Free Trial',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations',
    price: 'Custom',
    period: '',
    features: enterpriseFeatures,
    cta: 'Contact Sales',
    href: '/contact',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Start free and scale as you grow. Only pay for what you use.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative ${tier.highlighted ? 'border-indigo-500 shadow-lg scale-105' : ''}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
                <p className="text-sm text-slate-500">{tier.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">{tier.price}</span>
                  <span className="text-slate-500">{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={tier.href} className="block">
                  <Button
                    variant={tier.highlighted ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage-Based Pricing */}
        <div className="bg-slate-50 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Usage-Based Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 text-center">
              <Phone className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-slate-900">$0.02</div>
              <div className="text-sm text-slate-500">per minute</div>
              <div className="text-xs text-slate-400 mt-1">Telephony</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center">
              <Sparkles className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-slate-900">$0.006</div>
              <div className="text-sm text-slate-500">per minute</div>
              <div className="text-xs text-slate-400 mt-1">Speech-to-Text</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center">
              <Sparkles className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-slate-900">$0.05</div>
              <div className="text-sm text-slate-500">per minute</div>
              <div className="text-xs text-slate-400 mt-1">Text-to-Speech</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center">
              <Sparkles className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-slate-900">$0.002</div>
              <div className="text-sm text-slate-500">per 1K tokens</div>
              <div className="text-xs text-slate-400 mt-1">LLM (GPT-3.5)</div>
            </div>
          </div>
          <p className="text-center text-sm text-slate-500 mt-6">
            Prices shown are estimates. Actual pricing varies by provider. Bring your own API keys for even lower costs.
          </p>
        </div>

        {/* Enterprise CTA */}
        <div className="bg-indigo-900 rounded-2xl p-8 text-center">
          <Building2 className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Need a Custom Solution?
          </h2>
          <p className="text-indigo-200 mb-6 max-w-xl mx-auto">
            We offer custom pricing for enterprises with high volume needs, 
            compliance requirements, or special integrations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button variant="secondary" size="lg">
                Contact Sales
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                variant="outline"
                size="lg"
                className="border-indigo-400 text-white hover:bg-indigo-800"
              >
                Schedule Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
