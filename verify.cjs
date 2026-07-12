const fs = require("fs");
const vm = require("vm");

const files = ["index.html", "style.css", "game-logic.js", "app.js", "serve.cjs", "manifest.webmanifest", "service-worker.js", "icon.svg"];
const missing = files.filter(file => !fs.existsSync(file));
if (missing.length) throw new Error(`Missing files: ${missing.join(", ")}`);

const combined = files.map(file => fs.readFileSync(file, "utf8")).join("\n");
if (!combined.includes("Pocket Potion Works") || !combined.includes("pocket-potion-works")) {
  throw new Error("Product identity is incomplete across the required files.");
}

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
if (!html.includes('<script src="game-logic.js"></script>')) throw new Error("Pure game logic must load before the browser adapter.");
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const queriedIds = [...app.matchAll(/querySelector\(["'`]#([A-Za-z0-9_-]+)["'`]\)/g)].map(match => match[1]);
const dynamicIds = new Set(["collectBrewButton"]);
const absentIds = [...new Set(queriedIds.filter(id => !ids.has(id) && !dynamicIds.has(id)))];
if (absentIds.length) throw new Error(`JavaScript references absent HTML IDs: ${absentIds.join(", ")}`);

JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
new vm.Script(app, { filename: "app.js" });
console.log(`Verification passed: ${files.length} required files, ${ids.size} UI IDs, product identity and syntax checks passed.`);
