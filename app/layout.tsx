import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PiPilot SWE Agent - AI-Powered Software Development",
  description: "Transform your GitHub issues into production-ready code with intelligent automation. The future of software development with AI-driven SWE agents.",
  keywords: ["AI", "software development", "GitHub", "automation", "code generation", "SWE agent", "PiPilot"],
  authors: [{ name: "PiPilot Team" }],
  creator: "Hans Ade",
  publisher: "PiPilot",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://swe.pipilot.dev'),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "PiPilot SWE Agent - AI-Powered Software Development",
    description: "Transform your GitHub issues into production-ready code with intelligent automation.",
    url: "https://swe.pipilot.dev",
    siteName: "PiPilot SWE Agent",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "PiPilot SWE Agent Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PiPilot SWE Agent - AI-Powered Software Development",
    description: "Transform your GitHub issues into production-ready code with intelligent automation.",
    images: ["/logo.png"],
    creator: "@pipilot",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  }, 
  category: 'Technology',
 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
