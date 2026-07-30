# Reex API Builder — Glossary & File Map

## Glossary

| Term | Definition |
|------|-----------|
| **Bridge** | The `reex-cli` npm package. An Express.js server running on the developer's machine that provides filesystem access and code generation services to the hosted Cloud UI. |
| **Definition File** | A TypeScript file in `api-services/definitions/` authored by the developer. Contains an exported object literal (`xxxApi`) whose properties are async functions representing API endpoints. |
| **Manifest** | A JSON object produced by `ProjectService.generateManifest()`. Describes every endpoint in the project: function names, parameters, HTTP methods, URLs, auth requirements. |
| **Operation Relay** | The pattern by which the Cloud UI computes file changes (via Next.js API routes + ts-morph) and relays them to the bridge's filesystem routes. The UI never writes files directly. |
| **Scaffold-Once** | A template copying strategy where files are only created if they don't already exist. Prevents overwriting developer customizations. |
| **Regeneration** | The full pipeline triggered by a file change: prune → manifest → hooks → types → barrel → scaffold → format → sanitize → SSE broadcast. |
| **Selective Regeneration** | An optimization where only the hooks and types for changed modules are regenerated. Barrel files and formatting always run. |
| **SSE (Server-Sent Events)** | A one-way real-time communication channel from the bridge to the Cloud UI. Used for sync notifications, task progress, and error reporting. |
| **Standalone Mode** | When the Cloud UI operates without a bridge connection. Collections are browser-stored, API requests are proxied through the server. |
| **getInitializerObject()** | The centralized AST utility that safely unwraps TypeScript syntax wrappers (`as`, `satisfies`, angle-bracket, `!`, `()`) to extract the underlying object literal from a variable declaration. |
| **Query Key Factory** | A generated object (`{module}Keys`) providing type-safe functions to create cache keys for React Query, enabling granular cache invalidation. |
| **Barrel File** | `definitions/index.ts` — auto-generated file that re-exports all module APIs into a single unified `api` object. |

---

## File Map: `api-npm-bridge` (reex-cli)

### Root
| File | Purpose |
|------|---------|
| `package.json` | npm package config. Defines `reex` binary, dependencies, published files |
| `server.js` | Express server factory. Configures CORS, JSON parsing, routes, services |
| `paths.js` | Path resolution. Detects `src/` folder, exports absolute paths to key directories |

### `bin/`
| File | Purpose |
|------|---------|
| `index.js` | CLI entry point. Defines all `reex` commands using `commander` |

### `routes/`
| File | Purpose |
|------|---------|
| `fs-routes.js` | Filesystem HTTP API (write, read, delete, list) with path traversal protection |
| `project-routes.js` | Project HTTP API (manifest, config, modules, definitions, config update) |

### `services/`
| File | Purpose |
|------|---------|
| `project-service.js` | **Core engine**. Uses ts-morph to generate manifests, parse project config, extract env vars |
| `generator-service.js` | Orchestrates the full regeneration pipeline. Scaffolding, generation, formatting, sanitization |
| `hook-service.js` | Generates React Query hooks (queries, mutations, key factories, collision handling) |
| `type-service.js` | Generates/maintains type scaffold files with user-override preservation |
| `watcher-service.js` | File change detection via chokidar with smart debouncing |
| `sse-service.js` | Server-Sent Events broadcaster for real-time UI communication |
| `converter/` | Collection format converters |

### `utils/`
| File | Purpose |
|------|---------|
| `ast.js` | Centralized AST unwrapping utility (`getInitializerObject`) — CommonJS version |

### `templates-shared/`
| File | Purpose |
|------|---------|
| `api.config.ts` | Default config template (baseURL, auth settings) |
| `core.ts` | HTTP client builder template (axios instance factory) |
| `module.template.ts` | Template for `reex add module` scaffolding |
| `hooks/` | Utility hook templates (useAuthState, useClearSession, useNotification) |
| `providers/` | React provider templates (QueryClient, Auth) |
| `auth-methods/` | Auth strategy templates |

### `templates-next/` / `templates-react/`
| Directory | Purpose |
|-----------|---------|
| `auth-methods/` | Framework-specific auth implementations (cookies-next vs localStorage) |

---

## File Map: `api-next-server` (Cloud UI)

### `src/app/`
| File | Purpose |
|------|---------|
| `page.tsx` | **Main application**. Tab management, layout, modal orchestration, tab sync logic |
| `layout.tsx` | Root layout with providers (Auth, Project, Settings, QueryClient) |
| `globals.css` | Global CSS reset and design tokens |
| `page.module.css` | Main page layout styles |

### `src/app/api/` (Next.js Server-Side Routes)
| Route | Purpose |
|-------|---------|
| `delete-item/route.ts` | Computes file operations for deleting an endpoint (uses ts-morph + getInitializerObject) |
| `analyze-collection/route.ts` | Parses uploaded Postman/OpenAPI files, returns endpoint analysis |
| `update-collection/route.ts` | Processes collection updates, generates definition files |
| `sync-collection/route.ts` | Syncs collection changes with existing definitions |
| `delete-collection/route.ts` | Handles module/collection deletion |
| `preview-types/route.ts` | Generates type previews from endpoint metadata |
| `save-types/route.ts` | Persists type definitions |
| `generate-template/route.ts` | Generates complete project templates |
| `execute-proxy/route.ts` | CORS proxy for API testing in standalone mode |
| `cors-proxy/route.ts` | General-purpose CORS proxy |
| `fetch-url/route.ts` | URL fetching proxy |
| `postman/route.ts` | Postman collection generation |
| `assistant/route.ts` | AI assistant endpoint |
| `health/route.ts` | Health check |
| `utils.ts` | Shared utilities (path resolution, event emitter, gzip decompression) |

### `src/scripts/`
| File | Purpose |
|------|---------|
| `generator-utils.ts` | **Server-side code generation**. Creates TypeScript definition files from parsed collections |
| `analyze-collection.ts` | Diffs existing definitions against imported collections for smart merging |
| `delete-item.ts` | CLI-compatible endpoint deletion script |
| `delete-collection.ts` | Module deletion script |
| `generate-openapi-collection.ts` | OpenAPI → Reex definition converter |
| `generate-postman-collection.ts` | Reex manifest → Postman Collection exporter |
| `build-docs-context.ts` | Builds documentation context for AI assistant |
| `watch-definitions.ts` | Server-side file watcher (for self-hosted mode) |
| `verify-api-endpoints.ts` | Endpoint verification utility |

### `src/services/`
| File | Purpose |
|------|---------|
| `ProjectService.ts` | Server-side manifest generation (mirror of bridge's project-service.js) |
| `ExecutionService.ts` | API request execution service |
| `api.ts` | API service factory |
| `client/utils.ts` | Client-side utilities (bridge URL, operation relay, gzip compression) |

### `src/hooks/`
| File | Purpose |
|------|---------|
| `useProjectSync.ts` | SSE connection, background task tracking, import state management |
| `useEndpointExecution.ts` | Request building, execution, response handling, cURL generation |
| `useCollectionManagement.ts` | Import/export orchestration, module CRUD |
| `useCollections.ts` | Collection state management (CRUD, persistence) |
| `useStandaloneCollections.ts` | Browser-persisted collection storage |
| `useRecentCollections.ts` | Recent collections history |
| `useSubscription.ts` | Subscription management |
| `useFlutterwaveCustom.ts` | Flutterwave payment integration |

### `src/utils/`
| File | Purpose |
|------|---------|
| `ast.ts` | Centralized AST unwrapping utility (`getInitializerObject`) — TypeScript version |
| `codesandbox/` | CodeSandbox export utility |

### `src/components/` (32 component directories)
| Component | Purpose |
|-----------|---------|
| `Sidebar/` | Module/endpoint explorer tree with search, context menus, copy |
| `WorkspaceView/` | Main workspace with parameter forms, response viewer |
| `TabBar/` | Multi-tab management UI |
| `Navbar/` | Top navigation bar with project info, actions |
| `ImportModal/` | Postman/OpenAPI import wizard |
| `GenerateModuleModal/` | New module creation form |
| `DeleteConfirmModal/` | Deletion confirmation dialog |
| `AuthModal/` | Auth configuration interface |
| `QuerySection/` | Request parameter form (form mode + raw JSON mode) |
| `ResultSection/` | Response viewer with JSON formatting |
| `CurlSection/` | Generated cURL command display |
| `MonacoJsonEditor/` | Monaco editor for JSON editing |
| `BackgroundNotification/` | Floating task progress notifications |
| `Toast/` | Toast notification system |
| `SandboxModal/` / `SandboxWindow/` | CodeSandbox integration |
| `Assistant/` | AI assistant panel |
| `EmptyState/` | Empty state UI (no endpoints, no connection) |
| `WelcomeCard/` / `WelcomeSlideIn/` | Onboarding UI |
| `SidebarSettings/` | Sidebar configuration |
| `LocalhostBanner/` | Connection status indicator |

---

## Key Design Decisions

### Why a Hosted UI instead of a local web app?
- **Zero build step**: No `npm install` or `npm run dev` needed for the UI
- **Instant updates**: UI updates are deployed without requiring users to update their npm package
- **Smaller npm package**: The CLI only contains the generation engine, not a full React app
- **Tradeoff**: Requires the operation relay pattern for filesystem access

### Why `ts-morph` instead of regex or runtime evaluation?
- **Type-safe AST manipulation**: Can read, modify, and write TypeScript files while preserving formatting
- **Full type resolution**: Can traverse type hierarchies, resolve imports, extract parameter types
- **No execution needed**: Analyzes code statically — no need to compile or run the developer's code
- **Surgical edits**: Can add/remove specific properties from an object literal without touching the rest of the file

### Why SSE instead of WebSocket?
- **Simpler**: One-way communication (server → client) is all that's needed
- **No library needed**: Native `EventSource` API in browsers, simple `res.write()` on server
- **Auto-reconnect**: `EventSource` automatically reconnects on connection loss
- **Tradeoff**: No binary data support (not needed for status messages)

### Why the Operation Relay Pattern?
- **The browser cannot access the filesystem**: The hosted UI runs on `reex-api-builder.toolshq.app`, not `localhost`
- **The Next.js API routes have ts-morph**: They can compute precise AST modifications
- **The bridge has filesystem access**: It can write the computed changes safely
- **Result**: A clear separation of concerns — computation in the server, execution in the bridge
