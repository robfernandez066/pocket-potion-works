"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveRequestPath, securityHeaders, mime, parseByteRange } = require("./serve.cjs");
const { MUSIC_TRACKS } = require("./audio-feedback.js");
const automatedOnly = process.argv.includes("--automated-only");

const runtimeFiles = ["index.html", "style.css", "content-data.js", "game-logic.js", "ui-render.js", "platform-adapters.js", "audio-feedback.js", "app.js", "manifest.webmanifest", "icon.svg", "service-worker.js"];
const runtimeAssets = ["assets/audio/bagpop.mp3", "assets/audio/brew-ready.mp3", "assets/audio/brew-start.mp3", "assets/audio/coin.mp3", "assets/audio/confirm.mp3", "assets/audio/gather.mp3", "assets/audio/levelup.ogg", "assets/audio/tap.ogg"];
const imageAssets = [
  "assets/images/ingredients/dewleaf.png",
  "assets/images/ingredients/dream-lavender.png",
  "assets/images/ingredients/frostmint.png",
  "assets/images/ingredients/mist-pearl.png",
  "assets/images/ingredients/mooshroom.png",
  "assets/images/ingredients/starshard.png",
  "assets/images/ingredients/sun-ember.png",
  "assets/images/misc/gather-satchel.png",
  "assets/images/misc/workshop-cat.png",
  "assets/images/misc/workshop-cauldron.png",
  "assets/images/villagers/mira-head.png",
  "assets/images/villagers/fern-head.webp",
  "assets/images/potions/aurora-nectar.png",
  "assets/images/potions/aurora-nectar-animated-12f.png",
  "assets/images/potions/bottled-sunrise.png",
  "assets/images/potions/clarity-elixir.png",
  "assets/images/potions/cloudbloom-tea.png",
  "assets/images/potions/dreamers-draught.png",
  "assets/images/potions/kindheart-cordial.png",
  "assets/images/potions/lantern-sip.png",
  "assets/images/potions/meadow-tonic.png",
  "assets/images/potions/moonmilk.png",
  "assets/images/potions/quietbell-tea.png",
  "assets/images/potions/starlight-philter.png",
  "assets/images/potions/wayfinder-cordial.png"
];
const streamedAssets = ["assets/audio/music1.mp3", "assets/audio/music2.mp3", "assets/audio/music3.mp3"];
const approvedMusic = [
  { file: "assets/audio/music1.mp3", bytes: 6031777, sha256: "3BDB1FEE54E177AF9C10EE1C837B16940F95FCD2DFD119B238F9E19C6266BFFC", cap: 6100000 },
  { file: "assets/audio/music2.mp3", bytes: 5547780, sha256: "6138EF693EA321E35B1747A1B7F1EB41A590E7F2EE33598E1FDFEB0B92A449A6", cap: 5600000 },
  { file: "assets/audio/music3.mp3", bytes: 5311424, sha256: "7E30FEE8E17B3F8F746AB521E88F7AF88D1D60D4D842EA72EC1A3BDB50274B36", cap: 5400000 },
];
assert.deepEqual([...MUSIC_TRACKS], streamedAssets, "music playlist and release asset inventory must match exactly");
const pagesWorkflow = fs.readFileSync(".github/workflows/pages.yml", "utf8");
const pagesArtifactStep = pagesWorkflow.match(/- name: Prepare playable artifact only([\s\S]*?)(?=\n      - name:|$)/)?.[1];
assert.ok(pagesArtifactStep, "GitHub Pages playable artifact step is missing");
const rootCopyCommand = pagesArtifactStep.match(/^\s*cp\s+(.+?)\s+_site\/$/m);
assert.ok(rootCopyCommand, "GitHub Pages playable artifact root copy command is missing");
const copiedRootRuntimeFiles = rootCopyCommand[1].trim().split(/\s+/);
for (const file of runtimeFiles) assert.ok(copiedRootRuntimeFiles.includes(file), `GitHub Pages artifact root copy is missing runtime file: ${file}`);
for (const file of streamedAssets) assert.ok(pagesArtifactStep.includes(file), `GitHub Pages artifact is missing streamed music: ${file}`);
assert.ok(pagesWorkflow.includes("cp -r assets/images _site/assets/"), "GitHub Pages must copy the complete local image library");
const miraSource = "assets/source/villagers/mira_head-256.png";
const miraRuntime = "assets/images/villagers/mira-head.png";
const fernSource = "assets/source/villagers/fern_head-256.png";
const fernRuntime = "assets/images/villagers/fern-head.webp";
assert.ok(fs.existsSync(miraSource), "Mira source artwork must be preserved outside deployed images");
assert.ok(fs.existsSync(fernSource), "Fern source artwork must be preserved outside deployed images");
assert.ok(!fs.existsSync("assets/images/villagers/mira_head.png"), "Mira source artwork must not remain in deployed images");
assert.ok(!fs.existsSync("assets/images/villagers/fern_head.png"), "Fern source artwork must not remain in deployed images");
assert.ok(!pagesWorkflow.includes("assets/source"), "GitHub Pages artifact must not copy source artwork");
const releaseDocs = ["RELEASE_READINESS.md", "PRIVACY_DISCLOSURE_DRAFT.md", "DEVICE_TEST_MATRIX.md", "ROLLBACK_PLAN.md", "ASSET_PROVENANCE.md", "PLATFORM_ADAPTERS.md", "GAMEPLAY_ROADMAP.md"];
for (const file of [...runtimeFiles, ...runtimeAssets, ...streamedAssets, ...imageAssets, ...releaseDocs, "release-budgets.json", "release-browser-evidence.json", "fixtures/saves/legacy-pre-release-v1.json", "fixtures/saves/future-version-v9.json", "fixtures/saves/future-version-v10.json", "fixtures/rollback/game-save-reader-v1.cjs", "fixtures/rollback/game-save-reader-v2.cjs", "fixtures/rollback/game-save-reader-v3.cjs", "fixtures/rollback/game-save-reader-v4.cjs", "fixtures/rollback/game-save-reader-v5.cjs", "fixtures/rollback/game-save-reader-v6.cjs", "fixtures/rollback/game-save-reader-v7.cjs", "fixtures/rollback/game-save-reader-v8.cjs"]) assert.ok(fs.existsSync(file), `required release file missing: ${file}`);

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const miraSourcePng = fs.readFileSync(miraSource);
assert.ok(miraSourcePng.subarray(0, 8).equals(pngSignature), "Mira source artwork must remain a PNG");
assert.deepEqual([miraSourcePng.readUInt32BE(16), miraSourcePng.readUInt32BE(20)], [256, 256], "Mira source artwork must remain 256x256");
assert.equal(miraSourcePng[25], 6, "Mira source artwork must retain transparency");
const fernSourcePng = fs.readFileSync(fernSource);
assert.ok(fernSourcePng.subarray(0, 8).equals(pngSignature), "Fern source artwork must remain a PNG");
assert.deepEqual([fernSourcePng.readUInt32BE(16), fernSourcePng.readUInt32BE(20)], [256, 256], "Fern source artwork must remain 256x256");
assert.equal(fernSourcePng[25], 6, "Fern source artwork must retain transparency");
for (const file of imageAssets) {
  if (file === fernRuntime) {
    const webp = fs.readFileSync(file);
    assert.ok(webp.subarray(0, 4).equals(Buffer.from("RIFF")) && webp.subarray(8, 12).equals(Buffer.from("WEBP")) && webp.subarray(12, 16).equals(Buffer.from("VP8X")), "Fern runtime portrait must be a VP8X WebP");
    assert.deepEqual([webp.readUIntLE(24, 3) + 1, webp.readUIntLE(27, 3) + 1], [96, 96], "Fern runtime portrait must be 96x96");
    assert.ok(webp[20] & 0x10, "Fern runtime portrait must retain transparency");
    continue;
  }
  const png = fs.readFileSync(file);
  assert.ok(png.subarray(0, 8).equals(pngSignature), `${file} is not a valid PNG file`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (file.endsWith("aurora-nectar-animated-12f.png")) {
    assert.deepEqual([width, height], [1536, 128], "Aurora animation must remain a 12-frame 128x128 horizontal sheet");
  } else {
    assert.equal(width, height, `${file} must be square`);
    assert.ok([128, 256].includes(width), `${file} must be 128x128 or 256x256`);
  }
  if (file === miraRuntime) assert.equal(png[25], 6, "Mira runtime portrait must retain transparency");
}

const text = Object.fromEntries(runtimeFiles.map(file => [file, fs.readFileSync(file, "utf8")]));
for (const file of imageAssets) assert.ok(text["style.css"].includes(file), `approved sprite is not wired into the stylesheet: ${file}`);
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
for (const file of imageAssets) assert.ok(swShell.includes(`./${file}`), `service worker cache is missing approved sprite ${file}`);
assert.ok(!swShell.includes(`./${miraSource}`), "service worker must not cache Mira source artwork");
assert.ok(!swShell.includes(`./${fernSource}`), "service worker must not cache Fern source artwork");
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

const allReleaseFiles = fs.readdirSync(".").filter(file => fs.statSync(file).isFile());
const forbiddenProduct = new RegExp(["daily", "detective"].join("\\s+"), "i");
for (const file of allReleaseFiles) assert.doesNotMatch(fs.readFileSync(file, "utf8"), forbiddenProduct, `forbidden product reference found in ${file}`);

assert.match(text["game-logic.js"], /const SAVE_VERSION = 9/);
assert.match(text["service-worker.js"], /const CACHE = `\$\{CACHE_PREFIX\}v67`/);
assert.match(text["ui-render.js"], /globalThis\.PPWUI = Object\.freeze\(/, "UI module must expose its frozen browser API");
assert.doesNotMatch(text["ui-render.js"], /\b(?:document|window|require|module|setTimeout|setInterval|Date|Math\.random|localStorage|addEventListener|querySelector)\b/, "UI module must remain dependency-free presentation code");
assert.match(text["app.js"], /const UI = window\.PPWUI;/, "browser adapter must require the UI presentation module");
assert.match(text["audio-feedback.js"], /function effectsOutputGain\(volume\)/);
assert.match(text["audio-feedback.js"], /const SYNTH_OUTPUT_BOOST = 8/);
assert.match(text["style.css"], /workshop-scene:not\(\.is-idle\) \.bubble \{ display: block !important; animation: none !important; opacity: \.82; \}/);
assert.match(text["index.html"], /id="updateBanner"[^>]+aria-label="New update available\. Tap here to restart\."/);
assert.match(text["index.html"], /id="updateAnnouncement"[^>]+role="status"[^>]+aria-live="polite"/);
assert.match(text["app.js"], /addEventListener\("controllerchange", showUpdate\)/);
assert.match(text["app.js"], /registration\.update\(\)/);
assert.match(text["app.js"], /location\.reload\(\)/);
assert.match(text["index.html"], /The first five add 10% each; later gains taper toward a 2\.5x Stardust order-coin multiplier/);
assert.match(text["app.js"], /The first five add 10% each; later gains taper toward a 2\.5x Stardust order-coin multiplier/);
assert.match(text["app.js"], /COSMETICS\.filter\(cosmetic => cosmetic\.id !== "dawnthread" \|\| state\.stats\.prestiges > 0\)/, "Dawnthread must remain absent from the Journal before the first rebirth");
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
assert.equal(budgets.totalRuntimeBytes, 24000000, "Task 43 must keep the fixed total runtime budget");
for (const music of approvedMusic) {
  const audio = fs.readFileSync(music.file);
  const bytes = audio.length;
  const sha256 = require("node:crypto").createHash("sha256").update(audio).digest("hex").toUpperCase();
  assert.equal(bytes, music.bytes, `${music.file} must retain its approved Task 42 byte size`);
  assert.equal(sha256, music.sha256, `${music.file} must retain its approved Task 42 hash`);
  let cursor = 0;
  let frameCount = 0;
  while (cursor + 4 <= audio.length) {
    assert.equal(audio[cursor], 0xff, `${music.file} frame ${frameCount} must retain the MPEG sync word`);
    assert.equal(audio[cursor + 1] & 0xfe, 0xfa, `${music.file} must be MPEG-1 Layer III`);
    assert.equal(audio[cursor + 2] >> 4, 11, `${music.file} must be constant 192 kbps`);
    assert.equal((audio[cursor + 2] >> 2) & 3, 0, `${music.file} must use 44.1 kHz`);
    assert.equal(audio[cursor + 3] >> 6, 1, `${music.file} must use joint stereo`);
    const frameBytes = Math.floor(144 * 192000 / 44100) + ((audio[cursor + 2] >> 1) & 1);
    assert.ok(cursor + frameBytes <= audio.length, `${music.file} must not contain a truncated MPEG frame`);
    cursor += frameBytes;
    frameCount += 1;
  }
  assert.ok(frameCount > 0 && cursor === audio.length, `${music.file} must contain only complete constant-192 kbps MPEG frames`);
  assert.equal(budgets.files[music.file], music.cap, `${music.file} must retain its lowered Task 43 cap`);
}
assert.equal(budgets.files[miraRuntime], 24000, "Mira runtime portrait must keep its fixed 24 KB cap");
assert.equal(budgets.files[fernRuntime], 8000, "Fern runtime portrait must keep its fixed 8 KB cap");
assert.ok(!Object.hasOwn(budgets.files, miraSource), "Mira source artwork must not count toward runtime budgets");
assert.ok(!Object.hasOwn(budgets.files, fernSource), "Fern source artwork must not count toward runtime budgets");
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
assert.equal(total, 18370432, "Task 44 runtime inventory must match the approved exact total");
assert.equal(budgets.totalRuntimeBytes - total, 5629568, "Task 44 runtime inventory must retain the approved headroom");
assert.ok(budgets.totalRuntimeBytes - total >= 2000000, "current runtime headroom must already satisfy the no-further-compression threshold");
assert.ok(!swShell.some(file => streamedAssets.includes(file.slice(2))), "background music must remain streamed instead of entering the offline shell");
assert.doesNotMatch(text["service-worker.js"], /v65/, "Task 43 must rotate the cache identity exactly once");
const task38RuntimeBytes = 23993911;
assert.ok(normalizedReleaseBytes("app.js") <= 72000, "app.js must retain Task 39 implementation headroom");
assert.ok(normalizedReleaseBytes("ui-render.js") <= 16000, "ui-render.js must remain within its fixed presentation cap");
assert.ok(total - task38RuntimeBytes <= 1500, `Task 39 runtime overhead is ${total - task38RuntimeBytes} bytes, above the 1500-byte limit`);

const evidence = JSON.parse(fs.readFileSync("release-browser-evidence.json", "utf8"));
assert.equal(evidence.schemaVersion, 1);
assert.equal(evidence.releaseTarget, "local-browser-release-candidate");
const runtimeCache = text["service-worker.js"].match(/const CACHE = `\$\{CACHE_PREFIX\}(v\d+)`/);
assert.ok(runtimeCache, "service worker cache identity is missing");
assert.equal(evidence.runtimeCache, `ppw-shell-${runtimeCache[1]}`, "manual evidence must identify the current runtime cache");
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
assert.match(readiness, /Installable production PWA \| \*\*NO-GO\*\*/);
assert.match(readiness, /Native app stores \| \*\*NO-GO\*\*/);
assert.match(readiness, /Production monetization, analytics, accounts, or cloud \| \*\*NO-GO\*\*/);
for (const phrase of ["service-worker update", "screen-reader", "iOS/iPadOS", "Android", "Native-wrapper"]) assert.ok(matrix.includes(phrase), `device matrix is missing separately blocked coverage: ${phrase}`);
console.log(`Automated release checks passed: ${runtimeFiles.length + runtimeAssets.length + streamedAssets.length} runtime files, ${releaseDocs.length} release documents, ${total}/${budgets.totalRuntimeBytes} runtime bytes.`);
if (incomplete.length) {
  const detail = incomplete.map(check => `${check.id}=${check.status}`).join(", ");
  assert.match(readiness, /Broader public promotion \| \*\*ON HOLD\*\*/);
  const releaseGateTask = JSON.parse(fs.readFileSync("coder-tasks.json", "utf8")).find(task => task.releaseGate === true);
  assert.ok(["next", "pending"].includes(releaseGateTask?.status), "The active release-gate task must remain open while browser evidence is incomplete");
  if (automatedOnly) console.log(`Local/browser final gate remains pending: ${detail}`);
  else throw new Error(`Local/browser release evidence is incomplete: ${detail}. Record real dated environment evidence before reporting GO.`);
} else {
  assert.match(readiness, /Broader public promotion \| \*\*GO\*\*/, "release report must be updated to GO after all local/browser evidence passes");
  console.log("Local/browser release candidate gate passed with complete dated browser evidence.");
}
