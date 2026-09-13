# Contributing

Install dependencies with `npm ci`, then run `npm run dev`.

Keep collection persistence in `src/services/collectionStorage.ts` and `src/lib/clientStorage.ts`. Collection hooks provide React Query state without requiring an account. Keep API-request authentication separate from application access.

Preserve the browser storage keys and record formats, or provide an explicit local schema upgrade when changing them. Collection writes must not evict other collections or report success before committing.

Keep shared processing and bridge operations in their existing service and route layers. Generated authentication templates belong to the API client and remain supported.

Before proposing a change, run type checking, linting, relevant Vitest tests, and a production build. Run browser tests for changes to workspace flows. Include the behavior changed and validation performed in the pull request.

Use synthetic API examples. Do not commit credentials, environment files, private collections, or runtime data. Contributions are licensed under the repository's MIT License.
