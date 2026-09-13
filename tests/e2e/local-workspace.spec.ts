import { expect, test, type Page } from "@playwright/test";

async function readStore(page: Page, key: string) {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("reex_app_storage", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Array<Record<string, unknown>>>(
        (resolve, reject) => {
          const tx = db.transaction("collections", "readonly");
          const request = tx.objectStore("collections").get(key);
          tx.oncomplete = () => resolve(request.result || []);
          tx.onabort = () => reject(tx.error);
        },
      );
    } finally {
      db.close();
    }
  }, key);
}

async function seedStore(page: Page, key: string, records: unknown[]) {
  await page.evaluate(
    async ({ key, records }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("reex_app_storage", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("collections");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("collections", "readwrite");
          tx.objectStore("collections").put(records, key);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { key, records },
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("reex_tour_completed", "true"),
  );
  await page.route("http://localhost:4000/**", (route) =>
    route.fulfill({ json: { targetDir: null } }),
  );
});

test("creates collection 21 and request 21 without login, preserves API auth, and sends a request", async ({
  page,
}) => {
  const retiredRequests: string[] = [];
  page.on("request", (request) => {
    if (
      /\/api\/(auth|subscription|user\/record-import)|supabase/.test(
        request.url(),
      )
    )
      retiredRequests.push(request.url());
  });
  await page.goto("/sandbox");
  await expect(
    page.getByRole("button", { name: "Add Collection", exact: true }).first(),
  ).toBeVisible();
  await seedStore(
    page,
    "test_collections",
    Array.from({ length: 20 }, (_, i) => ({
      id: "test-" + i,
      name: "Existing " + i,
      requests: [],
      isOpen: false,
    })),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Add Collection", exact: true })
    .first()
    .click();
  await page
    .getByPlaceholder("My Collection", { exact: true })
    .fill("Browser API");
  await page.getByPlaceholder("My Collection", { exact: true }).press("Enter");
  await expect
    .poll(async () => (await readStore(page, "test_collections")).length)
    .toBe(21);

  const saved = await readStore(page, "test_collections");
  const collection = saved.find((item) => item.name === "Browser API")!;
  collection.requests = Array.from({ length: 20 }, (_, i) => ({
    id: "request-" + i,
    name: "Saved request " + i,
    method: "GET",
    url: "/items",
  }));
  collection.base_url = "https://example.test";
  await seedStore(page, "test_collections", saved);
  await page.reload();
  await page.getByRole("button", { name: "Add Request", exact: true }).click();
  await page
    .getByPlaceholder("My Request", { exact: true })
    .fill("Browser request");
  await page.getByPlaceholder("My Request", { exact: true }).press("Enter");
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const collection = (await readStore(page, "test_collections")).find(
        (item) => item.name === "Browser API",
      );
      return (collection?.requests as unknown[]).length;
    })
    .toBe(21);

  await page.getByTitle("Authorization Settings", { exact: true }).click();
  await page
    .getByPlaceholder("Enter token from auth/signin")
    .fill("browser-test-token");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect
    .poll(async () => {
      const collection = (await readStore(page, "test_collections")).find(
        (item) => item.name === "Browser API",
      );
      return (collection?.auth as Record<string, string>)?.token;
    })
    .toBe("browser-test-token");

  let sentHeaders: Record<string, string> | undefined;
  await page.route("https://example.test/**", async (route) => {
    sentHeaders = route.request().headers();
    await route.fulfill({ json: { browserTest: "success" } });
  });
  await page.route("**/api/cors-proxy", async (route) => {
    sentHeaders = route.request().postDataJSON().headers;
    await route.fulfill({
      json: { success: true, data: { browserTest: "success" } },
    });
  });
  await page.getByPlaceholder("/users", { exact: true }).fill("/items");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect
    .poll(() => sentHeaders?.Authorization || sentHeaders?.authorization)
    .toBe("Bearer browser-test-token");
  await page.reload();
  await expect(
    page.getByText("Browser API", { exact: true }).first(),
  ).toBeVisible();
  expect(await readStore(page, "test_collections")).toHaveLength(21);
  expect(retiredRequests).toEqual([]);
});

test("imports a real collection through the processing route and saves it locally without login", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Import Collection/i })
    .first()
    .click();
  const specification = {
    openapi: "3.0.0",
    info: { title: "Browser import", version: "1.0.0" },
    servers: [{ url: "https://example.test" }],
    paths: {
      "/items": {
        get: {
          operationId: "getItems",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: "browser-api.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(specification)),
  });
  await page
    .getByRole("button", { name: "Analyze Changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review Changes", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Add \d+$/ }).click();
  await expect
    .poll(async () => (await readStore(page, "standalone_collections")).length)
    .toBe(1);
  const [collection] = await readStore(page, "standalone_collections");
  expect(Object.keys(collection.manifest as object).length).toBeGreaterThan(0);
  await page.reload();
  await expect
    .poll(async () => (await readStore(page, "standalone_collections")).length)
    .toBe(1);
  await expect(
    page.getByRole("button", { name: /sign in|upgrade/i }),
  ).toHaveCount(0);
});

test("settings and support work anonymously, and old account endpoints are gone", async ({
  page,
  request,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Workspace settings" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Dark Theme/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /^Light Theme/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /^Light Theme/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/support");
  await expect(
    page.getByRole("link", { name: "Browse Open Issues" }),
  ).toHaveAttribute("href", /\/issues\/new\/choose$/);
  for (const endpoint of [
    "/api/auth/session",
    "/api/subscription/status",
    "/api/user/record-import",
    "/subscription",
  ]) {
    expect((await request.get(endpoint)).status()).toBe(404);
  }
});

test("deletes a collection with older and malformed saved tabs without losing other tabs", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  const manifest = {
    items: { get_items: { url: "/items", method: "GET", args: [] } },
  };
  await seedStore(page, "standalone_collections", [
    {
      id: "remove",
      name: "Delete this collection",
      manifest,
      modules: {},
      config: { baseURL: "https://example.test" },
    },
    {
      id: "keep",
      name: "Keep this collection",
      manifest,
      modules: {},
      config: { baseURL: "https://example.test" },
    },
  ]);
  await page.evaluate(() => {
    localStorage.setItem(
      "reex_project_tabs",
      JSON.stringify([
        { isPinned: true },
        {
          endpoint: { apiKey: "col_remove__items", fnName: "get_items" },
          isPinned: true,
        },
        { apiKey: "col_keep__items", fnName: "get_items", isPinned: true },
      ]),
    );
    localStorage.setItem(
      "reex_project_active_tab_key",
      "col_remove__items__get_items",
    );
  });
  await page.reload();
  await expect(
    page.getByTitle("Delete this collection", { exact: true }),
  ).toBeVisible();
  await page.getByTitle("Options", { exact: true }).first().click();
  await page
    .getByRole("menuitem", { name: "Delete Collection", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect
    .poll(async () =>
      (await readStore(page, "standalone_collections")).map((item) => item.id),
    )
    .toEqual(["keep"]);
  await expect(
    page.getByTitle("Delete this collection", { exact: true }),
  ).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("reex_project_tabs") || "[]"),
      ),
    )
    .toEqual([
      { apiKey: "col_keep__items", fnName: "get_items", isPinned: true },
    ]);
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("reex_project_active_tab_key")),
    )
    .toBe("col_keep__items__get_items");
  await page.reload();
  await expect(
    page.getByTitle("Keep this collection", { exact: true }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("saves the tab preference and pins previews with double-click or keyboard shortcuts", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: /^Preview Mode/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Pin Tabs by Default/ }).click();
  await page.getByRole("button", { name: /^Preview Mode/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /^Preview Mode/ })).toHaveAttribute("aria-pressed", "true");
  await seedStore(page, "standalone_collections", [
    {
      id: "tabs",
      name: "Tab preferences",
      modules: {},
      config: { baseURL: "https://example.test" },
      manifest: {
        items: Object.fromEntries(
          ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].map((name) => [
            "get_" + name,
            { url: "/" + name, method: "GET", args: [] },
          ]),
        ),
      },
    },
  ]);
  await page.goto("/");
  await page.getByPlaceholder("Search endpoints...").fill("get_");
  const endpoint = (name: string) =>
    page.getByTitle("get_" + name + "\n/" + name, { exact: true });
  const tab = (name: string) => page.getByTitle("get_" + name, { exact: true });
  const readTabs = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("reex_project_tabs") || "[]") as Array<{
          fnName: string;
          isPinned: boolean;
        }>,
    );
  const expectPinned = async (name: string) => {
    await expect
      .poll(
        async () =>
          (await readTabs()).find((t) => t.fnName === "get_" + name)?.isPinned,
      )
      .toBe(true);
    await expect(tab(name)).not.toHaveClass(/unpinned/);
  };

  await endpoint("alpha").click();
  await expect(tab("alpha")).toHaveClass(/unpinned/);
  await endpoint("beta").click();
  await expect(tab("alpha")).toHaveCount(0);
  await expect(tab("beta")).toHaveClass(/unpinned/);
  await tab("beta").dblclick();
  await expectPinned("beta");

  await endpoint("gamma").dblclick();
  await expectPinned("gamma");
  await expect(tab("beta")).toBeVisible();
  await endpoint("delta").click();
  await expect(tab("delta")).toHaveClass(/unpinned/);
  await page.getByPlaceholder("Search endpoints...").focus();
  await page.keyboard.press("Control+s");
  await expectPinned("delta");
  await endpoint("alpha").click();
  await expect(tab("alpha")).toHaveClass(/unpinned/);
  await page.keyboard.press("Meta+s");
  await expectPinned("alpha");
  await endpoint("epsilon").click();
  await expect(tab("epsilon")).toHaveClass(/unpinned/);

  await page.goto("/settings");
  await page.getByRole("button", { name: /^Pin Tabs by Default/ }).click();
  await page.goto("/");
  await page.getByPlaceholder("Search endpoints...").fill("get_");
  await endpoint("zeta").click();
  await expectPinned("zeta");
  await expect(tab("epsilon")).toHaveClass(/unpinned/);
  await page.reload();
  await expectPinned("zeta");
  expect(await readTabs()).toHaveLength(6);
});
