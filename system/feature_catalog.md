# Reex API Builder — Feature Catalog

## Code Generation Engine

### 1. API Manifest Generation
**What**: Statically analyzes TypeScript definition files and produces a structured JSON manifest describing every API endpoint.

**How**: Uses `ts-morph` to parse the AST of each definition file. Extracts function names, parameter types (with full nested object decomposition), HTTP methods, URLs, client references, auth requirements, content types, and descriptions — all without executing the code.

**Where**: `api-npm-bridge/services/project-service.js` (bridge), `api-next-server/src/services/ProjectService.ts` (server)

---

### 2. React Query Hook Generation
**What**: Generates fully-typed `useQuery` and `useMutation` hooks for every API endpoint, ready to use in React components.

**How**: For each module, creates a `use{Module}Queries.ts` file. Query hooks (for `get_` methods) use `useApiQuery` with typed query keys. Mutation hooks (for all other methods) use `useApiMutation` with automatic cache invalidation via `queryClient.invalidateQueries()`. Includes collision detection — if two modules export the same method name, hooks are auto-aliased.

**Where**: `api-npm-bridge/services/hook-service.js`

---

### 3. Query Key Factory Generation
**What**: Generates type-safe query key factories for each module, enabling granular cache control.

**How**: Creates a `{module}Keys` object with methods for each query endpoint. Keys are structured as `["module", "method", params]` tuples using `as const` for full type inference.

**Where**: `api-npm-bridge/services/hook-service.js` → `generateKeyFactory()`

---

### 4. Type Scaffold Generation
**What**: Creates TypeScript type files for each endpoint, defaulting to `unknown` but preserving user customizations.

**How**: For each non-`delete_` method, creates `types/{module}/{method}.ts`. If the file already exists and has been modified by the user, it's never overwritten. Supports a `/* sync-type-disable */` comment flag to permanently opt out of regeneration. Automatically cleans up orphaned type files and empty directories when endpoints are deleted.

**Where**: `api-npm-bridge/services/type-service.js`

---

### 5. Barrel File Generation
**What**: Auto-generates `definitions/index.ts` that re-exports all API modules as a single unified `api` object.

**How**: Reads the manifest keys, generates import statements and spread syntax to merge all modules into one `api` constant with `satisfies ReexDefinition` for type safety.

**Where**: `api-npm-bridge/services/generator-service.js` → `regenerate()`

---

### 6. Definition Pruning
**What**: Removes unused interfaces and imports from definition files to keep them clean.

**How**: Before manifest generation, scans each definition file for interfaces and imports that are no longer referenced by any function in the file.

**Where**: `api-npm-bridge/services/project-service.js` → `pruneUnusedDefinitions()`

---

### 7. Centralized AST Unwrapping
**What**: Safely extracts object literals from TypeScript variable declarations regardless of type wrapper syntax (`as`, `satisfies`, `<Type>`, `!`, `()`).

**How**: A `while` loop iteratively calls `.getExpression()` on wrapper nodes until it reaches the underlying `ObjectLiteralExpression` or returns `undefined`. Handles 5 different wrapper types in a single pass.

**Where**: `api-next-server/src/utils/ast.ts`, `api-npm-bridge/utils/ast.js` — used by 6 processors across both codebases.

---

## CLI (`reex-cli`)

### 8. `reex start`
**What**: Launches the full development environment — Express server, file watcher, initial generation, and browser UI.

**How**: Finds an available port starting from 4000, sets environment variables, starts the server, writes port to `.reex/metadata.json`, opens the Cloud UI with `?localPort=N`.

---

### 9. `reex add module <name>`
**What**: Scaffolds a new empty API module from a template.

**How**: Reads `templates-shared/module.template.ts`, replaces `__ModuleName__` and `__TypeName__` placeholders, writes to `definitions/{name}.ts`. If a `reex start` server is running, delegates regeneration to the watcher; otherwise runs inline.

---

### 10. `reex add hook <name>`
**What**: Installs a utility hook from the Reex hook repository into the project.

**How**: Copies the hook file from `templates-shared/hooks/` to the project's `api-services/hooks/` directory. Core hooks (`useAuthState`, `useClearSession`, `useNotification`) cannot be removed.

---

### 11. `reex remove module <name>` / `reex remove hook <name>`
**What**: Deletes a module or hook and triggers cleanup.

**How**: Deletes the file, then triggers regeneration which cleans up generated hooks, types, and barrel file entries.

---

### 12. `reex sync`
**What**: Manually triggers regeneration without file changes.

**How**: If a `reex start` server is running, sends a `POST /api/debug/regenerate` request. Otherwise, runs `GeneratorService.regenerate()` directly.

---

### 13. `reex reset [target]`
**What**: Resets scaffolded files to their template defaults (with confirmation prompt).

**How**: Supports resetting specific files/folders or everything. Uses fuzzy matching — `reex reset useAuthState` finds `hooks/useAuthState.ts`. Handles ambiguous targets with helpful error messages.

---

## Visual UI

### 14. Module & Endpoint Sidebar
**What**: Tree view of all API modules and their endpoints, with real-time updates.

**How**: Reads the manifest from the bridge, groups endpoints by module, displays method badges (GET/POST/PUT/DELETE), supports search, copy endpoint names, and context menus.

---

### 15. Multi-Tab Workspace
**What**: Open and test multiple endpoints simultaneously in tabbed views (like VS Code).

**How**: Tabs store endpoint info, parameter values, and execution state independently. Tab sync logic detects manifest changes and updates/removes tabs accordingly.

---

### 16. API Endpoint Testing
**What**: Execute API requests with form-based or raw JSON input, view formatted responses, generate cURL commands.

**How**: The `useEndpointExecution` hook builds the request from endpoint metadata (URL, method, args, auth). For non-localhost URLs, requests go through a server-side proxy (`/api/execute-proxy`) to avoid CORS. Supports unwrapping Axios `data` wrappers, dynamic URL parameter interpolation, and file upload (`FormData`/`multipart`).

---

### 17. Auth Configuration Modal
**What**: Configure authentication for API testing (Bearer tokens, custom headers, OAuth).

**How**: The `AuthModal` component stores auth config in project context. Auth tokens are attached to requests based on endpoint `@auth` flags. Multiple auth strategies are supported via pluggable `auth-methods/`.

---

### 18. cURL Generator
**What**: Generates copy-pasteable cURL commands for any endpoint.

**How**: Builds the full cURL string from the computed URL (with interpolated parameters), method, headers, auth token, and JSON body.

---

## Import/Export

### 19. Postman Collection Import
**What**: Import a Postman Collection (v2.1 JSON) and generate TypeScript API definitions from it.

**How**: Parses the Postman JSON, walks the folder structure, extracts endpoints with URLs, methods, headers, and body templates. Generates TypeScript definition files using `generator-utils.ts` with proper function naming conventions (`get_`, `post_`, `put_`, `delete_`). Supports file compression for large collections (gzip via `CompressionStream`).

**Where**: `api-next-server/src/app/api/analyze-collection/route.ts`, `api-next-server/src/scripts/analyze-collection.ts`

---

### 20. OpenAPI/Swagger Import
**What**: Import OpenAPI 3.0/3.1 or Swagger 2.0 specs (JSON/YAML) and generate definitions.

**How**: Converts the spec into Reex-compatible endpoint structures, handling path parameters, query parameters, request bodies, and response schemas.

**Where**: `api-next-server/src/scripts/generate-openapi-collection.ts`

---

### 21. Postman Collection Export
**What**: Export the current project as a Postman Collection for sharing.

**How**: Reads the manifest and generates a Postman Collection v2.1 JSON with proper folder structure, request configurations, and environment variable references.

**Where**: `api-next-server/src/scripts/generate-postman-collection.ts`

---

### 22. Standalone Collection Mode
**What**: Use the UI as a standalone API testing tool without a local project (like a lightweight Postman).

**How**: When no bridge is detected, the UI switches to standalone mode. Collections are stored in the browser's localStorage/IndexedDB. API requests are proxied through the server's `/api/execute-proxy` route.

---

## Real-Time Features

### 23. File Watching with Smart Debouncing
**What**: Automatically detects file changes and regenerates only what's needed.

**How**: Uses `chokidar` with a 1000ms debounce for definitions and 500ms for config. Tracks changed file names to pass `changedModules` to the generator for **selective regeneration** — only re-generating hooks and types for the modules that actually changed.

---

### 24. Server-Sent Events (SSE)
**What**: Real-time one-way communication from the bridge to the UI.

**How**: The UI opens an `EventSource` to `localhost:{port}/api/events`. The bridge broadcasts lifecycle events (sync-start, updated, progress, complete, error). On connection loss, the UI attempts a health check — if the bridge is truly unreachable, it reloads into standalone mode.

---

### 25. Background Task Tracking
**What**: Visual notifications for long-running operations (imports, deletions, generation).

**How**: The `useProjectSync` hook maintains a list of active background tasks. Tasks are registered with unique IDs, updated via SSE progress events, and dismissed on completion. Import tasks require explicit user dismissal; deletion tasks auto-clear.

---

### 26. Smart Tab Synchronization
**What**: Automatically updates or closes tabs when the API manifest changes.

**How**: A `useEffect` compares all open tabs against the new manifest. Tabs with updated definitions are refreshed in-place. Tabs pointing to deleted endpoints are removed. The active tab index is intelligently adjusted to the nearest surviving tab.

---

## Developer Experience

### 27. Framework Auto-Detection
**What**: Automatically detects whether the project uses React or Next.js and applies appropriate templates.

**How**: Reads `package.json` dependencies. If `next` is present → Next.js. If `react` or `react-dom` → React. Different template sets provide framework-specific auth implementations.

---

### 28. Prettier Integration
**What**: Formats all generated code using the project's own Prettier configuration.

**How**: Searches for the developer's local Prettier binary (v3 or v2 paths). If found, runs it on all generated files. If no Prettier is configured in the project, skips formatting to preserve existing code style. Supports selective formatting for changed modules only.

---

### 29. Scaffold-Once Strategy
**What**: Template files are only created if they don't already exist — developer customizations are never overwritten.

**How**: Every scaffolding step checks `fs.existsSync()` before copying. The developer can freely modify `api.config.ts`, `core.ts`, provider files, and hook files without fear of losing changes on regeneration.

---

### 30. Dependency Auto-Installation
**What**: Automatically installs required npm packages the first time Reex runs.

**How**: Checks `package.json` for missing dependencies (`axios`, `@tanstack/react-query`, and framework-specific packages). If any are missing, runs `npm install` automatically.

---

## Security

### 31. Path Traversal Protection
**What**: Prevents filesystem routes from accessing files outside the project directory.

**How**: Every filesystem route resolves the requested path and validates it starts with the project root. Requests with `../` or absolute paths outside the project are rejected with HTTP 403.

---

### 32. Directory Sanitization
**What**: Quarantines unauthorized files placed in the `api-services/` directory.

**How**: After every regeneration, scans the `api-services/` root for entries not in the allowlist. Foreign files are moved to `_recovered/` with a console warning. This protects the generated directory structure from accidental file placement.

---

### 33. CORS Restriction
**What**: Limits which origins can talk to the local bridge server.

**How**: The bridge's CORS middleware checks the `Origin` header against a whitelist (the hosted UI domain + common localhost ports). Requests from unknown origins are blocked.

---

## Extensibility

### 34. Custom Code Directory
**What**: A safe zone (`api-services/custom/`) where developers can place their own utilities, types, and helper functions without them being deleted by the generator.

**How**: The `custom/` directory is created once by the scaffold and is explicitly excluded from the sanitization allowlist — meaning it's never cleaned up or overwritten.

---

### 35. Type Override System
**What**: Developers can replace auto-generated `unknown` types with real TypeScript types that survive regeneration.

**How**: If a type file has been modified from the default `export type x = unknown;`, the TypeService skips it. The `/* sync-type-disable */` comment flag provides permanent opt-out.

---

### 36. Hook Repository
**What**: A library of installable utility hooks (`useAuthState`, `useClearSession`, `useNotification`, and more).

**How**: Hooks are stored in `templates-shared/hooks/`. `reex list hooks` shows all available hooks. `reex add hook <name>` copies them into the project. Core hooks are protected from removal.

---

### 37. CodeSandbox Export
**What**: Export the current endpoint configuration to a CodeSandbox for sharing or debugging.

**Where**: `api-next-server/src/utils/codesandbox/index.ts`

---

### 38. AI Assistant Integration
**What**: An AI assistant that can help generate endpoint definitions from natural language descriptions.

**Where**: `api-next-server/src/components/Assistant/`, `api-next-server/src/app/api/assistant/`
