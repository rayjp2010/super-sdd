// Tools the renderer needs, installed on first use into ~/.cache/technical-diagrams/, outside any
// project: the draw.io MCP package (edge routing), playwright-core with a Chromium build, and the
// draw.io web app (the exporter). Nothing here touches a project's own dependencies or lockfile.
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DRAWIO_MCP = "@drawio/mcp@1.6.3";
export const PLAYWRIGHT = "playwright-core@1.64.0";
// draw.io 31.7.0: the web app's export page produces the same SVG as draw.io Desktop 31.7.0.
export const WEBAPP_TAG = "v31.7.0";
const WEBAPP_COMMIT = "24b76c2cbd55d88e354042e8d329a2e4708972bc";
const WEBAPP_PATHS = ["/src/main/webapp/export3.html", "/src/main/webapp/export-fonts.css", ...["js", "mxgraph", "resources", "styles"].map((d) => `/src/main/webapp/${d}/`)];

export class ToolError extends Error {}

const cacheRoot = () => path.join(process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache"), "technical-diagrams");

/** Runs a command; `quiet` hides its output unless it fails. */
function run(cmd, args, what, { quiet = false } = {}) {
  const r = spawnSync(cmd, args, quiet ? { encoding: "utf8" } : { stdio: ["ignore", "inherit", "inherit"], encoding: "utf8" });
  if (r.error) throw new ToolError(`${what}: ${cmd} is not available (${r.error.message})`);
  if (r.status !== 0) throw new ToolError(`${what} failed (${cmd} exited ${r.status})${quiet ? `\n${r.stderr}` : ""}`);
}

/** Install an npm package into the cache once; returns the path of the package itself. */
function ensureNpmPackage(spec) {
  const at = spec.lastIndexOf("@");
  const name = spec.slice(0, at);
  const dir = path.join(cacheRoot(), spec.replace("/", "+"));
  const pkg = path.join(dir, "node_modules", ...name.split("/"));
  if (!existsSync(path.join(pkg, "package.json"))) {
    console.error(`render: installing ${spec} into ${dir} (first run only)`);
    mkdirSync(dir, { recursive: true });
    run("npm", ["install", "--prefix", dir, "--no-audit", "--no-fund", "--loglevel=error", spec], `installing ${spec}`);
    if (!existsSync(path.join(pkg, "package.json"))) throw new ToolError(`could not install ${spec}`);
  }
  return pkg;
}

/** The libavoid edge router from the draw.io MCP package. */
export async function loadRouter() {
  const entry = path.join(ensureNpmPackage(DRAWIO_MCP), "src", "libavoid-pass.js");
  if (!existsSync(entry)) throw new ToolError(`${DRAWIO_MCP} has no libavoid-pass.js`);
  return (await import(pathToFileURL(entry).href)).routeXml;
}

/** Directory of the draw.io web app at WEBAPP_TAG: a sparse, shallow git checkout, fetched once. */
export function ensureWebapp() {
  const dir = path.join(cacheRoot(), `drawio-webapp@${WEBAPP_TAG}`);
  const webapp = path.join(dir, "src", "main", "webapp");
  if (existsSync(path.join(webapp, "export3.html"))) return webapp;
  console.error(`render: fetching draw.io ${WEBAPP_TAG} web app into ${dir} (first run only)`);
  mkdirSync(cacheRoot(), { recursive: true });
  const tmp = `${dir}.tmp-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  try {
    run("git", ["-c", "advice.detachedHead=false", "clone", "--quiet", "--depth", "1", "--branch", WEBAPP_TAG, "--filter=blob:none", "--sparse", "https://github.com/jgraph/drawio.git", tmp], "fetching the draw.io web app", { quiet: true });
    run("git", ["-C", tmp, "sparse-checkout", "set", "--no-cone", ...WEBAPP_PATHS], "checking out the draw.io web app", { quiet: true });
    const head = spawnSync("git", ["-C", tmp, "rev-parse", "HEAD^{commit}"], { encoding: "utf8" }).stdout.trim();
    if (head !== WEBAPP_COMMIT) throw new ToolError(`draw.io ${WEBAPP_TAG} resolved to ${head}, expected ${WEBAPP_COMMIT}`);
    if (!existsSync(path.join(tmp, "src", "main", "webapp", "export3.html"))) throw new ToolError("draw.io checkout has no export3.html");
    rmSync(path.join(tmp, ".git"), { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
    renameSync(tmp, dir);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return webapp;
}

/** Launch Chromium through playwright-core, installing playwright-core and the browser if missing. */
export async function launchBrowser() {
  const pkg = ensureNpmPackage(PLAYWRIGHT);
  const { chromium } = await import(pathToFileURL(path.join(pkg, "index.mjs")).href);
  try {
    return await chromium.launch();
  } catch (e) {
    if (!/Executable doesn't exist|playwright install/i.test(String(e.message))) throw e;
  }
  console.error("render: installing Chromium for Playwright (first run only)");
  run(process.execPath, [path.join(pkg, "cli.js"), "install", "chromium"], "installing Chromium");
  return chromium.launch();
}
