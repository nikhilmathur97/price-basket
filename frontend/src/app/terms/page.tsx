import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using PriceBasket — India's price comparison platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-surface-400">Last updated: May 2025</p>
      </div>

      <div className="prose prose-sm max-w-none space-y-8 text-surface-700">

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">
            By accessing or using PriceBasket ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">2. Description of Service</h2>
          <p className="leading-relaxed">
            PriceBasket is a price comparison platform that aggregates product prices from multiple Indian quick-commerce and e-commerce platforms including Blinkit, Zepto, Swiggy Instamart, BigBasket, Flipkart, Amazon, JioMart, Myntra, and Nykaa.
          </p>
          <p className="mt-3 leading-relaxed">
            PriceBasket is an <strong>independent comparison service</strong>. We are not affiliated with, endorsed by, or officially connected to any of the platforms we compare. All trademarks belong to their respective owners.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">3. Price Accuracy Disclaimer</h2>
          <p className="leading-relaxed">
            Prices displayed on PriceBasket are fetched from third-party platforms and may not always reflect real-time availability or current pricing. Prices can change at any time without notice.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-3">
            <li>Always verify the final price on the platform before completing a purchase.</li>
            <li>PriceBasket is not responsible for price discrepancies between our display and the actual platform price.</li>
            <li>Product availability, delivery times, and offers shown are indicative and may vary.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">4. User Accounts</h2>
          <p className="leading-relaxed mb-3">When you create an account:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You must provide accurate and complete information.</li>
            <li>You are responsible for maintaining the security of your password.</li>
            <li>You must notify us immediately of any unauthorised use of your account.</li>
            <li>You must be at least 13 years old to create an account.</li>
            <li>One person may not maintain more than one account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">5. Acceptable Use</h2>
          <p className="leading-relaxed mb-3">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
            <li>Scrape, crawl, or systematically extract data from PriceBasket without written permission.</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
            <li>Use automated tools to create accounts or submit requests at a rate that burdens our servers.</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">6. Intellectual Property</h2>
          <p className="leading-relaxed">
            The PriceBasket name, logo, and all content created by us (including but not limited to the comparison interface, cart optimizer, and price intelligence features) are owned by PriceBasket and protected by applicable intellectual property laws.
          </p>
          <p className="mt-3 leading-relaxed">
            Product names, brand names, and trademarks of third-party platforms remain the property of their respective owners. Their appearance on PriceBasket does not imply endorsement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">7. Third-Party Links</h2>
          <p className="leading-relaxed">
            PriceBasket contains links to third-party platforms (Blinkit, Zepto, etc.). These links are provided for your convenience. We have no control over the content, privacy practices, or terms of those platforms and are not responsible for any transactions you complete on them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">8. Limitation of Liability</h2>
          <p className="leading-relaxed">
            To the maximum extent permitted by applicable law, PriceBasket and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of or inability to use the Service.
          </p>
          <p className="mt-3 leading-relaxed">
            Our total liability to you for any claim arising from these Terms or your use of the Service shall not exceed ₹500 or the amount you paid us in the past 12 months, whichever is greater.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">9. Indemnification</h2>
          <p className="leading-relaxed">
            You agree to indemnify and hold harmless PriceBasket and its operators from any claims, damages, losses, or expenses (including legal fees) arising from your violation of these Terms or your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">10. Termination</h2>
          <p className="leading-relaxed">
            We reserve the right to suspend or terminate your account at any time for violation of these Terms, without prior notice. You may delete your account at any time by contacting us at{" "}
            <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline">founder@pricebasket.in</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">11. Governing Law</h2>
          <p className="leading-relaxed">
            These Terms are governed by the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra, India.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">12. Changes to Terms</h2>
          <p className="leading-relaxed">
            We may update these Terms from time to time. We will notify registered users of material changes by email. Continued use of the Service after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-surface-900 mb-3">13. Contact</h2>
          <div className="p-4 bg-surface-50 rounded-xl border border-surface-100 text-sm">
            <p className="font-semibold text-surface-900">PriceBasket</p>
            <p className="text-surface-600 mt-1">Email: <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline">founder@pricebasket.in</a></p>
            <p className="text-surface-600">Website: <a href="https://pricebasket.in" className="text-brand-600 hover:underline">pricebasket.in</a></p>
          </div>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-surface-100 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="text-brand-600 hover:underline font-medium">Privacy Policy</Link>
        <Link href="/" className="text-surface-500 hover:text-surface-700">← Back to Home</Link>
      </div>
    </div>
  );
}
