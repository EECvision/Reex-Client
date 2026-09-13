# SEO audit and implementation

This review covers the Next.js Studio app in this repository. The marketing website and documentation subdomain are separate sites. Live search visibility, Search Console data, and production Core Web Vitals require checks after deployment.

## Findings addressed

| Finding | Implementation |
| --- | --- |
| Homepage HTML contained only a loading message, with no heading or links | The welcome content is prerendered during workspace initialization: a visible H1, product description, feature headings, and links to documentation and support. |
| All pages shared the same metadata; canonical links were missing | Each route has its own title, description, Open Graph and Twitter metadata. Public pages use absolute canonical URLs, without workspace or tracking query parameters. |
| Settings and the browser sandbox inherited permission to index | Both now emit `noindex, follow`, including Googlebot directives. They remain crawlable so crawlers can read those directives. |
| Support was absent from the sitemap | The sitemap lists the canonical homepage and support page only. |
| Sitemap modification dates changed on every build | Removed synthetic dates. Add `lastModified` only when real content modification dates are available. |
| Mobile content was covered by a full-screen desktop notice and automatic onboarding | Replaced with a small, dismissible notice using responsive CSS. The tour no longer opens automatically on small screens, and the duplicate setup popup is omitted from the empty workspace. Welcome content can scroll on narrow screens. |
| Closed FAQ answers were absent from the server HTML | Native `details`/`summary` elements keep all answers in the initial HTML and allow expansion even without JavaScript. |
| No product structured data | The homepage includes WebSite and WebApplication JSON-LD describing the visible product features. No ratings or reviews are claimed. |
| Deployments shared a hardcoded SEO origin and indexing policy | Build-time configuration supports a canonical origin, a staging `noindex` switch, automatic Vercel preview exclusion, and Search Console verification. |

The existing 1200 × 630 PNG social image, English language declaration, viewport metadata, and permanent documentation redirects are retained and checked.

## Indexing policy

| Route | Production indexing | Canonical | Sitemap |
| --- | --- | --- | --- |
| `/` | Index | Configured origin + `/` | Yes |
| `/support` | Index | Configured origin + `/support` | Yes |
| `/settings` | Noindex, follow | None | No |
| `/sandbox` | Noindex, follow | None | No |
| `/api/…` | Crawling disallowed | None | No |
| `/docs` and `/docs/…` | Permanent redirect to the documentation site | Managed by destination | No |
| Unknown pages | HTTP 404 with noindex | None | No |

On development, Vercel preview/development, or `SEO_NOINDEX=true` builds, page indexing is disabled and the sitemap is empty. Robots.txt still permits page crawling so `noindex` can be read. These controls are search directives, not access controls.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`, and `npm run test:e2e`.

The SEO unit tests exercise production, development, preview, explicit noindex, and custom-domain configurations. Browser tests check initial HTML with JavaScript disabled, canonical query handling, structured data, route-specific metadata, FAQ expansion, sitemap membership, image dimensions, redirects, 404s, and mobile reading/navigation. Browser SEO tests expect an indexable production build.

Completed locally: production build and TypeScript checks passed; all 62 unit tests and all 10 browser tests passed. Browser tests used installed Chrome (`PLAYWRIGHT_CHANNEL=chrome`). Lint passed with 10 pre-existing unused-variable warnings. Desktop and fresh-session mobile rendering were also visually checked. Existing workspace tests were updated to use the current settings buttons and support-link text.

## After deployment

1. Set `NEXT_PUBLIC_SITE_URL` to the public origin before building a self-hosted deployment. Set `SEO_NOINDEX=true` on nonpublic environments and leave it unset on the public production build.
2. Verify the deployed origin in Google Search Console, optionally using `GOOGLE_SITE_VERIFICATION`, then submit `/sitemap.xml` under that origin.
3. Inspect `/` and `/support` in Search Console, including the rendered mobile page. Check canonical selection and indexing status after recrawling.
4. Measure the deployed pages in PageSpeed Insights and monitor real-user LCP, INP, and CLS. Local functional checks do not establish production performance or ranking.

## References

- [Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: mobile-first indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)
- [Google: excluding pages with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google: building a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Next.js: metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
