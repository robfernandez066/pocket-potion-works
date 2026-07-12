const CACHE_PREFIX = "ppw-shell-";
const CACHE = `${CACHE_PREFIX}v18`;
const SHELL = ["./", "./index.html", "./style.css", "./game-logic.js", "./platform-adapters.js", "./audio-feedback.js", "./app.js", "./manifest.webmanifest", "./icon.svg", "./assets/audio/bagpop.mp3", "./assets/audio/brew-ready.mp3", "./assets/audio/brew-start.mp3", "./assets/audio/coin.mp3", "./assets/audio/confirm.mp3", "./assets/audio/gather.mp3", "./assets/audio/levelup.ogg", "./assets/audio/tap.ogg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
