import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — WOPR Bot",
  description: "Terms of Service for WOPR Bot",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using WOPR Bot at wopr.bot, you agree to be bound by these Terms of
            Service. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            2. Description of Service
          </h2>
          <p>
            WOPR Bot provides AI-powered bot orchestration services. You bring your own API keys for
            AI providers. WOPR Bot manages orchestration, memory, and channel integrations.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. Account Terms</h2>
          <p>
            You must provide accurate information when creating an account. You are responsible for
            maintaining the security of your account and any API keys you configure. You must be at
            least 13 years of age to use this service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Payment and Billing</h2>
          <p>
            Paid plans are billed monthly via Stripe. You may cancel at any time. AI provider costs
            are billed directly by your provider and are not included in WOPR Bot charges.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Acceptable Use</h2>
          <p>
            You agree not to use WOPR Bot for any unlawful purpose, to violate any third-party
            rights, or to transmit harmful content. We reserve the right to suspend accounts that
            violate this policy.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            6. Limitation of Liability
          </h2>
          <p>
            WOPR Bot is provided &ldquo;as is&rdquo; without warranties of any kind. We are not
            liable for any indirect, incidental, or consequential damages arising from your use of
            the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the service constitutes
            acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. Contact</h2>
          <p>
            Questions about these terms? Email us at{" "}
            <a
              href="mailto:legal@wopr.network"
              className="text-foreground underline underline-offset-4"
            >
              legal@wopr.network
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 flex gap-4 text-sm text-muted-foreground">
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Home
        </Link>
      </div>
    </div>
  );
}
