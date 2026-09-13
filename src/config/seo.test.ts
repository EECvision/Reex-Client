import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("deployment indexing policy", () => {
  it.each([
    { nodeEnv: "production", vercelEnv: "production", noindex: "", expected: true },
    { nodeEnv: "production", vercelEnv: "", noindex: "", expected: true },
    { nodeEnv: "production", vercelEnv: "preview", noindex: "", expected: false },
    { nodeEnv: "production", vercelEnv: "production", noindex: "true", expected: false },
    { nodeEnv: "development", vercelEnv: "", noindex: "", expected: false },
  ])("$nodeEnv / $vercelEnv / noindex=$noindex", async ({ nodeEnv, vercelEnv, noindex, expected }) => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    vi.stubEnv("SEO_NOINDEX", noindex);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studio.example.test/");
    const { pageMetadata } = await import("./seo");
    const { default: sitemap } = await import("../app/sitemap");
    const { default: robots } = await import("../app/robots");
    const page = pageMetadata({ title: "Test", description: "Test page", path: "/support" });
    expect(page.robots).toMatchObject({ index: expected, googleBot: { index: expected } });
    expect(page.alternates?.canonical).toBe("https://studio.example.test/support");
    expect(sitemap().map((entry) => entry.url)).toEqual(expected ? ["https://studio.example.test/", "https://studio.example.test/support"] : []);
    expect(robots().sitemap).toBe(expected ? "https://studio.example.test/sitemap.xml" : undefined);
    expect(robots().rules).toMatchObject({ allow: "/", disallow: ["/api/"] });

    const privatePage = pageMetadata({ title: "Settings", description: "Settings", path: "/settings", index: false });
    expect(privatePage.robots).toMatchObject({ index: false, googleBot: { index: false } });
    expect(privatePage.alternates).toBeUndefined();
  });
});
