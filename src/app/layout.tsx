import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeEase - Virtual Space for Domestic Services",
  description: "Find trusted domestic service providers near you. Connect with verified professionals for cleaning, cooking, plumbing, caregiving, and more.",
  keywords: ["domestic services", "cleaning", "plumbing", "caregiving", "service providers", "home services", "Nigeria"],
  authors: [{ name: "HomeEase" }],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "HomeEase - Find Trusted Domestic Service Providers",
    description: "Connect with verified, rated professionals for cleaning, cooking, plumbing, caregiving, and more.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          src="https://js.paystack.co/v2/inline.js"
          async
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
