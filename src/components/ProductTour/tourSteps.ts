export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement: "bottom" | "top" | "left" | "right" | "center";
  category?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "workspace-mode",
    target: '[data-tour="workspace-mode"]',
    title: "Workspace Mode",
    description:
      "Seamlessly toggle between Dev Mode (connected to your local project codebase for instant type generation) and Preview Mode (cloud/standalone API client).",
    placement: "bottom",
    category: "Navigation",
  },
  {
    id: "base-url",
    target: '[data-tour="base-url"]',
    title: "API Base URL",
    description:
      "View and edit the active host address for your API. Any changes you make here update test requests immediately.",
    placement: "bottom",
    category: "Configuration",
  },
  {
    id: "auth",
    target: '[data-tour="auth"]',
    title: "Authorization Settings",
    description:
      "Configure global or collection-specific authentication such as Bearer tokens, API keys, or custom headers applied to test calls.",
    placement: "bottom",
    category: "Security",
  },
  {
    id: "add-collection",
    target: '[data-tour="add-collection"]',
    title: "Import & Sync Collections",
    description:
      "Import OpenAPI/Swagger specifications, Postman collections, or sync from a remote URL to automatically scaffold endpoints.",
    placement: "bottom",
    category: "Collections",
  },
  {
    id: "ask-docs",
    target: '[data-tour="ask-docs"]',
    title: "AI Documentation Assistant",
    description:
      "Ask natural-language questions about your API schemas, discover required parameters, and get instant implementation examples.",
    placement: "bottom",
    category: "AI Tools",
  },
  {
    id: "method-filter",
    target: '[data-tour="method-filter"]',
    title: "Method Filter & Search",
    description:
      "Filter sidebar endpoints by HTTP methods (GET, POST, PUT, DELETE) or quickly search endpoints across all modules.",
    placement: "right",
    category: "Sidebar",
  },
  {
    id: "files-section",
    target: '[data-tour="files-section"]',
    title: "API Files & Modules",
    description:
      "Browse all API modules and endpoints. In Dev Mode, each module maps directly to a generated TypeScript client file inside your project's api-services/definitions/ directory.",
    placement: "right",
    category: "Sidebar",
  },
  {
    id: "collection-menu",
    target: '[data-tour="collection-menu"]',
    title: "Collection Management",
    description:
      "Click the options menu (⋮) on any collection to download JSON schemas, update definitions, rename, open in Sandbox, or delete.",
    placement: "right",
    category: "Sidebar",
  },
  {
    id: "workspace-area",
    target: '[data-tour="workspace-area"]',
    title: "Testing & Type Generation",
    description:
      "Test endpoints with query & body parameters, preview curl commands, inspect responses, and click 'Save Interface' to write TypeScript types directly into your project.",
    placement: "center",
    category: "Workspace",
  },
  {
    id: "user-menu",
    target: '[data-tour="user-menu"]',
    title: "Account & Preferences",
    description:
      "Manage your account, toggle themes, view billing / pro status, or replay this guide anytime from the menu.",
    placement: "top",
    category: "Settings",
  },
  {
    id: "setup-guide",
    target: '[data-tour="setup-guide"]',
    title: "Project Setup Guide",
    description:
      "Open the complete setup guide anytime to view CLI instructions (`reex start`), configure Prettier formatting, consume generated API clients, and set up project authentication.",
    placement: "left",
    category: "Developer",
  },
];
