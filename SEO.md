# Reex Studio SEO

Studio is the browser application for Reex API, the React framework for API integration. Its production origin is `https://studio.reex-api.dev`; the primary marketing destination is `https://www.reex-api.dev/`.

## Shared identity

The versioned `seo/brand.json` contract is copied across all four repositories. `src/config/seo.ts` and `src/config/links.ts` consume it. Keep the four copies synchronized and run `npm run check:seo:workspace` from this repository. An optional argument supplies a different parent workspace directory.

The workspace check compares the contracts, npm discovery metadata, actual site configuration, product relationships, and six deployment-indexing scenarios. It evaluates only the local SEO modules; no other application code or environment secrets are loaded.

Search-facing names are Reex API, Reex API Studio, and Reex API Docs. The shared product identifier is `https://www.reex-api.dev/#software`. Each website keeps its own canonical URLs and WebSite node. Studio's WebApplication is part of the common product. Existing visible copy, styles, interactions, and artwork are unchanged.

## Indexing policy

| Route | Production indexing | Canonical | Sitemap |
| --- | --- | --- | --- |
| `/` | Index | Studio root | Yes |
| `/support` | Index | Studio support URL | Yes |
| `/settings`, `/sandbox` | Noindex, follow | None | No |
| `/api/...` | Crawling disallowed | None | No |
| `/docs`, `/docs/...` | Permanent redirect to docs | Destination handles it | No |
| Missing page | HTTP 404 with noindex | None | No |

Canonicals exclude workspace and tracking parameters. Noindex pages stay crawlable so crawlers can read their directives. Sitemap dates are omitted rather than fabricated.

Set `NEXT_PUBLIC_SITE_URL`, `SEO_NOINDEX`, and optional `GOOGLE_SITE_VERIFICATION` **before building**. Development, Vercel preview/development, or `SEO_NOINDEX=true` builds disable indexing and produce an empty sitemap. Production defaults to the production Studio origin. These are search directives, not access controls.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`, `npm run test:e2e`, and `npm run check:seo:workspace`. Browser SEO tests expect a production build and can use installed Chrome through `PLAYWRIGHT_CHANNEL=chrome`.

Local validation during this change: production build, typecheck, 69 unit tests, and the workspace identity/policy check passed. Lint reports 10 existing unused-variable warnings. The browser suite's workspace, support, noindex, canonical/asset/redirect, and mobile checks passed.

**Initial HTML rendering:** `WorkspaceClient.tsx` renders the welcome screen (`WelcomeCard`) during initialization and initial server HTML inside `<main>`. Non-JavaScript crawlers and users receive indexable welcome content, documentation links, and the support link before hydration. The test “homepage content is available before JavaScript runs” verifies this behavior.

## Rollout

1. Deploy the marketing canonical/redirect changes, then Studio and documentation. Build production without `SEO_NOINDEX=true` or a preview environment marker.
2. Verify public response metadata and any hosting `X-Robots-Tag` header. Studio and docs must keep their own canonicals; they must not canonicalize to marketing.
3. Use the verified Search Console Domain property for `reex-api.dev`. It covers all three subdomains. Submit each site's sitemap and inspect the homepages, Studio support, and representative docs pages.
4. Publish CLI metadata through the normal package release. Local package edits do not update npm.
5. Compare Search Console brand-query impressions/clicks over rolling 28-day periods and record whether manual `reex api` / `reex-api` searches still substitute “rex”. Recheck at roughly 2, 4, and 8 weeks; these are observation intervals, not ranking promises.

The implementation plan is in [SEO-IMPLEMENTATION-PLAN.md](SEO-IMPLEMENTATION-PLAN.md). Deployment, npm publication, and Search Console changes have not been performed as part of the local implementation.

