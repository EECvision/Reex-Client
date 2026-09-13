import type { Metadata } from "next";
import { STUDIO_URL } from "@/config/links";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(STUDIO_URL),
  title: {
    default: "Reex API Builder",
    template: "%s | Reex API Builder",
  },
  description:
    "Generate API integration code for your projects by uploading collections. A comprehensive toolkit for building, testing, and managing API integrations.",
  keywords: [
    "API",
    "Builder",
    "Integration",
    "Code Generation",
    "Reex",
    "reex commands",
    "reex cli",
    "reex start",
    "reex reset",
    "reex sync",
    "reex add",
    "npx reex-cli",
    "npm reex-cli",
  ],
  authors: [{ name: "ToolsHQ" }],
  openGraph: {
    title: "Reex API Builder",
    description:
      "Generate API integration code for your projects by uploading collections. A comprehensive toolkit for building, testing, and managing API integrations.",
    url: STUDIO_URL,
    siteName: "Reex API Builder",
    images: [
      {
        url: `${STUDIO_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Reex API Builder Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reex API Builder",
    description:
      "Generate API integration code for your projects by uploading collections.",
    images: [`${STUDIO_URL}/og-image.png`],
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

import { ProjectProvider } from "@/providers/ProjectContext";
import { SettingsProvider } from "@/providers/SettingsContext";
import QueryProvider from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastContext";
import { MobileGuard } from "@/components/MobileGuard/MobileGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <MobileGuard>
          <SettingsProvider>
            <QueryProvider>
              <ToastProvider>
                <ProjectProvider>{children}</ProjectProvider>
              </ToastProvider>
            </QueryProvider>
          </SettingsProvider>
        </MobileGuard>
      </body>
    </html>
  );
}
