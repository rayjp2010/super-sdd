// Export a draw.io model to an editable light/dark .drawio.svg and light/dark PNG previews.
// The SVG comes from draw.io's own export page (export3.html), driven in Chromium through a small
// stand-in for the Electron bridge that draw.io Desktop provides. The page runs the same render code
// as draw.io Desktop, so the SVG is the same. The PNGs are screenshots of that SVG under each
// colour scheme.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { ensureWebapp, launchBrowser, ToolError } from "./tools.mjs";

const RENDER_TIMEOUT_MS = 60_000;
const DARK_BACKGROUND = "#121212";
const BORDER = 16;

// Runs before the page scripts. export.js talks to Electron only through window.electron and checks
// the user agent for " electron/" and " draw.io/".
function installBridge() {
  const listeners = {};
  const waiters = {};
  Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 electron/40 draw.io/31.7.0" });
  window.electron = {
    registerMsgListener: (action, cb) => { listeners[action] = cb; },
    sendMessage: (action, data) => { waiters[action]?.(data ?? null); },
    listenOnce() {},
    request() {},
  };
  window.__call = (action, arg, replies) =>
    new Promise((resolve, reject) => {
      for (const r of replies) waiters[r] = (data) => (r === "export-error" ? reject(new Error(data || "export failed")) : resolve(data));
      listeners[action](arg);
    });
}

async function exportSvg(browser, webapp, xml) {
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  // Offline and deterministic: the page may only read its own files.
  await page.route(/^https?:/, (route) => route.abort());
  try {
    await page.addInitScript(installBridge);
    await page.goto(pathToFileURL(path.join(webapp, "export3.html")).href);
    const args = { format: "svg", xml, bg: "#ffffff", scale: 1, border: BORDER, embedXml: "1", embedFonts: "0", embedImages: "0", theme: "auto" };
    await withTimeout(page.evaluate((a) => window.__call("render", a, ["render-finished", "export-error"]), args), "draw.io render");
    return await withTimeout(page.evaluate(() => window.__call("get-svg-data", undefined, ["svg-data"])), "draw.io SVG export");
  } catch (e) {
    throw new ToolError(`draw.io export failed: ${e.message}${problems.length ? `\n${problems.join("\n")}` : ""}`);
  } finally {
    await page.close();
  }
}

function withTimeout(promise, what) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${what} timed out`)), RENDER_TIMEOUT_MS); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function screenshot(browser, svg, scheme, scale, file) {
  const m = svg.match(/<svg[^>]*\swidth="([\d.]+)px"[^>]*\sheight="([\d.]+)px"/);
  if (!m) throw new ToolError("exported SVG has no pixel size");
  const context = await browser.newContext({ colorScheme: scheme, viewport: { width: Math.ceil(+m[1]), height: Math.ceil(+m[2]) }, deviceScaleFactor: scale });
  try {
    const page = await context.newPage();
    const bg = scheme === "dark" ? DARK_BACKGROUND : "#ffffff";
    await page.setContent(`<!doctype html><body style="margin:0;background:${bg}">${svg.replace(/^<\?xml[^>]*>|<!DOCTYPE[^>]*>/g, "")}</body>`);
    await page.screenshot({ path: file });
  } finally {
    await context.close();
  }
}

/** Writes the editable SVG to `svgFile` and the two previews to `lightFile` and `darkFile`. */
export async function exportDiagram(xml, { svgFile, lightFile, darkFile, scale }) {
  const webapp = ensureWebapp();
  const browser = await launchBrowser();
  try {
    const svg = await exportSvg(browser, webapp, xml);
    writeFileSync(svgFile, svg);
    await screenshot(browser, svg, "light", scale, lightFile);
    await screenshot(browser, svg, "dark", scale, darkFile);
  } finally {
    await browser.close();
  }
}
