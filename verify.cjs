const fs = require("fs");
const vm = require("vm");

const files = ["index.html", "style.css", "game-logic.js", "platform-adapters.js", "audio-feedback.js", "app.js", "serve.cjs", "manifest.webmanifest", "service-worker.js", "icon.svg", "ASSET_PROVENANCE.md"];
const missing = files.filter(file => !fs.existsSync(file));
if (missing.length) throw new Error(`Missing files: ${missing.join(", ")}`);

const combined = files.map(file => fs.readFileSync(file, "utf8")).join("\n");
if (!combined.includes("Pocket Potion Works") || !combined.includes("pocket-potion-works")) {
  throw new Error("Product identity is incomplete across the required files.");
}

const html = fs.readFileSync("index.html", "utf8");
const normalizedHtml = html.replace(/\r\n/g, "\n");
const app = fs.readFileSync("app.js", "utf8");
if (!app.includes("already been added to the Pantry")) throw new Error("Welcome Back must state that offline ingredients were already added to the Pantry.");
if (!app.includes('label: "Back to workshop", primary: true')) throw new Error("Welcome Back must use a non-claiming return action.");
if (app.includes('label: "Collect ingredients"')) throw new Error("Welcome Back must not offer a second ingredient collection step.");
if (!html.includes('<script src="game-logic.js"></script>')) throw new Error("Pure game logic must load before the browser adapter.");
if (!html.includes('<script src="platform-adapters.js"></script>')) throw new Error("Platform adapters must load before the browser adapter.");
if (!html.includes('<script src="audio-feedback.js"></script>')) throw new Error("Audio helpers must load before the browser adapter.");
if (!normalizedHtml.includes('game-logic.js"></script>\n    <script src="platform-adapters.js"></script>\n    <script src="audio-feedback.js"></script>\n    <script src="app.js')) throw new Error("Browser scripts must load in dependency order.");
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const queriedIds = [...app.matchAll(/querySelector\(["'`]#([A-Za-z0-9_-]+)["'`]\)/g)].map(match => match[1]);
const dynamicIds = new Set(["collectBrewButton"]);
const absentIds = [...new Set(queriedIds.filter(id => !ids.has(id) && !dynamicIds.has(id)))];
if (absentIds.length) throw new Error(`JavaScript references absent HTML IDs: ${absentIds.join(", ")}`);
if (!html.includes('id="brewStatusAnnouncement" role="status" aria-live="polite" aria-atomic="true"')) throw new Error("Brew transitions require one stable atomic live status node.");
for (const id of ["workshopNarrativeDelivery", "ordersNarrativeDelivery"]) if (!html.includes(`id="${id}" role="status" aria-live="polite" aria-atomic="true"`)) throw new Error("Narrative delivery surfaces require stable atomic live status nodes.");
if (!app.includes('fulfillOrder(Number(button.dataset.quickDeliver), "workshop")') || !app.includes('fulfillOrder(Number(button.dataset.order), "orders")')) throw new Error("Narrative delivery must retain its originating surface.");
if (!app.includes('Logic.orderAction(state, order)') || !app.includes('data-next') || !app.includes('function routeOrderAction(orderId)')) throw new Error("Ordinary not-ready orders must use the state-aware navigation route.");
if (!app.includes('function focusTarget(target)') || !app.includes('setDisclosure("recipes", true)')) throw new Error("Ordinary order guidance must retain Workshop target focus.");
if (app.includes('class="active-brew" aria-live=')) throw new Error("The per-second brew countdown must remain outside live regions.");

JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
new vm.Script(app, { filename: "app.js" });
console.log(`Verification passed: ${files.length} required files, ${ids.size} UI IDs, product identity and syntax checks passed.`);
