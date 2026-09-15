import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const workspace = process.argv[2] ? resolve(process.argv[2]) : resolve(projectRoot, "..");
const projects = ["api-next-server", "reex-landing", "reex-docs", "api-npm-bridge"];
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const brand = await json(resolve(projectRoot, "seo/brand.json"));

for (const project of projects) {
  assert.deepEqual(await json(resolve(workspace, project, "seo/brand.json")), brand, `${project}: shared SEO identity drifted`);
}

for (const origin of Object.values(brand.origins)) {
  assert.equal(new URL(origin).protocol, "https:");
  assert.equal(new URL(origin).origin, origin);
}
assert.equal(new URL(brand.entities.product).origin, brand.origins.marketing);

const cli = await json(resolve(workspace, "api-npm-bridge/package.json"));
assert.equal(cli.name, brand.package.name);
assert.equal(cli.bin[brand.package.command], "./bin/index.js");
assert.equal(cli.homepage, brand.origins.marketing);
assert.ok(cli.description.includes(brand.searchName));
assert.ok(cli.description.includes(brand.positioning.replace(/^The /, "the ")));
assert.equal(cli.repository.url, `git+${brand.package.repository}.git`);
for (const keyword of ["reex-api", "react", "api-integration", "tanstack-query", "postman"]) {
  assert.ok(cli.keywords.includes(keyword), `npm keyword: ${keyword}`);
}

const modules = [
  ["api-next-server", "src/config/seo.ts", "studio"],
  ["reex-landing", "src/lib/seo.ts", "marketing"],
  ["reex-docs", "lib/seo.ts", "docs"],
].map(([project, file, role]) => ({ url: pathToFileURL(resolve(workspace, project, file)).href, role }));

// Each scenario gets fresh modules: indexing flags are evaluated at build time.
const scenarios = [
  { NODE_ENV: "production", VERCEL_ENV: "production", expected: true },
  { NODE_ENV: "production", expected: true },
  { NODE_ENV: "production", VERCEL_ENV: "preview", expected: false },
  { NODE_ENV: "production", VERCEL_ENV: "development", expected: false },
  { NODE_ENV: "production", SEO_NOINDEX: "true", expected: false },
  { NODE_ENV: "development", expected: false },
];

// Evaluate the pure SEO modules in a fresh context for each build environment.
function loadConfig(filename, env, cache = new Map()) {
  const file = extname(filename) ? filename : filename + ".ts";
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const source = readFileSync(file, "utf8");
  if (file.endsWith(".json")) {
    mod.exports = JSON.parse(source);
  } else {
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      fileName: file,
    });
    const localRequire = (specifier) => {
      assert.ok(specifier.startsWith("."), "SEO config must only import local data/config: " + specifier);
      return loadConfig(resolve(dirname(file), specifier), env, cache);
    };
    vm.runInNewContext(outputText, { module: mod, exports: mod.exports, require: localRequire, process: { env }, URL }, { filename: file });
  }
  return mod.exports;
}

for (const { expected, ...scenario } of scenarios) {
  for (const { url, role } of modules) {
    const seo = loadConfig(fileURLToPath(url), scenario);
    assert.equal(seo.INDEXING_ENABLED, expected, role + ": indexing policy");
    const absoluteUrl = seo.siteUrl ?? seo.absoluteUrl;
    assert.equal(new URL(absoluteUrl("/")).origin, brand.origins[role]);
    if (seo.SITE_DESCRIPTION) assert.ok(seo.SITE_DESCRIPTION.includes(brand.positioning.replace(/^The /, "the ")));
    if (seo.pageMetadata) {
      const page = seo.pageMetadata({ title: "Topic", description: "Topic description", path: "/" });
      assert.equal(page.robots.index, expected);
      assert.equal(page.robots.googleBot.index, expected);
      assert.equal(page.openGraph.siteName, brand.sites[role].name);
      assert.equal(page.openGraph.url, absoluteUrl("/"));
      assert.equal(page.twitter.description, page.description);
      const privatePage = seo.pageMetadata({ title: "Workspace", description: "Workspace", path: "/private", index: false });
      assert.equal(privatePage.robots.index, false);
      assert.equal(privatePage.alternates, undefined);
    }
    if (seo.homeStructuredData) {
      const website = seo.homeStructuredData["@graph"].find(node => node["@type"] === "WebSite");
      assert.equal(website.about["@id"], brand.entities.product);
      assert.deepEqual(website.alternateName, brand.sites[role].alternateNames);
    }
  }
}

console.log("SEO identity matches across all 4 repositories; all 3 websites pass 6 deployment-indexing scenarios and npm discovery metadata agrees.");
