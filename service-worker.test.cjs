"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function response(body, ok = true) { return { body, ok, clone() { return response(body, ok); } }; }

const listeners = {};
const stores = new Map();
const cacheKey = value => new URL(value.url || value, "https://local.test/").href;
const cacheApi = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async addAll(paths) { for (const path of paths) store.set(cacheKey(path), response(`cached:${path}`)); },
      async put(request, value) { store.set(cacheKey(request), value); },
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
  async match(request) {
    const key = cacheKey(request);
    for (const store of stores.values()) if (store.has(key)) return store.get(key);
    return undefined;
  },
};
const self = {
  location: { origin: "https://local.test" },
  clients: { claim: async () => {} },
  skipWaiting: async () => {},
  addEventListener: (name, listener) => { listeners[name] = listener; },
};
let network = async request => response(`network:${request.url}`);
vm.runInNewContext(fs.readFileSync("service-worker.js", "utf8"), { self, caches: cacheApi, URL, Response, fetch: request => network(request), Promise });

function lifecycleEvent() {
  let completion;
  return { waitUntil(value) { completion = Promise.resolve(value); }, done: () => completion };
}
function fetchEvent(url, mode = "same-origin") {
  let result;
  const waits = [];
  return {
    request: { method: "GET", url, mode, headers: { has: () => false } },
    respondWith(value) { result = Promise.resolve(value); },
    waitUntil(value) { waits.push(Promise.resolve(value)); },
    result: () => result,
    waits: () => Promise.all(waits),
  };
}

(async () => {
  stores.set("ppw-shell-v60", new Map());
  const install = lifecycleEvent();
  listeners.install(install);
  await install.done();
  const activeCache = [...stores.keys()].find(name => name !== "ppw-shell-v60");
  assert.equal(activeCache, "ppw-shell-v67", "install must rotate to the Fern narrative shell cache");
  const shell = stores.get(activeCache);
  assert.ok(shell.has(cacheKey("./ui-render.js")), "offline shell is missing the presentation module");
  assert.ok(shell.has(cacheKey("./assets/images/villagers/mira-head.png")), "offline shell is missing Mira's runtime portrait");
  assert.ok(shell.has(cacheKey("./assets/images/villagers/fern-head.webp")), "offline shell is missing Fern's runtime portrait");
  assert.ok(!shell.has(cacheKey("./assets/source/villagers/mira_head-256.png")), "source artwork must stay outside the offline shell");
  assert.ok(!shell.has(cacheKey("./assets/source/villagers/fern_head-256.png")), "Fern source artwork must stay outside the offline shell");
  for (const file of ["./", "./index.html", "./style.css", "./content-data.js", "./game-logic.js", "./platform-adapters.js", "./audio-feedback.js", "./app.js", "./manifest.webmanifest", "./icon.svg", "./assets/audio/bagpop.mp3", "./assets/audio/brew-ready.mp3", "./assets/audio/brew-start.mp3", "./assets/audio/coin.mp3", "./assets/audio/confirm.mp3", "./assets/audio/gather.mp3", "./assets/audio/levelup.ogg", "./assets/audio/tap.ogg", "./assets/images/ingredients/dewleaf.png", "./assets/images/ingredients/dream-lavender.png", "./assets/images/ingredients/frostmint.png", "./assets/images/ingredients/mist-pearl.png", "./assets/images/ingredients/mooshroom.png", "./assets/images/ingredients/starshard.png", "./assets/images/ingredients/sun-ember.png", "./assets/images/misc/gather-satchel.png", "./assets/images/misc/workshop-cat.png", "./assets/images/misc/workshop-cauldron.png", "./assets/images/potions/aurora-nectar.png", "./assets/images/potions/aurora-nectar-animated-12f.png", "./assets/images/potions/bottled-sunrise.png", "./assets/images/potions/clarity-elixir.png", "./assets/images/potions/cloudbloom-tea.png", "./assets/images/potions/dreamers-draught.png", "./assets/images/potions/kindheart-cordial.png", "./assets/images/potions/lantern-sip.png", "./assets/images/potions/meadow-tonic.png", "./assets/images/potions/moonmilk.png", "./assets/images/potions/quietbell-tea.png", "./assets/images/potions/starlight-philter.png", "./assets/images/potions/wayfinder-cordial.png"]) assert.ok(shell.has(cacheKey(file)), `offline shell is missing ${file}`);

  const activate = lifecycleEvent();
  listeners.activate(activate);
  await activate.done();
  assert.deepEqual([...stores.keys()], [activeCache], "activation must remove only superseded PPW caches");

  network = async () => { throw new Error("offline"); };
  const cachedRequest = fetchEvent("https://local.test/style.css");
  listeners.fetch(cachedRequest);
  assert.equal((await cachedRequest.result()).body, "cached:./style.css");
  const navigation = fetchEvent("https://local.test/unseen-route", "navigate");
  listeners.fetch(navigation);
  assert.equal((await navigation.result()).body, "cached:./index.html", "uncached same-origin navigation must fall back to the offline shell");
  const missingMusic = fetchEvent("https://local.test/assets/audio/music1.mp3", "audio");
  listeners.fetch(missingMusic);
  assert.equal((await missingMusic.result()).status, 503, "offline media must fail as media instead of receiving the HTML shell");
  console.log("Service worker install, cache rotation, cached response, navigation fallback, and offline-media failure tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
