# Reex API Builder

An open-source workspace for importing API collections, generating TypeScript clients, and testing requests. Licensed under the [MIT License](LICENSE).

Open the app and start working. No Reex account, database, subscription, or payment configuration is required. Collections, saved requests, and recent history use IndexedDB in your browser, with no application-imposed collection, request, history, or project-import quotas.

[Website](https://reex-api.dev) ? [Open Studio](https://studio.reex-api.dev) ? [Documentation](https://docs.reex-api.dev)

## Run locally

Use Node.js 22 LTS or later and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

For a production build:

```sh
npm run build
npm start
```

The app still uses its Next.js server for collection analysis, code generation, URL/Postman imports, request proxies, and the optional AI assistant. Deploy with a Node.js runtime; this is not a static export. Imported collection content and executed requests can be sent to those processing routes.

## Optional configuration

Copy [.env.example](.env.example) to `.env.local` only if you need optional integrations:

- `GOOGLE_GENERATIVE_AI_API_KEY`: enables the AI documentation assistant. Keep this key on the server.
- `NEXT_PUBLIC_REPOSITORY_URL`: changes the repository linked from community support when hosting a fork.
- `API_TARGET_DIR` and `BRIDGE_URL`: advanced server/bridge configuration.

No environment file is needed for the core workspace.

## Browser storage

Standalone collections, sandbox collections and requests, and recent import history are saved in this browser profile for this site. Existing browser collections retain their storage keys and formats. Data is not synchronized to a cloud account or between browsers.

Clearing site data removes saved collections and settings. API credentials you choose to save are stored locally with their collection or request. Share collection exports only after removing private data and credentials.

Writes commit before the app reports success. A failed history save never deletes collections. Optional response and assistant caches have bounded retention, and the assistant has a server rate limit; these controls are independent of collection and import quotas.

## Connected project mode

The existing npm bridge supports reading and updating API definitions in a local project, file synchronization, and project events. The standalone workspace works without a bridge. Keep using the bridge's documented `reex start` workflow and `localPort` connection parameter for connected mode.

API-request authentication remains available: Bearer tokens, custom headers, and generated authentication integrations are features of the API client. Request proxies and their existing localhost behavior are retained.

## Checks

```sh
npm run typecheck
npm run lint
npm run test:run
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests run against the production build on port 3100. Set `PLAYWRIGHT_CHANNEL=chrome` or `msedge` to use an installed browser instead of Playwright's Chromium. To test an already running server, set `PLAYWRIGHT_BASE_URL` to its URL.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report bugs and feature requests through the repository's GitHub issues.
