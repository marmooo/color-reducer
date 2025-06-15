const CACHE_NAME = "2025-06-15 00:00";
const urlsToCache = [
  "/color-reducer/",
  "/color-reducer/ja/",
  "/color-reducer/coi-serviceworker.js",
  "/color-reducer/index.js",
  "/color-reducer/img/before.webp",
  "/color-reducer/img/after.webp",
  "/color-reducer/img/anime-64.webp",
  "/color-reducer/img/car-64.webp",
  "/color-reducer/img/cat-64.webp",
  "/color-reducer/img/castle-64.webp",
  "/color-reducer/pngs/pngs_bg.wasm",
  "/color-reducer/favicon/favicon.svg",
  "https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.8.0/dist/umd/index.min.js",
];

importScripts(
  "https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.8.0/dist/umd/index.min.js",
);

async function getOpenCVPath() {
  const simdSupport = await wasmFeatureDetect.simd();
  const threadsSupport = self.crossOriginIsolated &&
    await wasmFeatureDetect.threads();
  if (simdSupport && threadsSupport) {
    return "/color-reducer/opencv/threaded-simd/opencv_js.js";
  } else if (simdSupport) {
    return "/color-reducer/opencv/simd/opencv_js.js";
  } else if (threadsSupport) {
    return "/color-reducer/opencv/threads/opencv_js.js";
  } else {
    return "/color-reducer/opencv/wasm/opencv_js.js";
  }
}

async function addOpenCVPaths() {
  const opencvPath = await getOpenCVPath();
  urlsToCache.push(opencvPath);
  urlsToCache.push(opencvPath.slice(0, -3) + ".wasm");
}

addOpenCVPaths();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );
});
