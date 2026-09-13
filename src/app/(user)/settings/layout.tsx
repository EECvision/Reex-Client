import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata({
  title: "Workspace Settings",
  description:
    "Manage your Reex workspace theme, response viewer, editor preferences, keyboard shortcuts, and local browser storage.",
  path: "/settings",
  index: false,
});

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
