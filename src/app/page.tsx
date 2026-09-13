import { homeStructuredData, pageMetadata, SITE_DESCRIPTION } from "@/config/seo";
import WorkspaceClient from "./WorkspaceClient";

export const metadata = pageMetadata({
  title: "The API Client & Code Generator for React & Next.js",
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <WorkspaceClient />
    </>
  );
}
