const CACHE_PREFIX = "ppw-shell-";
const CACHE = `${CACHE_PREFIX}v55`;
const SHELL = ["./", "./index.html", "./style.css", "./game-logic.js", "./platform-adapters.js", "./audio-feedback.js", "./app.js", "./manifest.webmanifest", "./icon.svg", "./assets/audio/bagpop.mp3", "./assets/audio/brew-ready.mp3", "./assets/audio/brew-start.mp3", "./assets/audio/coin.mp3", "./assets/audio/confirm.mp3", "./assets/audio/gather.mp3", "./assets/audio/levelup.ogg", "./assets/audio/tap.ogg", "./assets/images/ingredients/dewleaf.png", "./assets/images/ingredients/dream-lavender.png", "./assets/images/ingredients/frostmint.png", "./assets/images/ingredients/mist-pearl.png", "./assets/images/ingredients/mooshroom.png", "./assets/images/ingredients/starshard.png", "./assets/images/ingredients/sun-ember.png", "./assets/images/misc/gather-satchel.png", "./assets/images/misc/workshop-cat.png", "./assets/images/misc/workshop-cauldron.png", "./assets/images/potions/aurora-nectar.png", "./assets/images/potions/aurora-nectar-animated-12f.png", "./assets/images/potions/bottled-sunrise.png", "./assets/images/potions/clarity-elixir.png", "./assets/images/potions/cloudbloom-tea.png", "./assets/images/potions/dreamers-draught.png", "./assets/images/potions/kindheart-cordial.png", "./assets/images/potions/lantern-sip.png", "./assets/images/potions/meadow-tonic.png", "./assets/images/potions/moonmilk.png", "./assets/images/potions/quietbell-tea.png", "./assets/images/potions/starlight-philter.png", "./assets/images/potions/wayfinder-cordial.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && !event.request.headers?.has?.("range")) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => {
    if (cached) return cached;
    if (event.request.mode === "navigate") return caches.match("./index.html");
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  })));
});
