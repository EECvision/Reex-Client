import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata({
  title: "Help & API Troubleshooting",
  description:
    "Get help with Reex API Studio: troubleshoot CORS and localhost requests, manage browser storage, generate TypeScript clients, and find community support.",
  path: "/support",
});

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
