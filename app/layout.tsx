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
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
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
 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
