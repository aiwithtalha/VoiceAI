'use client';

export default function AcceptableUsePage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Acceptable Use Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Purpose</h2>
            <p className="text-slate-600 mb-4">
              This Acceptable Use Policy (&quot;Policy&quot;) outlines the rules and guidelines for using the 
              VoiceAI Platform (&quot;Service&quot;). By using the Service, you agree to comply with this Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Prohibited Activities</h2>
            <p className="text-slate-600 mb-4">
              You may not use the Service for any of the following purposes:
            </p>

            <h3 className="text-lg font-medium text-slate-800 mb-2">2.1 Illegal Activities</h3>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Any activity that violates applicable laws or regulations</li>
              <li>Fraud, scams, or deceptive practices</li>
              <li>Money laundering or terrorist financing</li>
              <li>Distribution of illegal goods or services</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2">2.2 Harmful Content</h3>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Content that promotes violence or terrorism</li>
              <li>Hate speech or discrimination</li>
              <li>Harassment, bullying, or stalking</li>
              <li>Child exploitation or abuse</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2">2.3 Spam and Abuse</h3>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Unsolicited bulk communications (spam)</li>
              <li>Robocalls without proper consent</li>
              <li>Caller ID spoofing</li>
              <li>Phishing attempts</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mb-2">2.4 Technical Abuse</h3>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Attempting to breach security measures</li>
              <li>Distributed denial of service (DDoS) attacks</li>
              <li>Unauthorized access to systems or data</li>
              <li>Interference with other users&apos; access to the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Telecommunications Compliance</h2>
            <p className="text-slate-600 mb-4">
              When using the Service for voice communications, you must:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Comply with all applicable telecommunications laws</li>
              <li>Obtain proper consent before making calls</li>
              <li>Honor do-not-call requests promptly</li>
              <li>Provide accurate caller identification</li>
              <li>Maintain required records and documentation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Content Responsibility</h2>
            <p className="text-slate-600 mb-4">
              You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>All content created using the Service</li>
              <li>Ensuring content does not infringe third-party rights</li>
              <li>Obtaining necessary licenses and permissions</li>
              <li>Complying with industry-specific regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Enforcement</h2>
            <p className="text-slate-600 mb-4">
              We reserve the right to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Investigate violations of this Policy</li>
              <li>Remove or disable access to violating content</li>
              <li>Suspend or terminate accounts for violations</li>
              <li>Report illegal activities to appropriate authorities</li>
              <li>Cooperate with law enforcement investigations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Reporting Violations</h2>
            <p className="text-slate-600 mb-4">
              If you become aware of any violation of this Policy, please report it to us at{' '}
              <a href="mailto:abuse@voiceai.com" className="text-indigo-600 hover:underline">
                abuse@voiceai.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Changes to This Policy</h2>
            <p className="text-slate-600 mb-4">
              We may update this Policy from time to time. We will notify you of any material changes 
              by posting the new Policy on this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Contact Information</h2>
            <p className="text-slate-600">
              If you have any questions about this Acceptable Use Policy, please contact us at{' '}
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
