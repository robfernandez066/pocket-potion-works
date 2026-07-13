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
  stores.set("ppw-shell-v32", new Map());
  const install = lifecycleEvent();
  listeners.install(install);
  await install.done();
  const activeCache = [...stores.keys()].find(name => name !== "ppw-shell-v32");
  assert.equal(activeCache, "ppw-shell-v33", "install must rotate the navigation-icon fix shell cache");
  const shell = stores.get(activeCache);
  for (const file of ["./", "./index.html", "./style.css", "./game-logic.js", "./platform-adapters.js", "./audio-feedback.js", "./app.js", "./manifest.webmanifest", "./icon.svg", "./assets/audio/bagpop.mp3", "./assets/audio/brew-ready.mp3", "./assets/audio/brew-start.mp3", "./assets/audio/coin.mp3", "./assets/audio/confirm.mp3", "./assets/audio/gather.mp3", "./assets/audio/levelup.ogg", "./assets/audio/tap.ogg"]) assert.ok(shell.has(cacheKey(file)), `offline shell is missing ${file}`);

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
