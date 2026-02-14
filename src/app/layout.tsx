import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wopr.bot"),
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
    url: "https://wopr.bot",
    images: [{ url: "/og", width: 1200, height: 630, alt: "WOPR — AI Agent Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WOPR — AI Agent Platform",
    description: "What would you do with your own WOPR Bot? $5/month. wopr.bot",
    images: ["/og"],
  },
  alternates: {
    canonical: "https://wopr.bot",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
