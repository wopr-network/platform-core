import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_URL } from "@/lib/api-config";
import { TRPCProvider } from "@/lib/trpc";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "WOPR — AI Agent Platform",
    template: "%s | WOPR",
  },
  description: "What would you do with your own WOPR Bot? $5/month. wopr.bot",
  openGraph: {
    type: "website",
    siteName: "WOPR",
    title: "WOPR — AI Agent Platform",
    description: "What would you do with your own WOPR Bot? $5/month. wopr.bot",
    url: SITE_URL,
    images: [{ url: "/og", width: 1200, height: 630, alt: "WOPR — AI Agent Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WOPR — AI Agent Platform",
    description: "What would you do with your own WOPR Bot? $5/month. wopr.bot",
    images: ["/og"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>{nonce && <meta property="csp-nonce" content={nonce} />}</head>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TRPCProvider>
            {children}
            <Toaster theme="dark" richColors />
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
