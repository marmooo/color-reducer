const CACHE_NAME="2025-04-13 12:00",urlsToCache=["/color-reducer/","/color-reducer/ja/","/color-reducer/coi-serviceworker.js","/color-reducer/index.js","/color-reducer/img/before.webp","/color-reducer/img/after.webp","/color-reducer/img/anime-64.webp","/color-reducer/img/car-64.webp","/color-reducer/img/cat-64.webp","/color-reducer/img/castle-64.webp","/color-reducer/pngs/pngs_bg.wasm","/color-reducer/favicon/favicon.svg","https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.8.0/dist/umd/index.min.js"];importScripts("https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.8.0/dist/umd/index.min.js");async function getOpenCVPath(){const e=await wasmFeatureDetect.simd(),t=self.crossOriginIsolated&&await wasmFeatureDetect.threads();return e&&t?"/color-reducer/opencv/threaded-simd/opencv_js.js":e?"/color-reducer/opencv/simd/opencv_js.js":t?"/color-reducer/opencv/threads/opencv_js.js":"/color-reducer/opencv/wasm/opencv_js.js"}async function addOpenCVPaths(){const e=await getOpenCVPath();urlsToCache.push(e),urlsToCache.push(e.slice(0,-3)+".wasm")}addOpenCVPaths(),self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(e=>e.addAll(urlsToCache)))}),self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(t=>t||fetch(e.request)))}),self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(e=>Promise.all(e.filter(e=>e!==CACHE_NAME).map(e=>caches.delete(e)))))})