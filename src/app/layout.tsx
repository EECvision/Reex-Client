import type { Metadata } from "next";
import { INDEXING_ENABLED, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/config/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "ToolsHQ" }],
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  robots: {
    index: INDEXING_ENABLED,
    follow: true,
    googleBot: {
      index: INDEXING_ENABLED,
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
