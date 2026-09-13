# Reex API Builder — Technical Deep Dive

## 1. What is Reex?

Reex API Builder is a **developer tool that generates production-ready TypeScript API client code directly into React and Next.js projects**. It takes hand-written API definition files (TypeScript source files) that live inside the developer's own codebase, and from them generates:

- **Type-safe React Query hooks** (queries + mutations) via `@tanstack/react-query`
- **TypeScript type scaffolds** for request/response payloads
- **Query key factories** for cache invalidation
- **Auth-aware wrappers** with pluggable authentication strategies
- **A visual UI** to browse, test, and manage all API endpoints in real-time

The key differentiator: **Reex doesn't own your code**. The definitions live in the developer's repo, are version-controlled, and the generated code is committed alongside the rest of the project. It's a development-time tool, not a runtime dependency.

---

## 2. Three-Tier Architecture

### Tier 1 — The Hosted Cloud UI (`api-next-server`)

A Next.js application deployed at `studio.reex-api.dev`. This is where the developer visually interacts with their API endpoints. It provides:

- A **sidebar** listing all modules and endpoints parsed from the developer's definitions
- A **workspace** with tabbed editor views for testing endpoints (like Postman, but for your own generated code)
- **Import/Export** support for Postman Collections and OpenAPI specs
- An **AI assistant** for endpoint generation
- **Auth configuration** UI (Bearer tokens, custom headers, OAuth flows)

> [!IMPORTANT]
> The Cloud UI has **zero direct filesystem access**. It cannot read or write files on the developer's machine. All filesystem operations are relayed through the Bridge (Tier 2) via HTTP requests.

### Tier 2 — The Local CLI Bridge (`api-npm-bridge` / `reex-cli`)

Published to npm as `reex-cli`. This is the core engine. When a developer runs `reex start` in their project directory, it:

1. **Starts an Express.js HTTP server** on `localhost:4000` (auto-finds available port)
2. **Detects the project framework** (React or Next.js) by reading `package.json`
3. **Scaffolds the `api-services/` directory** with templates (config, core HTTP client, providers, hooks, auth)
4. **Generates the initial manifest, hooks, and types** from existing definitions
5. **Starts a chokidar file watcher** on `definitions/*.ts` and `api.config.ts`
6. **Opens the Cloud UI** in the browser, passing the bridge port as a query parameter: `?localPort=4000`
7. **Serves a Server-Sent Events (SSE) endpoint** at `/api/events` for real-time communication with the UI
8. **Installs missing dependencies** (`axios`, `@tanstack/react-query`, `cookies-next`, `next-auth`) automatically

### Tier 3 — The Developer's Project

A standard React or Next.js project. Reex creates and manages a single directory inside it: `api-services/` (or `src/api-services/` if a `src/` folder exists). This directory contains both user-authored files (definitions, config) and auto-generated files (hooks, types, barrel exports).

---

## 3. The Bridge — Architecture Breakdown

### 3.1 CLI Entry Point (`bin/index.js`)

Uses the `commander` npm package to expose the following commands:

| Command | Description |
|---------|-------------|
| `reex start` | Start the development server + file watcher + UI |
| `reex add module <name>` | Scaffold a new empty API module from template |
| `reex add hook <name>` | Install a utility hook from the Reex repository |
| `reex remove module <name>` | Delete a module and trigger regeneration |
| `reex remove hook <name>` | Uninstall a hook (core hooks are protected) |
| `reex list hooks` | List all available hooks in the Reex repository |
| `reex sync` / `reex update` | Manually trigger regeneration (delegates to running server if detected) |
| `reex reset [target]` | Reset scaffolded files to template defaults |

The CLI uses **smart server detection**: before running commands like `add module`, it checks if a `reex start` server is already running by reading `.reex/metadata.json` (which stores the port) and pinging `/api/health`. If a server is running, it delegates regeneration to the watcher instead of running it inline, preventing race conditions.

### 3.2 Express Server (`server.js`)

```
┌─────────────────────────────────────────────────────┐
│ Express App                                         │
│                                                     │
│  Middleware:                                        │
│   ├── CORS (configurable allowed origins)           │
│   └── express.json({ limit: '50mb' })              │
│                                                     │
│  Routes:                                            │
│   ├── GET  /api/events     → SSE endpoint           │
│   ├── GET  /api/health     → Health check           │
│   ├── POST /api/debug/regenerate → Force regen      │
│   ├── /api/fs/*            → Filesystem routes      │
│   └── /api/project/*       → Project routes         │
│                                                     │
│  Services (initialized on startup):                 │
│   ├── WatcherService.start(targetDir)               │
│   └── GeneratorService.regenerate(targetDir)        │
└─────────────────────────────────────────────────────┘
```

### 3.3 Services

#### `ProjectService` — The Manifest Builder

The **most critical service**. It uses `ts-morph` (a TypeScript compiler wrapper) to statically analyze the developer's definition files and extract a **manifest** — a JSON object describing every API endpoint in the project.

**How it works:**

1. Creates a new `ts-morph` `Project` instance with `skipAddingFilesFromTsConfig: true` (isolated parsing)
2. Iterates over every `.ts` file in `definitions/` (excluding `index.ts`)
3. For each file, gets all exported declarations
4. For each `VariableDeclaration`, calls `getInitializerObject()` to safely extract the `ObjectLiteralExpression` (handling `as`, `satisfies`, angle-bracket assertions, `!`, and parenthesized expressions)
5. For each property of the object literal:
   - Extracts the **method name** (property key)
   - Extracts the **function parameters** with full type information (including nested objects, arrays, optionality)
   - Walks the function body's call expressions to find `CLIENT.get(url)`, `CLIENT.post(url, body)` etc.
   - Extracts the **HTTP method** from the client call (`get`, `post`, `put`, `delete`, `patch`)
   - Extracts the **URL** from template literals, string literals, or no-substitution template literals
   - Extracts the **client name** (which axios instance is being used)
   - Reads `@auth` and `@contentType` from leading JSDoc comments
   - Reads `@description` from JSDoc for endpoint documentation

**Output manifest shape:**
```typescript
{
  users: {
    get_users: {
      args: [{ name: "params", type: "GetUsersParams", isObject: true, properties: [...] }],
      url: "/api/v1/users",
      method: "GET",
      requiresAuth: true,
      contentType: undefined,
      description: "Fetch all users"
    },
    post_createUser: { ... }
  },
  products: { ... }
}
```

#### `GeneratorService` — The Orchestrator

Coordinates the entire regeneration pipeline:

1. **Framework Detection** — Reads `package.json` to determine React vs Next.js. Selects appropriate template set.
2. **Scaffolding** — Copies template files for `api.config.ts`, `core.ts`, `providers/`, `hooks/`, `auth-methods/` if they don't already exist. Uses a **scaffold-once** strategy: files are only created if missing, never overwritten (preserving developer customizations).
3. **Definition Pruning** — Removes unused interfaces and imports from definition files (`pruneUnusedDefinitions`)
4. **Manifest Generation** — Delegates to `ProjectService.generateManifest()`
5. **Hook Generation** — Delegates to `HookService.generateHooks()`
6. **Type Generation** — Delegates to `TypeService.generateTypes()`
7. **Barrel File Generation** — Creates `definitions/index.ts` that re-exports all modules:
   ```typescript
   import { type ReexDefinition } from "../.reex/config";
   import { usersApi } from "./users";
   import { productsApi } from "./products";
   
   export const api = {
     ...usersApi,
     ...productsApi,
   } satisfies ReexDefinition;
   ```
8. **Dependency Installation** — Checks `package.json` for missing packages and runs `npm install` automatically
9. **Prettier Formatting** — Runs the developer's local Prettier (if configured) on all generated files to match their project's code style
10. **Directory Sanitization** — Scans `api-services/` root and quarantines any unauthorized files to `_recovered/`, protecting the generated directory structure
11. **SSE Broadcast** — Notifies the UI that generation is complete

#### `HookService` — React Query Hook Generator

For each module in the manifest, generates a `use{Module}Queries.ts` file containing:

- **Key Factory**: A `{module}Keys` object with typed query key factories for cache management:
  ```typescript
  export const usersKeys = {
    all: ["users"] as const,
    get_users: (params: ApiVars<typeof usersApi.get_users>) => [...usersKeys.all, "get_users", params] as const,
  };
  ```

- **Query Hooks** (for `get_` prefixed methods): Wraps `useApiQuery` with proper typing:
  ```typescript
  export const useGetUsersQuery = <TData = ApiData<typeof usersApi.get_users>>(
    params: ApiVars<typeof usersApi.get_users>,
    options?: Omit<UseQueryOptions<...>, "queryKey" | "queryFn">
  ) => useApiQuery(usersKeys.get_users(params), () => usersApi.get_users(params), options);
  ```

- **Mutation Hooks** (for all other methods): Wraps `useApiMutation` with automatic query invalidation:
  ```typescript
  export const usePostCreateUserMutation = (options?: ...) => {
    const queryClient = useQueryClient();
    return useApiMutation(usersApi.post_createUser, {
      ...options,
      onSuccess: (data, variables, context) => {
        if (options?.invalidate !== false) {
          queryClient.invalidateQueries({ queryKey: usersKeys.all });
        }
        (options?.onSuccess as any)?.(data, variables, context);
      },
    });
  };
  ```

- **Collision Detection**: If two modules export methods with the same name (e.g., `get_all` in both `users` and `products`), the hooks are automatically aliased: `useGetAllQuery → useUsersGetAllQuery`.

- **Cleanup**: After generation, any `.ts` files in `generated/` that don't correspond to current modules are deleted.

#### `TypeService` — Type Scaffold Generator

Creates `types/{module}/{method}.ts` for each endpoint:

- Default: `export type get_users = unknown;`
- If the file already exists and contains user modifications, it's **preserved** (never overwritten)
- Supports a `/* sync-type-disable */` flag to permanently opt out of regeneration
- Cleans up orphaned type files when endpoints are deleted
- Cleans up empty directories

#### `WatcherService` — File Change Detection

Uses `chokidar` to monitor:
- `api-services/definitions/*.ts` — Source definition files
- `api-services/api.config.ts` — Configuration file

**Debouncing Strategy:**
- **Definition changes**: Batched with a 1000ms debounce window. Multiple rapid saves are coalesced into a single regeneration. Only the changed modules are passed to the generator for **selective regeneration** (hooks and types are only regenerated for modified modules, though the barrel file and formatting pass always run).
- **Config changes**: Debounced at 500ms. Only triggers an SSE broadcast to refresh the UI config display — no code regeneration.

**Ignored files**: `generated/` directory and `index.ts` (to prevent watcher loops from the generator's own output).

#### `SseService` — Real-Time Event Broadcasting

A simple in-memory SSE implementation:
- Maintains an array of connected `Response` objects
- On client connect: sets `Content-Type: text/event-stream`, flushes headers
- On disconnect: removes client from array
- `broadcast(id, type, message)`: writes `data: { id, type, message }\n\n` to all clients

**Event types emitted:**

| Event Type | Trigger | UI Behavior |
|------------|---------|-------------|
| `project:sync-start` | File change detected | Shows "Syncing..." spinner |
| `project:updated` | Regeneration complete | Refreshes manifest, config, sidebar |
| `start` | Import/delete task begins | Shows background task notification |
| `progress` | Task progress update | Updates notification message |
| `complete` | Task finished | Dismisses notification, shows toast |
| `error` | Task failed | Shows error toast |

### 3.4 Routes

#### Filesystem Routes (`/api/fs/*`)

These are the **only way the hosted UI can touch the developer's filesystem**:

| Route | Method | Purpose | Security |
|-------|--------|---------|----------|
| `/api/fs/write` | POST | Write file content | Path traversal check |
| `/api/fs/read` | POST | Read file content | Path traversal check |
| `/api/fs/delete` | POST | Delete file or directory | Path traversal check |
| `/api/fs/list` | POST | List directory contents | Path traversal check |

Every route validates that the resolved path starts with `path.resolve(apiTargetDir)` to prevent path traversal attacks.

#### Project Routes (`/api/project/*`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/project/manifest` | GET | Generate and return the full API manifest |
| `/api/project/config` | GET | Read project config (baseURL, clients, env vars) |
| `/api/project/modules` | GET | List available modules with metadata |
| `/api/project/definitions` | GET | Return raw TypeScript source for all definition files |
| `/api/project/config/update` | POST | Update baseURL, collection name in config/metadata |

### 3.5 Templates

The bridge ships with three template directories:

| Directory | Purpose |
|-----------|---------|
| `templates-shared/` | Framework-agnostic templates (core.ts, api.config.ts, hooks, providers, auth-methods, module template) |
| `templates-next/` | Next.js-specific overrides (auth-methods with `cookies-next`) |
| `templates-react/` | React-specific overrides (auth-methods with `localStorage`) |

Template resolution: framework-specific template > shared template > skip.

---

## 4. The AST Parsing Challenge

### The Problem

TypeScript definitions use various syntax wrappers around object literals:

```typescript
// Plain object (simplest case)
export const usersApi = { get_users: async () => ... };

// With `satisfies` (most common in Reex)
export const usersApi = { get_users: async () => ... } satisfies ReexDefinition;

// With `as` assertion
export const usersApi = { get_users: async () => ... } as const;

// With angle-bracket assertion
export const usersApi = <ReexDefinition>{ get_users: async () => ... };

// Nested combinations
export const usersApi = ({ get_users: async () => ... } satisfies ReexDefinition) as const;
```

The naive approach — `variableDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)` — only works for the plain case. All other cases return `undefined`, silently breaking manifest generation.

### The Solution — `getInitializerObject()`

A single centralized function in `utils/ast.ts` (TypeScript) and `utils/ast.js` (CommonJS):

```typescript
export const getInitializerObject = (variableDecl: VariableDeclaration): ObjectLiteralExpression | undefined => {
    let initializer: any = variableDecl.getInitializer();
    if (!initializer) return undefined;

    while (
        initializer && (
            initializer.getKind() === SyntaxKind.AsExpression ||
            initializer.getKind() === SyntaxKind.SatisfiesExpression ||
            initializer.getKind() === SyntaxKind.TypeAssertionExpression ||
            initializer.getKind() === SyntaxKind.NonNullExpression ||
            initializer.getKind() === SyntaxKind.ParenthesizedExpression
        )
    ) {
        initializer = initializer.getExpression();
    }

    if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
        return initializer as ObjectLiteralExpression;
    }
    return undefined;
};
```

This is used in **6 different processors** across both repositories, all pointing to this single source of truth:

1. `api-next-server/src/app/api/delete-item/route.ts` — Endpoint deletion
2. `api-next-server/src/scripts/generator-utils.ts` — Server-side code generation
3. `api-next-server/src/scripts/analyze-collection.ts` — Import analysis
4. `api-next-server/src/scripts/delete-item.ts` — CLI deletion script
5. `api-next-server/src/services/ProjectService.ts` — Server-side manifest generation
6. `api-npm-bridge/services/project-service.js` — Bridge manifest generation

---

## 5. The Cloud UI — Architecture Breakdown

### 5.1 State Management

The UI uses React Context (`ProjectContext`) as the single source of truth for:
- `manifest` — The full API manifest from the bridge
- `config` — Project configuration (baseURL, clients, auth)
- `collections` — Standalone mode collections (Postman/OpenAPI imports)
- `isStandaloneMode` — Whether the UI is connected to a bridge or operating independently

### 5.2 Key Hooks

| Hook | Purpose |
|------|---------|
| `useProjectSync` | Manages SSE connection, background task tracking, import state |
| `useEndpointExecution` | Handles API request execution, parameter building, response handling, cURL generation |
| `useCollectionManagement` | Import/export of Postman & OpenAPI collections, module-level CRUD |
| `useCollections` | Collection state management for standalone mode |
| `useStandaloneCollections` | Browser-persisted collections via IndexedDB/localStorage |

### 5.3 The Operation Relay Pattern

Since the hosted UI runs in a browser (which cannot access the local filesystem), Reex uses a **relay pattern** for all write operations:

1. **User triggers action** (e.g., delete endpoint, import collection)
2. **UI calls a Next.js API route** (e.g., `POST /api/delete-item`)
3. **Next.js route uses `ts-morph`** to parse the definition file *in memory* (using the source code sent by the bridge or read from its own filesystem if self-hosted)
4. **Route computes file operations**: An array of `{ type: 'write' | 'delete', filePath, content? }` describing what should happen on disk
5. **Route returns operations to the browser** as JSON
6. **Browser relays each operation** to the bridge's filesystem routes (`/api/fs/write`, `/api/fs/delete`)
7. **Bridge writes/deletes files** on the local filesystem
8. **Chokidar detects the file changes** and triggers regeneration
9. **SSE broadcasts `project:updated`** to the UI
10. **UI refreshes** the manifest and re-renders

This pattern ensures the UI never needs direct filesystem access while still being able to make surgical code modifications.

### 5.4 Tab Synchronization

The UI supports a multi-tab workspace (similar to VS Code or Postman). When the manifest changes (due to file edits, imports, or deletions), the tab sync logic:

1. Iterates through ALL open tabs
2. For each tab, checks if its endpoint still exists in the new manifest
3. If the endpoint exists but its definition changed (args, URL, method, auth, etc.), updates the tab's endpoint data
4. If the endpoint was deleted, removes the tab
5. Adjusts the active tab index — if the active tab was deleted, selects the nearest surviving tab

### 5.5 Standalone Mode

When no bridge is detected (e.g., user visits `studio.reex-api.dev` directly without running `reex start`), the UI enters **Standalone Mode**:

- Collections can be imported from Postman JSON or OpenAPI YAML/JSON files
- Data is persisted in the browser (localStorage/IndexedDB)
- API testing works through a server-side proxy (`/api/execute-proxy`) to avoid CORS
- No code generation happens — it's a pure API testing tool in this mode

---

## 6. Security Measures

### Path Traversal Protection
Every filesystem route in the bridge validates resolved paths:
```javascript
const safePath = path.resolve(apiTargetDir, filePath);
if (!safePath.startsWith(path.resolve(apiTargetDir))) {
    return res.status(403).json({ error: "Access Denied: Path traversal detected." });
}
```

### Directory Sanitization
After every regeneration, the generator scans the `api-services/` root and quarantines any unauthorized files/folders to `_recovered/`. Only known entities are allowed:
`definitions`, `generated`, `types`, `providers`, `hooks`, `auth-methods`, `custom`, `_recovered`, `core.ts`, `api.config.ts`, `index.ts`, `.reex`

### CORS Configuration
The bridge restricts cross-origin requests to a whitelist:
```
https://studio.reex-api.dev
http://localhost:5173
http://localhost:3000
http://localhost:4000
```

### Port Safety
On startup, the CLI writes the active port to `.reex/metadata.json`. On shutdown (or stale detection), it's cleaned up. The `checkIfServerRunning()` helper verifies both that the port is open AND that the server's `targetDir` matches the requested directory — preventing cross-project interference.

---

## 7. Framework Detection & Template Resolution

```javascript
detectFramework(apiTargetDir) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(apiTargetDir, 'package.json'), 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (allDeps['next']) return 'nextjs';
    if (allDeps['react'] || allDeps['react-dom']) return 'react';
    throw new Error("Unsupported project.");
}
```

Template resolution follows a **priority chain**: framework-specific template → shared template → skip. This allows Next.js-specific auth implementations (using `cookies-next`) to override the shared default (using `localStorage`), while common files like `core.ts` and `api.config.ts` are shared across frameworks.
