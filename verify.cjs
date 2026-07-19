const fs = require("fs");
const vm = require("vm");
const assert = require("node:assert/strict");

const files = ["index.html", "style.css", "relationship-content.js", "content-data.js", "game-logic.js", "ui-render.js", "platform-adapters.js", "audio-feedback.js", "app.js", "serve.cjs", "manifest.webmanifest", "service-worker.js", "icon.svg", "ASSET_PROVENANCE.md"];
const missing = files.filter(file => !fs.existsSync(file));
if (missing.length) throw new Error(`Missing files: ${missing.join(", ")}`);

const combined = files.map(file => fs.readFileSync(file, "utf8")).join("\n");
if (!combined.includes("Pocket Potion Works") || !combined.includes("pocket-potion-works")) {
  throw new Error("Product identity is incomplete across the required files.");
}

const html = fs.readFileSync("index.html", "utf8");
const normalizedHtml = html.replace(/\r\n/g, "\n");
const relationshipSource = fs.readFileSync("relationship-content.js", "utf8");
const content = fs.readFileSync("content-data.js", "utf8");
const uiSource = fs.readFileSync("ui-render.js", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const style = fs.readFileSync("style.css", "utf8");
const offlinePath = app.slice(app.indexOf("function grantOfflineProgress"), app.indexOf("const lifecycle = new Platform.LifecycleCoordinator"));
if (!offlinePath.includes("The ingredients have been added to the Pantry.")) throw new Error("Welcome Back must state the exact factual Pantry confirmation.");
if (!offlinePath.includes("WORKSHOP DIARY") || !offlinePath.includes("UI.offlineDiaryEntry(elapsed, gained)")) throw new Error("Welcome Back must include the deterministic Workshop Diary entry.");
if (offlinePath.includes("already") || offlinePath.includes("Your helpers gathered")) throw new Error("Welcome Back must remove the retired helper wording.");
if (!app.includes('label: "Back to workshop", primary: true')) throw new Error("Welcome Back must use a non-claiming return action.");
if (offlinePath.includes('label: "Collect ingredients"')) throw new Error("Welcome Back must not offer a second ingredient collection step.");
if (!offlinePath.includes("if (elapsed < 20) return;") || !offlinePath.includes("if (gained > 0)")) throw new Error("Offline modal behavior must retain its elapsed and positive-gain gates.");
if (!html.includes('<script src="relationship-content.js"></script>')) throw new Error("Relationship content must load before the primary content catalog.");
if (!html.includes('<script src="content-data.js"></script>')) throw new Error("Content data must load before pure game logic.");
if (!html.includes('<script src="game-logic.js"></script>')) throw new Error("Pure game logic must load before the browser adapter.");
if (!html.includes('<script src="ui-render.js"></script>')) throw new Error("UI helpers must load before the browser adapter.");
if (!html.includes('<script src="platform-adapters.js"></script>')) throw new Error("Platform adapters must load before the browser adapter.");
if (!html.includes('<script src="audio-feedback.js"></script>')) throw new Error("Audio helpers must load before the browser adapter.");
if (!normalizedHtml.includes('relationship-content.js"></script>\n    <script src="content-data.js"></script>\n    <script src="game-logic.js"></script>\n    <script src="ui-render.js"></script>\n    <script src="platform-adapters.js"></script>\n    <script src="audio-feedback.js"></script>\n    <script src="app.js')) throw new Error("Browser scripts must load in dependency order.");
const relationshipSandbox = {};
vm.runInNewContext(relationshipSource, relationshipSandbox, { filename: "relationship-content.js" });
const relationship = relationshipSandbox.PPWRelationshipContent;
if (!relationship || !Object.isFrozen(relationship) || !Object.isFrozen(relationship.DELIVERY_NARRATIVE_PILOTS) || relationship.DELIVERY_NARRATIVE_PILOTS.some(entry => !Object.isFrozen(entry)) || Object.keys(relationshipSandbox).filter(key => key.startsWith("PPW")).join(",") !== "PPWRelationshipContent") throw new Error("Relationship content must expose exactly one deeply frozen browser global.");
const relationshipImplementation = relationshipSource.slice(0, relationshipSource.indexOf("const DELIVERY_NARRATIVE_PILOTS"));
if (/\brequire\s*\(|\bdocument\s*(?:\.|\[)|\bwindow\s*(?:\.|\[)|\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage)\s*\(/.test(relationshipImplementation)) throw new Error("Relationship content must remain dependency-free offline data.");
if (!content.includes('require("./relationship-content.js")') || content.includes("The early list")) throw new Error("The primary content catalog must consume the extracted relationship module without a fallback copy.");
try { vm.runInNewContext(content, {}, { filename: "content-data.js" }); throw new Error("Content data unexpectedly loaded without relationship content."); } catch (error) { if (!/relationship content is unavailable/.test(error.message)) throw error; }
const uiSandbox = {};
vm.runInNewContext(uiSource, uiSandbox, { filename: "ui-render.js" });
const ui = uiSandbox.PPWUI;
if (!ui || !Object.isFrozen(ui) || Object.keys(uiSandbox).filter(key => key.startsWith("PPW")).join(",") !== "PPWUI") throw new Error("UI helpers must expose exactly one frozen browser global.");
if (/\b(?:document|window|require|module|setTimeout|setInterval|Date|Math\.random|localStorage|addEventListener|querySelector)\b/.test(uiSource)) throw new Error("UI helpers must remain dependency-free pure presentation code.");
const diaryCopy = [
  "A pair of button-eyed sprites gathered {gained} ingredients and gave the Pantry a solemn bow.",
  "A floating vial glided in with {gained} ingredients, somehow without spilling a drop.",
  "Three enchanted bottles organized {gained} ingredients into a very proper procession.",
  "A patient little broom swept {gained} ingredients into a tidy waiting pile.",
];
const diaryExpected = [
  [0, diaryCopy[0].replace("{gained}", "14")],
  [1_799, diaryCopy[0].replace("{gained}", "14")],
  [1_800, diaryCopy[1].replace("{gained}", "14")],
  [5_399, diaryCopy[1].replace("{gained}", "14")],
  [5_400, diaryCopy[2].replace("{gained}", "14")],
  [10_799, diaryCopy[2].replace("{gained}", "14")],
  [10_800, diaryCopy[3].replace("{gained}", "14")],
  [14_400, diaryCopy[3].replace("{gained}", "14")],
];
for (const [elapsed, expected] of diaryExpected) assert.equal(ui.offlineDiaryEntry(elapsed, 14), expected, `diary boundary ${elapsed} must remain exact`);
assert.equal(ui.offlineDiaryEntry(14_401, 93), diaryCopy[3].replace("{gained}", "93"), "over-cap elapsed must use the four-hour bucket");
for (const malformed of [-1, Infinity, NaN, "not-a-duration", {}, null]) assert.equal(ui.offlineDiaryEntry(malformed, 14), diaryCopy[0].replace("{gained}", "14"), "malformed elapsed must safely use the first bucket");
for (const gained of [0, -1, NaN, Infinity, null, "not-a-count"]) assert.equal(ui.offlineDiaryEntry(1_800, gained), null, "non-positive or malformed gained values must stay silent");
for (const [elapsed, gained] of [[15 * 60, 14], [60 * 60, 36], [120 * 60, 54], [4 * 60 * 60, 93]]) assert.equal(ui.offlineDiaryEntry(elapsed, gained), diaryCopy[elapsed < 1_800 ? 0 : elapsed < 5_400 ? 1 : elapsed < 10_800 ? 2 : 3].replace("{gained}", String(gained)), `diary count ${elapsed} must interpolate exactly`);
if (Object.keys(ui).sort().join(",") !== ["activeBrewMarkup", "commissionChoicesMarkup", "customerAvatarMarkup", "formatNumber", "idleBrewMarkup", "ingredientCards", "narrativeDeliveryMarkup", "offlineDiaryEntry", "orderListMarkup", "portraitMarkup", "readyDeliverStrip", "recipeListMarkup", "upgradeListMarkup"].sort().join(",")) throw new Error("PPWUI must expose only the approved selector addition.");
if (!app.includes('const UI = window.PPWUI;') || !app.includes('PPWUI missing; load ui-render.js.')) throw new Error("The browser adapter must fail clearly when UI helpers are unavailable.");
if (/const (?:INGREDIENT_SPRITES|POTION_SPRITES|PORTRAITS)\b|function (?:ingredientCostText|portraitMarkup|potionSpriteMarkup)\b/.test(app)) throw new Error("Moved UI helper definitions must not be duplicated in app.js.");
if (!ui.activeBrewMarkup({ id: "tonic", icon: "⚗", color: "#123", name: "Meadow Tonic" }).includes('data-sprite="tonic"')) throw new Error("Potion sprite presentation output changed.");
if (!ui.ingredientCards({ herb: { name: "Dewleaf", icon: "☘", color: "#dcebd8", unlock: 1 } }, 1, null, { herb: 7 }).includes('data-ingredient-sprite="herb"') || !ui.ingredientCards({ herb: { name: "Dewleaf", icon: "☘", color: "#dcebd8", unlock: 1 } }, 1, null, { herb: 7 }).includes("<strong>7</strong>")) throw new Error("Ingredient-card presentation output changed.");
if (ui.portraitMarkup("customer-0") !== '<span class="villager-portrait mira-portrait" aria-hidden="true"></span>' || ui.portraitMarkup("customer-6") !== '<span class="villager-portrait fern-portrait" aria-hidden="true"></span>' || !ui.customerAvatarMarkup("customer-1", "🧙", "#123").includes(">🧙</span>")) throw new Error("Portrait and emoji fallback presentation changed.");
if (!ui.narrativeDeliveryMarkup({ customerId: "customer-6", kicker: "FERN", title: "The seed that would not wake", body: "Body", footer: "Footer" }, [["", ""], ["Old Moss", "ðŸ§™", "", "#123"], [], [], [], [], ["Fern", "â€", "", "#456"]]).includes("fern-portrait") || !ui.narrativeDeliveryMarkup({ customerId: "customer-1", kicker: "MOSS", title: "Title", body: "Body", footer: "Footer" }, [["", ""], ["Old Moss", "ðŸ§™", "", "#123"]]).includes("ðŸ§™")) throw new Error("Narrative-card portrait and emoji fallback selection changed.");
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const queriedIds = [...app.matchAll(/querySelector\(["'`]#([A-Za-z0-9_-]+)["'`]\)/g)].map(match => match[1]);
const dynamicIds = new Set(["collectBrewButton"]);
const absentIds = [...new Set(queriedIds.filter(id => !ids.has(id) && !dynamicIds.has(id)))];
if (absentIds.length) throw new Error(`JavaScript references absent HTML IDs: ${absentIds.join(", ")}`);
const ambientTouches = [
  ["aB", "b", "Tap the bottle shelf", "A bottle gives a tiny clink."],
  ["aH", "h", "Tap the hanging herbs", "The hanging herbs give a little wave."],
  ["aC", "c", "Tap the workshop cat", "The workshop cat gives a slow blink."],
];
for (const [id, touch, name, copy] of ambientTouches) {
  assert.ok(html.includes(`<button id="${id}" aria-label="${name}"></button>`), `${name} needs its exact native target`);
  assert.equal((html.match(new RegExp(`data-x="${touch}"`, "g")) || []).length, 1, `${name} needs its existing decorative anchor`);
  assert.ok(app.includes(copy), `${name} needs its approved acknowledgement copy`);
}
assert.equal((html.match(/id="aS" role="status"/g) || []).length, 1, "Ambient touches need one local acknowledgement region");
const ambientTouchStart = app.indexOf("const AMBIENT_WORKSHOP_TOUCH_COPY");
const ambientTouchEnd = app.indexOf("let gameplaySaveWritesBlocked", ambientTouchStart);
const ambientTouchPath = app.slice(ambientTouchStart, ambientTouchEnd);
assert.ok(ambientTouchStart >= 0 && ambientTouchEnd > ambientTouchStart, "Ambient workshop behavior must stay in its local app seam");
assert.ok(ambientTouchPath.includes("let activeWorkshopTouch = null;") && ambientTouchPath.includes("let workshopTouchTimeout = null;"), "Ambient touches need one transient active value and one timeout");
assert.ok(ambientTouchPath.includes("if (workshopTouchTimeout) clearTimeout(workshopTouchTimeout);") && ambientTouchPath.includes("clearWorkshopTouch();") && ambientTouchPath.includes("setTimeout(clearWorkshopTouch, 1800)"), "Ambient acknowledgement must replace, restart for 1800ms, and clean up");
assert.ok(ambientTouchPath.includes("classList.remove(\"i\")") && ambientTouchPath.includes('$("#aS").textContent = "";'), "Ambient cleanup must clear both decoration and acknowledgement");
assert.ok(ambientTouchPath.includes('target.focus({ preventScroll: true });'), "Ambient activation must retain focus on its pressed target");
assert.doesNotMatch(ambientTouchPath, /\b(?:Logic|state|save|storage|analytics|reward|sound|audio|music|toast|feedback|localStorage|sessionStorage)\b/i, "Ambient handler must not use gameplay, persistence, analytics, reward, or audio paths");
assert.ok(app.includes('!event.target.closest?.("#aB,#aH,#aC,#stirPicturedCauldronButton,#stirCauldronButton")') && app.includes('!button.matches("#aB,#aH,#aC,#stirPicturedCauldronButton,#stirCauldronButton")'), "Ambient and stirring targets must bypass generic audio activation and UI-tap sound");
for (const selector of ["#aB{left:24px;top:22px;width:132px;height:46px}", "#aH{right:40px;top:10px;width:68px;height:52px}", "#aC{right:20px;bottom:28px;width:78px;height:88px}"]) assert.ok(style.includes(selector), "Ambient hit areas must retain their non-overlapping Workshop placement");
assert.ok(style.includes("#aB,#aH,#aC{position:absolute"), "Ambient controls must retain their absolute hit-area layout");
assert.ok(style.includes("[data-x=b].i") && style.includes("[data-x=h].i") && style.includes("[data-x=c].i"), "Ambient touches need decoration treatment");
assert.ok(style.includes("[data-x].i{animation:none!important"), "Reduced motion must use stationary ambient highlights");
const stirControls = [["stirPicturedCauldronButton", "Stir the pictured cauldron"], ["stirCauldronButton", "Stir cauldron"]];
for (const [id, name] of stirControls) assert.ok(html.includes(id === "stirCauldronButton" ? `id="${id}" disabled>${name}</button>` : `id="${id}" aria-label="${name}" disabled></button>`), `${name} needs its exact native control`);
assert.equal((html.match(/id="cauldronStirStatus" role="status" aria-live="polite" aria-atomic="true"/g) || []).length, 1, "Cauldron stirring needs one local polite acknowledgement region");
const stirStart = app.indexOf("const CAULDRON_STIR_COPY");
const stirEnd = app.indexOf("function goToTutorialTarget", stirStart);
const stirPath = app.slice(stirStart, stirEnd);
assert.ok(stirStart >= 0 && stirEnd > stirStart, "Cauldron stirring must keep one module-local transient seam");
assert.ok(stirPath.includes('const CAULDRON_STIR_COPY = "You give the cauldron a gentle stir. Nothing seems to happen, but it felt good.";') && stirPath.includes("setTimeout(clearCauldronStir, 1800)"), "Cauldron stirring must use the exact replacement acknowledgement and one replacing 1800ms lifetime");
assert.ok(stirPath.includes("state.brew") && stirPath.includes('activeView() === "workshop"') && stirPath.includes("!view.hidden") && stirPath.includes("!scene.inert") && stirPath.includes("!$(\".game-shell\").inert"), "Cauldron stirring must be enabled only for an available Workshop brew");
assert.ok(stirPath.includes("clearTimeout(cauldronStirTimeout)") && stirPath.includes('classList.remove("is-stirring")') && stirPath.includes('$("#cauldronStirStatus").textContent = ""'), "Cauldron stirring must replace and fully clean up its transient response");
assert.ok(stirPath.includes('requestAnimationFrame(() => $(".workshop-scene").classList.add("is-stirring"))') && !stirPath.includes("keydown") && !stirPath.includes(".focus"), "Cauldron stirring must restart its native-button response without changing focus or custom keyboard handling");
assert.doesNotMatch(stirPath, /\b(?:Logic|save|storage|sound|audio|music|toast|feedback|reward|analytics|endsAt|durationMs)\b/i, "Cauldron stirring must not call gameplay, save, timing, audio, reward, or analytics paths");
for (const selector of [".stir-pictured-cauldron-button{position:absolute;z-index:3;left:calc(50% - 29px);top:92px;width:58px;height:44px", ".stir-cauldron-button{position:absolute;z-index:4;left:10px;top:80px;width:84px;min-height:44px"]) assert.ok(style.includes(selector), "Cauldron stirring controls must retain collision-free 44px Workshop geometry");
assert.ok(style.includes("animation:cauldron-stir-rock 720ms") && style.includes("animation:cauldron-stir-swirl 720ms") && style.includes(".workshop-scene.is-stirring .cauldron{animation:none!important"), "Cauldron stirring needs a 720ms motion response and stationary reduced-motion fallback");
if (!html.includes('id="brewStatusAnnouncement" role="status" aria-live="polite" aria-atomic="true"')) throw new Error("Brew transitions require one stable atomic live status node.");
for (const id of ["workshopNarrativeDelivery", "ordersNarrativeDelivery"]) if (!html.includes(`id="${id}" role="status" aria-live="polite" aria-atomic="true"`)) throw new Error("Narrative delivery surfaces require stable atomic live status nodes.");
if (!html.includes('id="reservedStoryKicker"') || !app.includes("Logic.reservedStoryTracker(state)")) throw new Error("The reserved-story tracker must support After the Stars and The Village Loaf through one surface.");
if (!uiSource.includes("Village Chapter") || !fs.readFileSync("style.css", "utf8").includes('data-cosmetic="firstlight"')) throw new Error("The Village Loaf ribbon and Firstlight Bakery look must remain wired.");
if (!app.includes('fulfillOrder(Number(button.dataset.quickDeliver), "workshop")') || !app.includes('fulfillOrder(Number(button.dataset.order), "orders")')) throw new Error("Narrative delivery must retain its originating surface.");
if (!app.includes('Logic.orderAction(state, order)') || !app.includes('data-next') || !app.includes('function routeOrderAction(orderId)')) throw new Error("Ordinary not-ready orders must use the state-aware navigation route.");
if (!app.includes('function focusTarget(target)') || !app.includes('setDisclosure("recipes", true)')) throw new Error("Ordinary order guidance must retain Workshop target focus.");
const miraRuntime = "assets/images/villagers/mira-head.png";
const miraSource = "assets/source/villagers/mira_head-256.png";
const fernRuntime = "assets/images/villagers/fern-head.webp";
const fernSource = "assets/source/villagers/fern_head-256.png";
if (!uiSource.includes('{ "customer-0": "mira", "customer-6": "fern" }') || (style.match(new RegExp(miraRuntime, "g")) || []).length !== 1 || (style.match(new RegExp(fernRuntime.replace(".", "\\."), "g")) || []).length !== 1 || !uiSource.includes("portraitMarkup(id) || avatar")) throw new Error("Exactly Mira and Fern must use the shared portrait seam while other villagers keep emoji fallback avatars.");
const ordersPath = app.slice(app.indexOf("function renderOrders()"), app.indexOf("function focusTarget"));
const requestsPath = app.slice(app.indexOf("function showSpecialRequestChooser"), app.indexOf("function renderWeekly"));
const journalPath = app.slice(app.indexOf("function renderJournal()"), app.indexOf("function claimJournalEntry"));
if (!ordersPath.includes("UI.orderListMarkup") || !requestsPath.includes("UI.commissionChoicesMarkup") || !journalPath.includes("UI.customerAvatarMarkup(customerId, customer[1], customer[3])")) throw new Error("Illustrated villagers must use the shared avatar seam on order, request, and Journal surfaces.");
const narrativePath = app.slice(app.indexOf("function renderNarrativeDelivery()"), app.indexOf("function chooseCommission"));
if (!narrativePath.includes("UI.narrativeDeliveryMarkup(detail, CUSTOMERS)") || !style.includes(".narrative-delivery-card:has(> :is(.villager-portrait,.customer-avatar))")) throw new Error("Narrative cards must use the generic mapped portrait and emoji fallback treatment.");
const chapterPayoffStart = app.indexOf("function showChapterPayoff(result, surface)");
const chapterPayoffEnd = app.indexOf("function openModal(", chapterPayoffStart);
const chapterPayoffPath = app.slice(chapterPayoffStart, chapterPayoffEnd);
if ((content.match(/payoff: Object\.freeze\(/g) || []).length !== 3 || chapterPayoffStart < 0 || chapterPayoffEnd < 0 || !app.includes("if (result.chapter) showChapterPayoff(result, surface);")) throw new Error("All three authored chapter payoffs must use the surface-aware modal acknowledgement path.");
for (const field of ["kicker", "title", "body", "footer"]) if (!chapterPayoffPath.includes(`result.narrative.${field}`)) throw new Error(`Chapter payoff modal must present its authored ${field}.`);
if (chapterPayoffPath.includes("setTimeout") || chapterPayoffPath.includes("beginCompletionState")) throw new Error("Chapter payoff acknowledgement must not auto-dismiss.");
if (!app.includes('if (result.narrative && !result.chapter) showNarrativeDelivery(surface, result.narrative, orderId);')) throw new Error("Non-chapter narrative behavior must retain its originating acknowledgement-controlled surface.");
if (!app.includes("narrativeWorkshop: [], narrativeOrders: []") || !narrativePath.includes("const narrative = queue[0] || null") || !narrativePath.includes("queue.shift()") || !narrativePath.includes('focusTarget(document.querySelector(`#${surface.toLowerCase()}NarrativeDelivery [data-dismiss-narrative]`));')) throw new Error("Relationship acknowledgements must keep independent FIFO surface queues and advance focus before restoring gameplay actions.");
const chapterClose = chapterPayoffPath.indexOf("closeModal();");
const chapterOrdersView = chapterPayoffPath.indexOf('switchView("orders")');
const chapterTarget = chapterPayoffPath.indexOf(".order-card.is-chapter");
if (!app.includes('if (result.chapter) showChapterPayoff(result, surface);\n  else if (restoreReservedFocus)') || !chapterPayoffPath.includes('"Continue the chapter"') || !(chapterClose < chapterOrdersView && chapterOrdersView < chapterTarget)) throw new Error("Continue must close the modal, open Orders, then focus the next chapter target.");
if (!chapterPayoffPath.includes("lastFocus = $(surface === \"orders\" ? \"#ordersView h1\" : '[data-nav=\"workshop\"]');") || !chapterPayoffPath.includes('if (surface === "orders") lastFocus.tabIndex = -1;')) throw new Error("Chapter dismissal must return to the Orders heading or a visible Workshop control.");
if (!chapterPayoffPath.includes('"View Workshop Looks"') || !chapterPayoffPath.includes('switchView("journal")') || !chapterPayoffPath.includes('button[data-cosmetic="firstlight"]') || !app.includes('focusTarget($(`button[data-cosmetic="${cosmeticId}"]`));')) throw new Error("The final chapter action and Workshop Look selections must retain focus on Firstlight Bakery.");
if (!chapterPayoffPath.includes('icon: UI.portraitMarkup("customer-0")')) throw new Error("Every Village Chapter payoff must use the shared Mira portrait.");
const modalPath = app.slice(app.indexOf("function openModal({"), app.indexOf("function closeModal()"));
if (!modalPath.includes("modalIcon.innerHTML = icon;") || !modalPath.includes('modalIcon.classList.toggle("is-villager-portrait", icon.includes("mira-portrait"));') || modalPath.includes("fern")) throw new Error("Only Mira's acknowledgement-controlled chapter modal may use a portrait.");
const worker = fs.readFileSync("service-worker.js", "utf8");
const budgets = JSON.parse(fs.readFileSync("release-budgets.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/pages.yml", "utf8");
if (!fs.existsSync(miraSource) || !fs.existsSync(fernSource) || fs.existsSync("assets/images/villagers/mira_head.png") || fs.existsSync("assets/images/villagers/fern_head.png") || !worker.includes(`./${miraRuntime}`) || !worker.includes(`./${fernRuntime}`) || worker.includes(miraSource) || worker.includes(fernSource) || workflow.includes("assets/source") || budgets.files[miraRuntime] !== 24000 || budgets.files[fernRuntime] !== 8000 || Object.hasOwn(budgets.files, miraSource) || Object.hasOwn(budgets.files, fernSource)) throw new Error("Only runtime portraits must be budgeted, cached, and deployed without shipping source artwork.");
if (app.includes('class="active-brew" aria-live=')) throw new Error("The per-second brew countdown must remain outside live regions.");

JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
new vm.Script(relationshipSource, { filename: "relationship-content.js" });
new vm.Script(content, { filename: "content-data.js" });
new vm.Script(uiSource, { filename: "ui-render.js" });
new vm.Script(app, { filename: "app.js" });
console.log(`Verification passed: ${files.length} required files, ${ids.size} UI IDs, product identity and syntax checks passed.`);
