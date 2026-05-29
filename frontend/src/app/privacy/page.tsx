import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PriceBasket collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-surface-400">Last updated: May 2025</p>
      </div>

      <div className="prose prose-sm max-w-none space-y-8 text-surface-700">

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">1. Information We Collect</h2>
          <p className="leading-relaxed mb-3">
            When you use PriceBasket, we may collect the following types of information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account information:</strong> Name, email address, and password (stored as a bcrypt hash — we never store plain-text passwords).</li>
            <li><strong>Profile data:</strong> Optional phone number, city, and pincode you provide to personalise delivery estimates.</li>
            <li><strong>Usage data:</strong> Products you search for, view, and add to cart — used to improve recommendations.</li>
            <li><strong>Session data:</strong> A browser session ID stored in localStorage to support guest cart functionality.</li>
            <li><strong>Device &amp; log data:</strong> IP address, browser type, and page visit timestamps for security and analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To provide and improve the price comparison service.</li>
            <li>To send price-drop alerts you have explicitly requested.</li>
            <li>To authenticate your account and keep it secure.</li>
            <li>To analyse aggregate usage patterns and improve the product.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p className="mt-3 leading-relaxed">
            We do <strong>not</strong> sell your personal data to third parties. We do not use your data for targeted advertising.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">3. Cookies &amp; Local Storage</h2>
          <p className="leading-relaxed mb-3">
            PriceBasket uses the following browser storage:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>httpOnly refresh token cookie:</strong> Stored securely by the browser; used to keep you logged in across sessions. Expires after 7 days of inactivity.</li>
            <li><strong>localStorage (pb_session_id):</strong> A random guest session ID for cart functionality before login.</li>
            <li><strong>localStorage (pb_client_id):</strong> An anonymous analytics identifier to understand aggregate usage patterns.</li>
          </ul>
          <p className="mt-3 leading-relaxed">
            You can clear all stored data at any time via your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">4. Data Sharing</h2>
          <p className="leading-relaxed">
            We share data only in the following limited circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-3">
            <li><strong>Service providers:</strong> Hosting (Render), database (PostgreSQL), and error monitoring (Sentry) — bound by data processing agreements.</li>
            <li><strong>Legal requirements:</strong> If required by law, court order, or to protect the rights and safety of our users.</li>
            <li><strong>Platform redirects:</strong> When you click "Shop on Blinkit / Zepto / etc.", you are redirected to that platform's website. We pass only the product search query in the URL — no personal data is shared.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">5. Data Retention</h2>
          <p className="leading-relaxed">
            We retain your account data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.
            Price history and anonymised analytics data may be retained indefinitely.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">6. Your Rights</h2>
          <p className="leading-relaxed mb-3">You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data via your Profile page.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Withdraw consent for email notifications at any time.</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, email us at{" "}
            <a href="mailto:privacy@pricebasket.in" className="text-brand-600 hover:underline font-medium">
              privacy@pricebasket.in
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">7. Security</h2>
          <p className="leading-relaxed">
            We use industry-standard security measures including bcrypt password hashing, JWT access tokens with short expiry, httpOnly cookies for refresh tokens, HTTPS-only communication, and rate limiting on all authentication endpoints.
            No system is 100% secure — please use a strong, unique password and contact us immediately if you suspect unauthorised access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">8. Children's Privacy</h2>
          <p className="leading-relaxed">
            PriceBasket is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">9. Changes to This Policy</h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify registered users by email of material changes. Continued use of PriceBasket after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">10. Contact Us</h2>
          <p className="leading-relaxed">
            For any privacy-related questions or requests, contact us at:
          </p>
          <div className="mt-3 p-4 bg-surface-50 rounded-xl border border-surface-100 text-sm">
            <p className="font-semibold text-surface-900">PriceBasket</p>
            <p className="text-surface-600 mt-1">Email: <a href="mailto:privacy@pricebasket.in" className="text-brand-600 hover:underline">privacy@pricebasket.in</a></p>
            <p className="text-surface-600">Website: <a href="https://pricebasket.in" className="text-brand-600 hover:underline">pricebasket.in</a></p>
          </div>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-surface-100 flex flex-wrap gap-4 text-sm">
        <Link href="/terms" className="text-brand-600 hover:underline font-medium">Terms of Service</Link>
        <Link href="/" className="text-surface-500 hover:text-surface-700">← Back to Home</Link>
      </div>
    </div>
  );
}
