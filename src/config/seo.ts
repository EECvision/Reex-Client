import type { Metadata } from "next";
import brand from "../../seo/brand.json";
import { STUDIO_URL } from "./links";

// Set these at build time: metadata routes and public pages are prerendered.
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || STUDIO_URL,
).origin;

export const SITE_NAME = brand.sites.studio.name;
export const SITE_DESCRIPTION =
  `${brand.productName} is ${brand.positioning.replace(/^The /, "the ")}. Use ${SITE_NAME} to test endpoints and generate production-ready typed API services, TanStack Query hooks, and auth providers.`;

export const INDEXING_ENABLED =
  process.env.SEO_NOINDEX !== "true" &&
  process.env.NODE_ENV === "production" &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");

export const PUBLIC_PATHS = ["/", "/support"] as const;

export function siteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const canIndex = INDEXING_ENABLED && index;
  const fullTitle = path === "/" ? `${SITE_NAME} | ${title}` : `${title} | ${SITE_NAME}`;
  const image = {
    url: siteUrl("/og-image.png"),
    width: 1200,
    height: 630,
    alt: SITE_NAME,
  };

  return {
    title: { absolute: fullTitle },
    description,
    ...(index ? { alternates: { canonical: siteUrl(path) } } : {}),
    openGraph: {
      title: fullTitle,
      description,
      url: siteUrl(path),
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    robots: {
      index: canIndex,
      follow: true,
      googleBot: {
        index: canIndex,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": siteUrl("/#website"),
      name: SITE_NAME,
      alternateName: brand.sites.studio.alternateNames,
      url: siteUrl("/"),
      inLanguage: "en",
      about: { "@id": brand.entities.product },
    },
    {
      "@type": "WebApplication",
      "@id": siteUrl("/#application"),
      name: SITE_NAME,
      url: siteUrl("/"),
      description: SITE_DESCRIPTION,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web browser",
      isAccessibleForFree: true,
      featureList: [
        "Import Postman and OpenAPI collections",
        "Test API requests, including localhost with reex-proxy",
        "Create and organize requests in API Sandbox",
        "Generate API functions and TanStack Query hooks for React and Next.js",
        "Generate TypeScript interfaces from API responses",
        "Generate authentication helpers for frontend applications",
        "Sync API definitions between the UI and local project",
        "Review collection changes before applying updates",
      ],
      isPartOf: { "@id": brand.entities.product },
      mainEntityOfPage: { "@id": siteUrl("/#website") },
    },
  ],
};
