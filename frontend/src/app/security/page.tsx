import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security – PriceBasket",
  description: "How PriceBasket keeps your account and data secure, and how to report a vulnerability.",
};

export default function SecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Security</p>
        <h1 className="text-3xl font-bold text-surface-900 mb-2">Security at PriceBasket</h1>
        <p className="text-sm text-surface-400">Last updated: May 2025</p>
      </div>

      <div className="prose prose-sm max-w-none space-y-8 text-surface-700">

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Our Commitment</h2>
          <p className="leading-relaxed">
            At PriceBasket, protecting your data is a top priority. We apply industry-standard practices at every layer
            of our platform — from how we store passwords to how we transmit data. This page explains what we do and
            what you can do to keep your account safe.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Data Encryption</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>In transit:</strong> All data between your browser and our servers is encrypted using TLS 1.2+ (HTTPS). We enforce HTTPS on every page and API endpoint.</li>
            <li><strong>At rest:</strong> Sensitive fields in our database are encrypted. Passwords are <em>never</em> stored in plain text — we use bcrypt with a per-user salt.</li>
            <li><strong>Tokens:</strong> Authentication tokens are short-lived JWTs. We do not store passwords in cookies or local storage.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Account Security</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Passwords are hashed with bcrypt (cost factor 12) and never logged or transmitted in plain text.</li>
            <li>Login attempts are rate-limited to prevent brute-force attacks.</li>
            <li>Sessions are invalidated on logout across all devices.</li>
            <li>We do not share your credentials with any third party, including the platforms we compare.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Infrastructure Security</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Our backend runs on managed, auto-patched cloud infrastructure with restricted network access.</li>
            <li>Database access is restricted to authenticated internal services only — it is not publicly accessible.</li>
            <li>We conduct regular dependency audits and apply security patches promptly.</li>
            <li>Deployment pipelines include automated security scans before release.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">What You Can Do</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Use a strong, unique password for your PriceBasket account — do not reuse passwords from other sites.</li>
            <li>Never share your password or login link with anyone.</li>
            <li>If you receive a suspicious email claiming to be from PriceBasket, do not click any links — contact us directly at <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline">founder@pricebasket.in</a>.</li>
            <li>Log out of shared or public devices after use.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Responsible Disclosure</h2>
          <p className="leading-relaxed mb-3">
            We welcome reports from security researchers. If you discover a vulnerability in PriceBasket, please report
            it to us privately before public disclosure so we can fix it and protect our users.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1.5">
            <p className="font-semibold text-surface-800">To report a vulnerability:</p>
            <p>
              Email{" "}
              <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline font-medium">
                founder@pricebasket.in
              </a>{" "}
              with the subject line <em>"Security Disclosure"</em>.
            </p>
            <p className="text-sm text-surface-500">
              Please include a clear description of the issue, steps to reproduce, and potential impact. We aim to
              acknowledge all reports within 48 hours and provide a fix timeline within 7 business days.
            </p>
          </div>
          <p className="text-sm text-surface-500 mt-3">
            We ask that you do not publicly disclose the issue until we have had a reasonable opportunity to address it.
            We do not take legal action against researchers who follow responsible disclosure practices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Incident Response</h2>
          <p className="leading-relaxed">
            In the unlikely event of a data breach, we will notify affected users within 72 hours as required by
            applicable regulations. Notifications will be sent to your registered email address. We will also publish a
            public summary of the incident, its scope, and the steps taken to prevent recurrence.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">Contact</h2>
          <p className="text-surface-600">For security concerns, reach us at:</p>
          <div className="mt-2 space-y-1">
            <p className="text-surface-600">
              Email:{" "}
              <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline">
                founder@pricebasket.in
              </a>
            </p>
            <p className="text-surface-600">Subject: <em>Security Disclosure</em></p>
          </div>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-surface-100 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="text-brand-600 hover:underline">Terms of Use</Link>
        <Link href="/contact" className="text-brand-600 hover:underline">Contact Us</Link>
        <Link href="/" className="text-brand-600 hover:underline">← Home</Link>
      </div>
    </div>
  );
}
