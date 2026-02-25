'use client';

export default function TermsPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-600 mb-4">
              By accessing or using the VoiceAI Platform (&quot;Service&quot;), you agree to be bound by these 
              Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or 
              use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-600 mb-4">
              VoiceAI Platform provides tools for creating, deploying, and managing AI-powered voice agents. 
              The Service includes web-based interfaces, APIs, and related services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Account Registration</h2>
            <p className="text-slate-600 mb-4">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Payment Terms</h2>
            <p className="text-slate-600 mb-4">
              Certain features of the Service require payment. You agree to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Pay all fees associated with your use of the Service</li>
              <li>Maintain a valid payment method on file</li>
              <li>Accept that fees are non-refundable except as required by law</li>
              <li>Understand that we may change pricing with 30 days notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Acceptable Use</h2>
            <p className="text-slate-600 mb-4">
              You agree not to use the Service for any unlawful or prohibited activities, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Violating any applicable laws or regulations</li>
              <li>Infringing intellectual property rights</li>
              <li>Transmitting harmful code or malware</li>
              <li>Harassment, abuse, or harm to individuals</li>
              <li>Unauthorized access to systems or data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-600 mb-4">
              The Service and its content, features, and functionality are owned by VoiceAI and are protected 
              by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-600 mb-4">
              To the maximum extent permitted by law, VoiceAI shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Termination</h2>
            <p className="text-slate-600 mb-4">
              We may terminate or suspend your account and access to the Service at any time, with or without 
              cause, with or without notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Changes to Terms</h2>
            <p className="text-slate-600 mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of any material 
              changes by posting the new Terms on this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Contact Information</h2>
            <p className="text-slate-600">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:legal@voiceai.com" className="text-indigo-600 hover:underline">
                legal@voiceai.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
