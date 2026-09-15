**Reex SEO implementation plan across the four workspace projects**

Prepared September 14, 2026. Status: core SEO changes implemented locally on September 15, 2026. See SEO.md for validation and the existing Studio rendering limitation. Deployment, npm publication, and Search Console work remain rollout steps.

The objective is to make Reex consistently identifiable for searches such as `reex api` and `reex-api`, and position it as **the React framework for API integration**. The marketing homepage will be the primary brand destination, with Studio, documentation, and the CLI presented as related parts of Reex.

The screenshots show Google substituting a different brand. Inconsistent naming and conflicting canonical signals are confirmed problems worth fixing, but this audit cannot establish exactly why Google made that substitution. Search Console data was not available. Site-name structured data expresses a preference; it does not control spelling correction, rankings, or AI Overview inclusion. Google's site-name system also considers titles and visible homepage content. [Google site-name guidance](https://developers.google.com/search/docs/appearance/site-names)

**Scope and constraints.** Implementation changes search-facing metadata, canonical URLs, JSON-LD, robots directives, sitemaps, npm package metadata, and related validation/runbooks. Visible headings, body copy, navigation labels, styling, components, interactions, screenshots, logos, and image artwork stay unchanged. Updating an existing link to the canonical spelling of the same destination is allowed; adding navigation or changing its purpose is not part of the plan. Browser titles and social-card text are SEO metadata and will change.

The CLI package name remains `reex-cli`, and its command remains `reex`. Under the strict no-visible-copy-change interpretation, the existing npm README also remains unchanged; its opening branding can be reconsidered separately if visible content work is requested. The npm description and discovery fields can still adopt the positioning in this implementation. No application feature work, dependency upgrades, package renaming, new marketing pages, or image redesign is required.

**Verified starting point.** The repositories and public HTTP responses were inspected on September 14, 2026. These are observations of source and deployed responses, not evidence of Google's indexed state.

| Project | Confirmed finding | Implication |
| --- | --- | --- |
| `reex-landing` | `src/lib/site.ts` uses `https://reex-api.dev`, but that host returns a 308 redirect to `https://www.reex-api.dev/`. | Metadata, sitemap entries, and links should use the final `www` origin. |
| `reex-landing` | The live homepage emits `https://reex-api.dev/index` as its canonical. `/index` also serves the homepage with HTTP 200 on the `www` host. | There is both an origin mismatch and a duplicate homepage path. The root layout currently uses `canonical: "./"`; the deployed `/index` alias needs explicit verification at the hosting layer. |
| `reex-landing` | `/react-query-generator`, `/openapi-react-query`, `/postman-to-react-query`, and `/guides/getting-started` return 200, but their main content is only “Launch Studio” and “Visit Main Page.” All four are in the sitemap. | These routes should be excluded from indexing until they contain useful content. That can be done without altering their appearance. |
| `reex-landing` | Those four routes inherit the homepage Open Graph title and URL. The getting-started route declares a `TechArticle` although it contains no article. | Page metadata must be resolved independently; unsupported article markup should be removed. |
| `reex-landing` | Sitemap dates use `new Date()`. | Remove synthetic modification dates or replace them with actual content-change dates. |
| `api-next-server` | Metadata uses “Reex API Builder” and “API Client & Code Generator.” The production sitemap correctly lists `/` and `/support`; `/settings` and `/sandbox` already emit `noindex, follow`. | Update positioning while preserving the established indexing policy and server-rendered content. |
| `reex-docs` | The site uses “Reex API Builder Documentation.” Its 15-page sitemap, page canonicals, structured data, and SEO check script already exist. | Extend the existing implementation; preserve its page-specific metadata, routing, and checks. |
| `api-npm-bridge` | Local and published version 7.3.2 describe an API Builder CLI and use the non-`www` homepage. | Update the package discovery metadata and release it through the normal npm process. |

The npm website returned an automated-access challenge during inspection. Published package metadata was instead verified through the [official npm registry endpoint](https://registry.npmjs.org/reex-cli/latest). This challenge is not evidence that Google cannot index the package page. Public observations can be rechecked at the [marketing homepage](https://www.reex-api.dev/), [marketing sitemap](https://www.reex-api.dev/sitemap.xml), [Studio sitemap](https://studio.reex-api.dev/sitemap.xml), and [documentation sitemap](https://docs.reex-api.dev/sitemap.xml).

**1. Establish one SEO identity and explicit site roles.**

Use the following contract in the existing SEO configuration modules. Keep a small, versioned `seo/brand.json` copy in each repository for the shared names, positioning, production origins, and entity IDs; site-specific metadata remains in each site's existing configuration. A workspace validation script will compare the four copies and check their use. This avoids introducing a shared runtime package across Next.js 14, 16.1, and 16.3 projects.

| Field | Proposed value |
| --- | --- |
| Product brand | `Reex` |
| Search-facing brand | `Reex API` |
| Positioning | `The React framework for API integration` |
| Marketing site name | `Reex API` |
| Studio site name | `Reex API Studio` |
| Documentation site name | `Reex API Docs` |
| Package identity | `reex-cli`, the CLI for Reex API |
| Marketing origin | `https://www.reex-api.dev` |
| Studio origin | `https://studio.reex-api.dev` |
| Documentation origin | `https://docs.reex-api.dev` |
| Package URL | `https://www.npmjs.com/package/reex-cli` |

Use “Reex” as a genuine alternate brand name. Existing names such as “Reex API Builder” can remain legacy aliases on the corresponding entity. Do not list “Rex” as an alternate name, repeat spelling variants as keywords, or add hidden body text.

Use the exact positioning on the marketing homepage, site-level descriptions, and npm description. Give individual pages topic-specific titles and descriptions with a consistent brand suffix. This preserves the distinction between finding the framework, using Studio, and reading a guide.

| Surface | Proposed title or title pattern |
| --- | --- |
| Marketing homepage | `Reex API \| The React Framework for API Integration` |
| Studio homepage | `Reex API Studio \| React API Integration` |
| Studio support | `Help & API Troubleshooting \| Reex API Studio` |
| Documentation homepage | `Reex API Docs \| React API Integration Framework` |
| Documentation topics | `<Topic> \| Reex API Docs` |
| Studio workspace pages | `<Workspace Page> \| Reex API Studio`, retaining noindex |

Proposed marketing description: “Reex API is the React framework for API integration. Turn OpenAPI and Postman collections into TypeScript clients, TanStack Query hooks, and authentication code.”

Proposed Studio description: “Reex is the React framework for API integration. Use Reex API Studio to test endpoints and generate production-ready typed API services, TanStack Query hooks, and auth providers.”

Proposed documentation description: “Learn Reex API, the React framework for API integration. Follow guides for CLI setup, TypeScript clients, TanStack Query hooks, and authentication.”

Proposed npm description: “CLI for Reex API, the React framework for API integration. Generate TypeScript API clients and TanStack Query hooks from OpenAPI and Postman collections.”

**2. Correct the marketing site's canonical and indexing signals first.**

Primary files: `reex-landing/src/lib/site.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `next.config.ts`, and the four existing secondary `page.tsx` files.

Change the marketing origin to the existing public `www` destination. Set the homepage canonical explicitly to `https://www.reex-api.dev/` in homepage metadata, and derive its Open Graph URL and JSON-LD URLs from the same constant. Avoid a root-layout homepage canonical accidentally applying to other pages.

Preserve the apex-to-`www` permanent redirect. Consolidate the duplicate `/index` URL with a permanent redirect to `/`, checking the deployed rewrite rules before choosing a hosting-level rule or Next.js redirect. Confirm that neither the homepage nor its internal rendering path enters a redirect loop. Preserve meaningful paths and query parameters through host redirects, while canonical URLs exclude tracking parameters. Do not add a blanket redirect of unknown routes to the homepage.

Create a page-metadata helper that sets title, description, canonical policy, Open Graph, Twitter, and robots values together. Secondary pages currently inherit homepage social fields; complete per-route objects will prevent that drift. Next.js metadata is shallowly merged, so nested metadata objects need deliberate handling. The installed Next.js 16.3 metadata documentation has been inspected; implementation should use that version's API.

Mark the four navigation-only marketing routes `noindex, follow`, remove them from the sitemap, and remove the unsupported `TechArticle` and other content claims their bodies do not support. Keep the URLs and rendered UI available. Use no homepage canonical inherited by these excluded routes. Do not block them in robots.txt, so crawlers can read their noindex directives. Reintroducing them to search requires a future content change outside this scope.

The marketing sitemap should initially contain only the homepage. Remove `new Date()` modification dates; omit `lastModified` until an actual modification date is available. Canonicals, redirects, and sitemap URLs should agree on the preferred address. [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

**3. Describe one product across separate websites.**

Extend the existing JSON-LD instead of adding disconnected or duplicate graphs. Use stable identifiers such as `https://www.reex-api.dev/#software` for the Reex product, `https://www.reex-api.dev/#website` for marketing, `https://studio.reex-api.dev/#website` for Studio, and `https://docs.reex-api.dev/#website` for documentation.

Keep a `WebSite` node on each site's homepage with its own URL, concise site name, and genuine aliases. Reference the common product with appropriate `about` relationships. Preserve Studio's distinct `WebApplication` node and connect it to the framework it implements. Documentation pages retain their `WebPage`/`TechArticle` and breadcrumb relationships and identify the product they document.

Represent the CLI separately if it is included in the marketing graph: use its actual package URL and corresponding source repository. The Studio source repository and CLI source repository currently differ; preserve that distinction. Use `sameAs` only for verified external representations of the same entity, and use source-code/documentation relationships for repositories and guides. Do not equate every subdomain with the same website or canonicalize Studio/docs pages to marketing.

Reuse existing image assets. Metadata descriptions and schema properties must remain supported by the visible product features. Do not invent an organization, author identity, reviews, ratings, or capabilities to strengthen the graph. An Organization node is unnecessary unless the actual publishing organization is established. Google requires structured data to represent the page's real content. [Google structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

**4. Update Studio metadata while preserving its working indexing policy.**

Primary files: `api-next-server/src/config/seo.ts`, `src/config/links.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, the support/settings/sandbox metadata layouts, `src/config/seo.test.ts`, `tests/e2e/seo.spec.ts`, and `SEO.md`.

Apply the contract to titles, descriptions, `applicationName`, social site names, and JSON-LD. Keep `/` and `/support` indexable and self-canonical. Keep `/settings` and `/sandbox` noindex, absent from the sitemap, and without inherited canonical links. Retain query-free canonicals for workspace parameters such as `localPort`, existing API crawl exclusions, proper 404 responses, and the permanent `/docs` redirects.

Preserve the current production/preview indexing behavior, server-rendered welcome content, mobile behavior, and support content. Existing authorship metadata should be reviewed for factual accuracy independently of brand naming; a branding change should not invent a common publisher.

**5. Update all documentation metadata without changing the documentation UI.**

Primary files: `reex-docs/lib/seo.ts`, `app/layout.tsx`, the SEO front matter in all 15 `app/**/page.mdx` files, `components/doc-structured-data.tsx`, `app/robots.ts`, `app/sitemap.ts`, `scripts/check-seo.mjs`, and `SEO.md`.

Update the site name and title template, explicitly handling the root page so its brand suffix is applied once. Refresh descriptions around each page's actual topic. Replace repeated old Open Graph site names in front matter; retain each page's canonical path and its own social title/description. Keep the existing sitemap generation, actual Git-derived dates, legacy redirects, and article/breadcrumb structure.

Treat Nextra metadata carefully: its page map can use front-matter titles for UI labels. The current `_meta.js` files supply navigation labels and should remain unchanged. Preserve body headings, breadcrumbs, previous/next labels, table-of-contents text, and Pagefind search presentation. If a metadata title change leaks into those surfaces, isolate the SEO title from the existing display title using the installed Nextra APIs before proceeding. Do not solve it by changing the displayed content.

**6. Apply consistent deployment indexing and npm discovery rules.**

Add the equivalent of Studio's build-time indexing guard to landing and docs: production public pages can index; development, preview, and explicit `SEO_NOINDEX=true` builds cannot. A noindex deployment has an empty sitemap and no advertised sitemap in robots.txt, while its pages remain crawlable. Keep production origins explicit rather than deriving canonical URLs from a preview hostname. Check both rendered meta tags and hosting `X-Robots-Tag` headers. These are indexing controls, not access controls. [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

Reduce website meta-keyword lists or remove them; they are not a Google ranking mechanism. Treat npm keywords separately, where they support package discovery. [Google on meta keywords](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag), [npm package metadata](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)

For `api-npm-bridge/package.json`, use the proposed description and canonical marketing homepage. Retain relevant existing keywords and add focused missing terms such as `reex-api`, `react`, `react-framework`, `api-integration`, `tanstack-query`, and `postman`. Preserve the actual repository, issue tracker, package name, executable, and runtime files. Synchronize lockfile package metadata if applicable.

The npm website's HTML head, canonical, and schema are controlled by npm. Updating this repository alone does not update the public listing: include the metadata in the next normal package release and verify the registry afterward. Leave release version selection to the current release state rather than assuming that today's 7.3.2 is still latest. README revisions, if requested later, likewise require a new publication to appear on npm. [npm README publication behavior](https://docs.npmjs.com/about-package-readme-files/)

**7. Validate output and preserve the no-UI-change boundary.**

| Area | Acceptance criteria |
| --- | --- |
| Brand consistency | All four repositories use the agreed product name, positioning, origins, and relevant entity IDs; per-page copy remains specific. |
| Public HTML | Each indexable URL returns 200 and has one meaningful title, description, and self-canonical; Open Graph/Twitter fields describe that page. Required metadata and JSON-LD are available without relying on client effects. |
| Canonical URLs | Production canonicals resolve directly to the intended 200 page; no apex/`www` disagreement, `/index` homepage canonical, or tracking parameters. Root URLs with and without a trailing slash are compared by URL normalization. |
| Indexing | Marketing initially has 1 sitemap URL, Studio 2, and docs 15. The four empty marketing routes and two Studio workspace routes are excluded. Preview noindex behavior is tested separately from production. |
| Redirects/errors | Apex redirects, `/index` consolidation, existing documentation redirects, query preservation, and 404 status/noindex behave correctly; no redirect loops or broad soft-404 redirects. |
| Structured data | JSON-LD parses, site names agree with metadata, entity relationships are coherent, and no nonexistent article or fabricated ratings are described. |
| Assets | Existing favicon/logo/social images remain unchanged and publicly reachable; dimensions and MIME types remain correct. |
| UI | Before/after checks show the same visible text, layout, navigation, and interactions, including docs search and mobile views. Changes are restricted to the agreed SEO surfaces. |
| npm | Package metadata passes inspection, the executable and package contents are unchanged, and the eventual published registry record matches the new description/homepage. |

Extend the existing Studio unit/browser tests and docs rendered-HTML checker. Add focused rendered-SEO coverage to landing's existing Playwright setup, especially the production `/index` regression, social metadata inheritance, excluded routes, and preview builds. Add a small workspace consistency check for the four brand contracts. This is output validation for observed bugs and indexing risks, rather than tests that merely repeat constants.

Run Studio's documented typecheck, lint, unit, production build, and browser checks; docs' build and `check:seo`; landing's lint, build, SEO checks, and existing responsive checks. For the CLI, inspect `npm pack --dry-run --json` and run its existing tests as the release check. If a production build is required by a test, ensure that the test is served from that build rather than a reused development server. Record any existing failures separately.

Validate site-name markup with Schema Markup Validator: Google's Rich Results Test does not validate site-name support. Use Rich Results Test where supported, such as breadcrumbs, and Search Console URL Inspection for Google's fetched HTML and canonical decisions. [Google site-name validation instructions](https://developers.google.com/search/docs/appearance/site-names)

These implementation checks have not been run in this planning task. Existing repository runbooks contain earlier test results; those are not validation of the proposed changes.

**8. Release in order, then measure search outcomes.**

Implement the identity contract first, then the marketing fixes, Studio and documentation metadata, and CLI discovery metadata. Deliver reviewable changes per repository and update the SEO runbooks. Deploy marketing first so the common product URL and canonical destination are established, then Studio and docs, and publish the CLI metadata through its normal release. Hosting changes, deployments, Search Console submissions, and npm publication are future rollout work; none has been performed for this plan.

Use an existing verified Search Console Domain property for `reex-api.dev`, or verify it through DNS when access is available. That property covers `www`, `studio`, and `docs`; a URL-prefix property covers only its matching prefix. Verification tokens must come from the real account. [Search Console property coverage](https://support.google.com/webmasters/answer/34592)

Submit these three sitemaps after production verification:

- `https://www.reex-api.dev/sitemap.xml`
- `https://studio.reex-api.dev/sitemap.xml`
- `https://docs.reex-api.dev/sitemap.xml`

Inspect the marketing homepage, Studio homepage/support, docs homepage, and representative nested docs pages. Record declared and Google-selected canonicals, fetch/indexing status, and rendered metadata. Request indexing for the changed priority pages. Monitor the excluded pages until Google reflects their noindex directives. npm is outside the owned domain property and cannot be submitted through it.

Capture a pre-release baseline of available Search Console impressions, clicks, CTR, and average position for `reex api`, `reex-api`, `reex`, `reex cli`, `reex-cli`, and React API integration queries. Compare rolling 28-day periods and check progress at roughly 2, 4, and 8 weeks. Record manual Google query checks with consistent locale/device settings and whether the spelling substitution appears. Search Console does not provide a dedicated spelling-correction metric.

The implementation is complete when metadata, indexing rules, production responses, and package discovery fields meet the acceptance criteria. The desired search outcome is Reex appearing reliably for its brand queries, with the marketing site leading general brand discovery and docs/Studio serving their own intent. That outcome depends on Google's subsequent crawling and ranking decisions. Recrawling can take days to weeks, and requesting it does not guarantee indexing. [Google recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)

If visibility remains weak after recrawling, use Search Console evidence to identify the next action. The current constraint preserves older visible terminology in the sites and README, so complete editorial repositioning and additional public brand references would be separate content work. Repeating metadata edits or adding keywords is not a substitute for that evidence.
