import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — WOPR Bot",
  description: "Privacy Policy for WOPR Bot",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p>
            We collect information you provide directly: your name, email address, and account
            credentials. We also collect usage data such as API call counts and feature usage for
            billing and service improvement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. API Keys</h2>
          <p>
            WOPR Bot uses a bring-your-own-key model. Your AI provider API keys are encrypted at
            rest and used only to make requests on your behalf. We do not log or store the content
            of your AI interactions.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            3. How We Use Your Information
          </h2>
          <p>
            We use your information to provide and maintain the service, process payments, send
            billing notifications, and improve WOPR Bot. We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Data Sharing</h2>
          <p>
            We share data with Stripe for payment processing and with your configured AI providers
            to fulfill requests. We do not share your information with third parties for marketing
            purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Data Retention</h2>
          <p>
            We retain your account data as long as your account is active. You may request deletion
            of your account and associated data at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. If you are in the
            EU, you have additional rights under GDPR. California residents have additional rights
            under CCPA. Contact us to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We do not use
            third-party tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            8. Changes to This Policy
          </h2>
          <p>
            We may update this policy from time to time. We will notify you of material changes via
            email or through the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">9. Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a
              href="mailto:privacy@wopr.network"
              className="text-foreground underline underline-offset-4"
            >
              privacy@wopr.network
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 flex gap-4 text-sm text-muted-foreground">
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms of Service
        </Link>
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Home
        </Link>
      </div>
    </div>
  );
}
