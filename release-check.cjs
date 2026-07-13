"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveRequestPath, securityHeaders, mime, parseByteRange } = require("./serve.cjs");
const { MUSIC_TRACKS } = require("./audio-feedback.js");
const automatedOnly = process.argv.includes("--automated-only");

const runtimeFiles = ["index.html", "style.css", "game-logic.js", "platform-adapters.js", "audio-feedback.js", "app.js", "manifest.webmanifest", "icon.svg", "service-worker.js"];
const runtimeAssets = ["assets/audio/bagpop.mp3", "assets/audio/brew-ready.mp3", "assets/audio/brew-start.mp3", "assets/audio/coin.mp3", "assets/audio/confirm.mp3", "assets/audio/gather.mp3", "assets/audio/levelup.ogg", "assets/audio/tap.ogg"];
const streamedAssets = ["assets/audio/music1.mp3", "assets/audio/music2.mp3", "assets/audio/music3.mp3"];
assert.deepEqual([...MUSIC_TRACKS], streamedAssets, "music playlist and release asset inventory must match exactly");
const pagesWorkflow = fs.readFileSync(".github/workflows/pages.yml", "utf8");
for (const file of streamedAssets) assert.ok(pagesWorkflow.includes(file), `GitHub Pages artifact is missing streamed music: ${file}`);
const releaseDocs = ["RELEASE_READINESS.md", "PRIVACY_DISCLOSURE_DRAFT.md", "STORE_LISTING_DRAFT.md", "DEVICE_TEST_MATRIX.md", "ROLLBACK_PLAN.md", "SCREENSHOT_PLAN.md", "ASSET_PROVENANCE.md", "PLATFORM_ADAPTERS.md", "GAMEPLAY_ROADMAP.md"];
for (const file of [...runtimeFiles, ...runtimeAssets, ...streamedAssets, ...releaseDocs, "release-budgets.json", "release-browser-evidence.json", "fixtures/saves/legacy-pre-release-v1.json", "fixtures/saves/future-version-v4.json", "fixtures/rollback/game-save-reader-v1.cjs", "fixtures/rollback/game-save-reader-v2.cjs"]) assert.ok(fs.existsSync(file), `required release file missing: ${file}`);

const text = Object.fromEntries(runtimeFiles.map(file => [file, fs.readFileSync(file, "utf8")]));
const manifest = JSON.parse(text["manifest.webmanifest"]);
assert.equal(manifest.name, "Pocket Potion Works");
assert.equal(manifest.start_url, "./");
assert.equal(manifest.display, "standalone");
assert.ok(/^#[0-9a-f]{6}$/i.test(manifest.theme_color));
assert.ok(/^#[0-9a-f]{6}$/i.test(manifest.background_color));
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
for (const icon of manifest.icons) assert.ok(fs.existsSync(icon.src), `manifest icon missing: ${icon.src}`);

const swShellMatch = text["service-worker.js"].match(/const SHELL = (\[[^;]+\]);/);
assert.ok(swShellMatch, "service worker shell list must remain statically inspectable");
const swShell = JSON.parse(swShellMatch[1]);
for (const file of runtimeFiles.filter(file => file !== "service-worker.js")) assert.ok(swShell.includes(`./${file}`), `service worker cache is missing ${file}`);
for (const file of runtimeAssets) assert.ok(swShell.includes(`./${file}`), `service worker cache is missing ${file}`);
assert.ok(swShell.includes("./"), "service worker cache is missing the start URL");

for (const [file, source] of Object.entries(text)) {
  const inspected = file === "icon.svg" ? source.replace('xmlns="http://www.w3.org/2000/svg"', "") : source;
  assert.doesNotMatch(inspected, /https?:\/\//i, `${file} contains a remote runtime URL`);
}
assert.doesNotMatch(text["index.html"], /<(?:script|link|img)[^>]+(?:src|href)=["']\/\//i);
assert.doesNotMatch(text["style.css"], /@import|url\s*\(\s*["']?\s*(?:https?:)?\/\//i);
for (const file of runtimeFiles.filter(file => file !== "service-worker.js")) assert.doesNotMatch(text[file], /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/, `${file} introduces a network API`);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(Object.keys(pkg.dependencies || {}).length, 0, "production dependencies require release review");
assert.equal(Object.keys(pkg.optionalDependencies || {}).length, 0, "optional production dependencies require release review");
assert.equal(Object.keys(pkg.devDependencies || {}).length, 0, "development dependencies require release review");
assert.equal(Object.keys(pkg.peerDependencies || {}).length, 0, "peer dependencies require release review");
const productionSdkSignal = /firebase|sentry|segment|amplitude|mixpanel|stripe|revenuecat|admob|doubleclick|appsflyer|supabase/i;
for (const [file, source] of Object.entries(text)) assert.doesNotMatch(source, productionSdkSignal, `${file} contains a production SDK signal`);
assert.match(text["app.js"], /new Platform\.FakeRewardedAdAdapter\(\)/);
assert.match(text["app.js"], /new Platform\.FakeIapAdapter\(\)/);
assert.match(text["app.js"], /new Platform\.FakeLifecycleAdapter\(\)/);
assert.match(text["app.js"], /new Platform\.InMemoryAnalyticsAdapter\(consent\)/);
assert.match(text["app.js"], /addEventListener\("touchend", activateAudioFromGesture/);
assert.match(text["app.js"], /addEventListener\("click", activateAudioFromGesture/);
assert.doesNotMatch(text["app.js"], /Production|RealIap|RealRewarded|RemoteAnalytics|RemoteCloud/);

const privacy = fs.readFileSync("PRIVACY_DISCLOSURE_DRAFT.md", "utf8");
for (const phrase of ["local gameplay save", "local consent and simulated-commerce receipt state", "local sound preference", "memory only", "no accounts", "no ad sdk", "no billing", "no cloud"]) assert.ok(privacy.toLowerCase().includes(phrase), `privacy draft is missing current-behavior phrase: ${phrase}`);
const storeDraft = fs.readFileSync("STORE_LISTING_DRAFT.md", "utf8");
assert.match(storeDraft, /DRAFT|PLACEHOLDER/);
assert.match(storeDraft, /No real-money purchases, advertisements, accounts, analytics transmission, or cloud saves/i);

const allReleaseFiles = fs.readdirSync(".").filter(file => fs.statSync(file).isFile());
const forbiddenProduct = new RegExp(["daily", "detective"].join("\\s+"), "i");
for (const file of allReleaseFiles) assert.doesNotMatch(fs.readFileSync(file, "utf8"), forbiddenProduct, `forbidden product reference found in ${file}`);

assert.match(text["game-logic.js"], /const SAVE_VERSION = 3/);
assert.match(text["index.html"], /Each stardust adds 10% to order coins/);
assert.match(text["app.js"], /permanently increasing order coins/);
assert.doesNotMatch(`${text["index.html"]}\n${text["app.js"]}`, /all coin earnings/i, "prestige copy must match its order-reward-only multiplier");
assert.match(text["app.js"], /pocket-potion-works-v1/);
assert.match(text["app.js"], /if \(gameplaySaveWritesBlocked\) return false/);
assert.match(text["app.js"], /if \(!gameplaySaveWritesBlocked\) commerceFulfillment\.reconcile\(\)/);
assert.match(text["app.js"], /Unsupported future gameplay save is write-protected/);
assert.match(text["game-logic.js"], /unsupported-future-version/);
assert.match(text["platform-adapters.js"], /pocket-potion-works-platform-v1/);
assert.match(text["audio-feedback.js"], /pocket-potion-works-audio-v1/);
assert.ok(fs.readFileSync("ASSET_PROVENANCE.md", "utf8").includes("No remote fonts"));

for (const header of ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options", "Cross-Origin-Resource-Policy"]) assert.ok(securityHeaders[header], `server header missing: ${header}`);
assert.equal(resolveRequestPath("/%2e%2e%2f%2e%2e%2fWindows/win.ini"), null);
assert.equal(resolveRequestPath("/%E0%A4%A"), null);
assert.ok(resolveRequestPath("/index.html")?.endsWith(`${path.sep}index.html`));
assert.equal(mime[".mp3"], "audio/mpeg");
assert.equal(mime[".ogg"], "audio/ogg");
assert.deepEqual(parseByteRange("bytes=0-99", 1000), { start: 0, end: 99 });
assert.deepEqual(parseByteRange("bytes=-100", 1000), { start: 900, end: 999 });
assert.equal(parseByteRange("bytes=1000-", 1000), null);

const budgets = JSON.parse(fs.readFileSync("release-budgets.json", "utf8"));
const normalizedReleaseBytes = file => {
  const extension = path.extname(file).toLowerCase();
  if (![".html", ".css", ".js", ".json", ".webmanifest", ".svg"].includes(extension)) return fs.statSync(file).size;
  return Buffer.byteLength(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
};
let total = 0;
for (const [file, ceiling] of Object.entries(budgets.files)) {
  const bytes = normalizedReleaseBytes(file);
  total += bytes;
  assert.ok(bytes <= ceiling, `${file} is ${bytes} bytes, above its ${ceiling}-byte release budget`);
}
assert.ok(total <= budgets.totalRuntimeBytes, `runtime shell is ${total} bytes, above its ${budgets.totalRuntimeBytes}-byte budget`);

const evidence = JSON.parse(fs.readFileSync("release-browser-evidence.json", "utf8"));
assert.equal(evidence.schemaVersion, 1);
assert.equal(evidence.releaseTarget, "local-browser-release-candidate");
assert.equal(evidence.candidateVersion, pkg.version);
const requiredManualChecks = ["mobile-loop-390x844", "mobile-loop-360x740", "keyboard-modal-focus", "zoom-200-reflow", "sound-off-behavior", "sound-on-sample-mix", "csp-runtime-smoke"];
assert.ok(Array.isArray(evidence.manualChecks));
assert.equal(new Set(evidence.manualChecks.map(check => check.id)).size, evidence.manualChecks.length, "browser evidence IDs must be unique");
for (const id of requiredManualChecks) assert.ok(evidence.manualChecks.some(check => check.id === id), `browser evidence is missing required gate ${id}`);
assert.deepEqual(evidence.manualChecks.map(check => check.id).sort(), [...requiredManualChecks].sort(), "browser evidence schema contains unexpected gates");
for (const check of evidence.manualChecks) {
  assert.ok(["pending", "passed", "failed"].includes(check.status), `${check.id} has invalid status`);
  if (check.status === "passed") {
    assert.ok(typeof check.environment === "string" && check.environment.trim(), `${check.id} passed without an environment`);
    assert.ok(typeof check.performedAt === "string" && Number.isFinite(Date.parse(check.performedAt)), `${check.id} passed without a valid performedAt date`);
  }
}
const incomplete = evidence.manualChecks.filter(check => requiredManualChecks.includes(check.id) && check.status !== "passed");
const readiness = fs.readFileSync("RELEASE_READINESS.md", "utf8");
const matrix = fs.readFileSync("DEVICE_TEST_MATRIX.md", "utf8");
assert.match(readiness, /Installable PWA \| \*\*NO-GO for public release\*\*/);
assert.match(readiness, /Native app stores \| \*\*NO-GO\*\*/);
assert.match(readiness, /Production monetization, analytics, accounts, or cloud \| \*\*NO-GO\*\*/);
for (const phrase of ["PWA install/update", "Browser lifecycle", "Screen reader", "Physical iOS/iPadOS", "Physical Android", "Native iOS/Android wrappers"]) assert.ok(matrix.includes(phrase), `device matrix is missing separately blocked coverage: ${phrase}`);
console.log(`Automated release checks passed: ${runtimeFiles.length + runtimeAssets.length + streamedAssets.length} runtime files, ${releaseDocs.length} release documents, ${total}/${budgets.totalRuntimeBytes} runtime bytes.`);
if (incomplete.length) {
  const detail = incomplete.map(check => `${check.id}=${check.status}`).join(", ");
  assert.match(readiness, /Local browser prototype release candidate \| \*\*NO-GO pending browser evidence\*\*/);
  const releaseGateTask = JSON.parse(fs.readFileSync("coder-tasks.json", "utf8")).find(task => task.releaseGate === true);
  assert.ok(["next", "pending"].includes(releaseGateTask?.status), "The active release-gate task must remain open while browser evidence is incomplete");
  if (automatedOnly) console.log(`Local/browser final gate remains pending: ${detail}`);
  else throw new Error(`Local/browser release evidence is incomplete: ${detail}. Record real dated environment evidence before reporting GO.`);
} else {
  assert.match(readiness, /Local browser prototype release candidate \| \*\*GO\*\*/, "release report must be updated to GO after all local/browser evidence passes");
  console.log("Local/browser release candidate gate passed with complete dated browser evidence.");
}
