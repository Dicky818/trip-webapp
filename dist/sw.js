/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-4ae8b2d7'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-512x512.png",
    "revision": "f79c199c452cabee906e5a77f932c782"
  }, {
    "url": "pwa-192x192.png",
    "revision": "db6f82a4f109cd29d90bec86b7932f90"
  }, {
    "url": "index.html",
    "revision": "18e4ba73c8fba896a87ece9ba5b5306b"
  }, {
    "url": "icons.svg",
    "revision": "3b4fcfcf393eca4d264dca4a4663bc37"
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "080bbaa8dd07ac189a91400a4c8d64bf"
  }, {
    "url": "404.html",
    "revision": "921f0c88b4dd6f4a0399dbe6b70d82ac"
  }, {
    "url": "assets/users-mA38aySe.js",
    "revision": null
  }, {
    "url": "assets/ui-rZeUj16c.js",
    "revision": null
  }, {
    "url": "assets/typeof-Ck1lrlJ6.js",
    "revision": null
  }, {
    "url": "assets/trash-2-DGhxHkTi.js",
    "revision": null
  }, {
    "url": "assets/tag-77uUAUKh.js",
    "revision": null
  }, {
    "url": "assets/square-DMfLPfaX.js",
    "revision": null
  }, {
    "url": "assets/sparkles-DXC2TB27.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-DC0SuqbS.js",
    "revision": null
  }, {
    "url": "assets/route-BGEts9eg.js",
    "revision": null
  }, {
    "url": "assets/receipt-text-BEhu7fUM.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bf9Bfr-F.js",
    "revision": null
  }, {
    "url": "assets/plus-DuG094n4.js",
    "revision": null
  }, {
    "url": "assets/pen-Cq7cFHnw.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-DJvRNJWE.js",
    "revision": null
  }, {
    "url": "assets/package-E7Rz9jjb.js",
    "revision": null
  }, {
    "url": "assets/map-pin-f1CJ5mmZ.js",
    "revision": null
  }, {
    "url": "assets/index.es-BPVAhsSW.js",
    "revision": null
  }, {
    "url": "assets/index-BeApDna3.css",
    "revision": null
  }, {
    "url": "assets/index-63u53rym.js",
    "revision": null
  }, {
    "url": "assets/html2canvas-eGqHWkjV.js",
    "revision": null
  }, {
    "url": "assets/file-down-BW4Hun03.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-BxibMvSd.js",
    "revision": null
  }, {
    "url": "assets/dayFeasibility-D3EPpyE_.js",
    "revision": null
  }, {
    "url": "assets/copy-DELpiyTY.js",
    "revision": null
  }, {
    "url": "assets/circle-check-C8ZPbYNL.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-CZL8V9z9.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-BvO5d-D8.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-BF6EAsvF.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-3xV234HW.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-DW5dI4xh.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-mkHzCEAt.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-DMMZtHWS.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-DXv2IJaE.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-Cmhr7R_v.js",
    "revision": null
  }, {
    "url": "assets/HomePage-MbQ7KxTV.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-DYq8DEQ0.js",
    "revision": null
  }, {
    "url": "assets/AITab-D3xTIXyi.js",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "icons.svg",
    "revision": "3b4fcfcf393eca4d264dca4a4663bc37"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4ca3f6d0783e96565383975ee759a727"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(/^https:\/\/skrdhktjyiiipxcuxknk\.supabase\.co\/rest\/v1\/.*/i, new workbox.NetworkFirst({
    "cacheName": "supabase-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');
  workbox.registerRoute(/\/fonts\/NotoSansTC.*\.ttf$/i, new workbox.CacheFirst({
    "cacheName": "cjk-font-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 2,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
