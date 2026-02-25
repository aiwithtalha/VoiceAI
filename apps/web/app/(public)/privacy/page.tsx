'use client';

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-600 mb-4">
              VoiceAI Platform (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
              you use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-slate-800 mb-2">2.1 Personal Information</h3>
            <p className="text-slate-600 mb-4">
              We may collect personal information that you voluntarily provide, including:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Name and contact information</li>
              <li>Account credentials</li>
              <li>Billing information</li>
              <li>Communication preferences</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2">2.2 Usage Data</h3>
            <p className="text-slate-600 mb-4">
              We automatically collect certain information about your use of the Service:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and settings</li>
              <li>Usage patterns and interactions</li>
              <li>Call metadata and transcripts (if enabled)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-600 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Improve and personalize the Service</li>
              <li>Comply with legal obligations</li>
              <li>Detect and prevent fraud and abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Information Sharing</h2>
            <p className="text-slate-600 mb-4">
              We do not sell your personal information. We may share information with:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Service providers who assist in operating our Service</li>
              <li>Business partners with your consent</li>
              <li>Law enforcement when required by law</li>
              <li>Other parties in connection with a business transaction</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Security</h2>
            <p className="text-slate-600 mb-4">
              We implement appropriate technical and organizational measures to protect your information, 
              including encryption, access controls, and regular security assessments.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Your Rights</h2>
            <p className="text-slate-600 mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Access and receive a copy of your data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Object to certain processing activities</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Call Recordings</h2>
            <p className="text-slate-600 mb-4">
              If you enable call recording, we store recordings and transcripts securely. You are responsible 
              for obtaining necessary consent from call participants as required by applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. International Transfers</h2>
            <p className="text-slate-600 mb-4">
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-slate-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes by posting the new policy on this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Contact Us</h2>
            <p className="text-slate-600">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@voiceai.com" className="text-indigo-600 hover:underline">
                privacy@voiceai.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
