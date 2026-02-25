'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Phone, ArrowRight, Check, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const steps = [
  { id: 'phone', label: 'Enter Phone' },
  { id: 'otp', label: 'Verify' },
  { id: 'call', label: 'Demo Call' },
];

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setCurrentStep('otp');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setCurrentStep('call');
  };

  const handleStartCall = async () => {
    setCallStatus('calling');
    // Simulate call connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    setCallStatus('connected');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="py-20">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 mx-auto mb-4">
            <Phone className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Try a Live Demo
          </h1>
          <p className="text-slate-600">
            Experience our AI voice agent with a real phone call.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  currentStep === step.id
                    ? 'bg-indigo-600 text-white'
                    : steps.findIndex(s => s.id === currentStep) > index
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                {steps.findIndex(s => s.id === currentStep) > index ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'ml-2 text-sm hidden sm:block',
                  currentStep === step.id ? 'text-indigo-600 font-medium' : 'text-slate-500'
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-slate-200 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {currentStep === 'phone' && (
              <form onSubmit={handlePhoneSubmit}>
                <div className="space-y-4">
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-500">
                    We&apos;ll send a verification code to this number.
                  </p>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continue
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 'otp' && (
              <form onSubmit={handleOtpSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Enter Verification Code
                    </label>
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          className="w-12 h-12 text-center text-lg font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Code sent to {phoneNumber}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    Verify & Continue
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-indigo-600 hover:text-indigo-700"
                    onClick={() => setCurrentStep('phone')}
                  >
                    Change phone number
                  </button>
                </div>
              </form>
            )}

            {currentStep === 'call' && (
              <div className="text-center space-y-6">
                {callStatus === 'idle' && (
                  <>
                    <div className="bg-indigo-50 rounded-xl p-6">
                      <Volume2 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Ready for Your Demo Call
                      </h3>
                      <p className="text-sm text-slate-600">
                        Our AI assistant will call you and demonstrate natural conversation capabilities.
                      </p>
                    </div>
                    <Button onClick={handleStartCall} className="w-full" size="lg">
                      <Phone className="mr-2 h-4 w-4" />
                      Start Demo Call
                    </Button>
                  </>
                )}

                {callStatus === 'calling' && (
                  <div className="py-8">
                    <div className="flex justify-center gap-1 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-indigo-600 rounded-full animate-wave"
                          style={{
                            height: '20px',
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-lg font-medium text-slate-900">Calling...</p>
                    <p className="text-sm text-slate-500">{phoneNumber}</p>
                  </div>
                )}

                {callStatus === 'connected' && (
                  <div className="py-8">
                    <div className="flex justify-center gap-1 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-emerald-500 rounded-full animate-wave"
                          style={{
                            height: '30px',
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-lg font-medium text-emerald-600">Call Connected</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Talk to our AI assistant!
                    </p>
                    <Button
                      variant="destructive"
                      className="mt-6"
                      onClick={() => setCallStatus('ended')}
                    >
                      End Call
                    </Button>
                  </div>
                )}

                {callStatus === 'ended' && (
                  <div className="py-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
                      <Check className="h-8 w-8 text-emerald-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-900">Call Ended</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Thanks for trying our demo!
                    </p>
                    <div className="mt-6 space-y-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setCallStatus('idle')}
                      >
                        Try Again
                      </Button>
                      <Button className="w-full" onClick={() => window.location.href = '/signup'}>
                        Get Started Free
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust Badges */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 mb-4">
            Your information is secure and will never be shared.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              HIPAA Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
