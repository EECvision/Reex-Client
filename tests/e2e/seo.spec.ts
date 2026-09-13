import { expect, test } from "@playwright/test";

const origin = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://studio.reex-api.dev",
).origin;

test.describe("SEO without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("homepage serves useful content, canonical metadata, and structured data", async ({ page }) => {
    await page.goto("/?localPort=4000&utm_source=seo-check");
    await expect(page).toHaveTitle("The API Client & Code Generator for React & Next.js | Reex API Builder");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("main")).toContainText("Import Postman or OpenAPI collections");
    await expect(page.getByRole("link", { name: "Help & troubleshooting" })).toHaveAttribute("href", "/support");
    const canonical = page.locator('head link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    expect(new URL((await canonical.getAttribute("href"))!).href).toBe(`${origin}/`);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    expect(new URL((await page.locator('head meta[property="og:url"]').getAttribute("content"))!).href).toBe(`${origin}/`);
    await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(schema["@graph"].map((entry: { "@type": string }) => entry["@type"])).toEqual(["WebSite", "WebApplication"]);
    expect(schema["@graph"][1].url).toBe(`${origin}/`);
  });

  test("support has its own metadata and all FAQ answers work without JavaScript", async ({ page }) => {
    await page.goto("/support");
    await expect(page).toHaveTitle("Help & API Troubleshooting | Reex API Builder");
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute("href", `${origin}/support`);
    await expect(page.locator('head meta[property="og:url"]')).toHaveAttribute("content", `${origin}/support`);
    await expect(page.locator('head meta[name="description"]')).toHaveAttribute("content", /troubleshoot CORS/);
    await expect(page.locator("details")).toHaveCount(7);
    const faq = page.locator("details").nth(1);
    await expect(faq.locator("summary")).not.toBeEmpty();
    await expect(faq.locator("div").first()).not.toBeEmpty();
    await faq.locator("summary").focus();
    await faq.locator("summary").press("Enter");
    await expect(faq).toHaveAttribute("open", "");
  });

  test("personal workspace pages are noindex and have distinct titles", async ({ page }) => {
    for (const [path, title] of [["/settings", "Workspace Settings"], ["/sandbox", "API Sandbox"]]) {
      await page.goto(path);
      await expect(page).toHaveTitle(`${title} | Reex API Builder`);
      await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
      await expect(page.locator('head meta[name="googlebot"]')).toHaveAttribute("content", /^noindex, follow/);
      await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
    }
  });
});

test("sitemap, robots rules, social image, redirects, and 404 responses agree", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])).toEqual([`${origin}/`, `${origin}/support`]);
  expect(xml).not.toContain("<lastmod>");
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const rules = await robots.text();
  expect(rules).toContain("Disallow: /api/");
  expect(rules).toContain(`Sitemap: ${origin}/sitemap.xml`);
  expect(rules).not.toMatch(/Disallow: \/(settings|sandbox|_next)/);

  const image = await request.get("/og-image.png");
  expect(image.ok()).toBeTruthy();
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  const missing = await request.get("/seo-check-missing-page");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('name="robots" content="noindex"');
  const docs = await request.get("/docs", { maxRedirects: 0 });
  expect(docs.status()).toBe(308);
  expect(docs.headers().location).toBe("https://docs.reex-api.dev/");
});

test("mobile visitors can read the homepage and dismiss the desktop tip", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const importBtn = page.getByRole("button", { name: "Import Collection", exact: true }).last();
  await expect(importBtn).toBeVisible();
  const notice = page.getByRole("complementary", { name: "Desktop experience tip" });
  await expect(notice).toBeVisible();
  expect((await notice.boundingBox())!.height).toBeLessThan(150);
  await page.getByRole("button", { name: "Dismiss desktop tip" }).click();
  await expect(notice).toHaveCount(0);
  await page.getByRole("link", { name: "Help & troubleshooting" }).click();
  await expect(page).toHaveURL(/\/support$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const faq = page.locator("details").nth(1);
  await faq.locator("summary").click();
  await expect(faq).toHaveAttribute("open", "");
  await faq.locator("summary").click();
  await expect(faq).not.toHaveAttribute("open");
  expect(errors).toEqual([]);
});
