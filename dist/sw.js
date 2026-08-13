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
define(['./workbox-8d0d8005'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "442eac0dfdd3f0547e58d29711f9d5b6"
  }, {
    "url": "pwa-512x512.png",
    "revision": "f79c199c452cabee906e5a77f932c782"
  }, {
    "url": "pwa-192x192.png",
    "revision": "db6f82a4f109cd29d90bec86b7932f90"
  }, {
    "url": "index.html",
    "revision": "b724a19cf958f1d512a519139a2f3ead"
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
    "url": "assets/users-3VYJtY6-.js",
    "revision": null
  }, {
    "url": "assets/ui-D3lc5R_b.js",
    "revision": null
  }, {
    "url": "assets/typeof-CFYxgWuE.js",
    "revision": null
  }, {
    "url": "assets/trash-2-DgHGQWKT.js",
    "revision": null
  }, {
    "url": "assets/tag-TAm_ZUaX.js",
    "revision": null
  }, {
    "url": "assets/square-DA9SxJWe.js",
    "revision": null
  }, {
    "url": "assets/sparkles-C8Ktqogz.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-BnGltr46.js",
    "revision": null
  }, {
    "url": "assets/purify.es-TR0vuwzy.js",
    "revision": null
  }, {
    "url": "assets/plus-B6S0QoWF.js",
    "revision": null
  }, {
    "url": "assets/pen-6-ZNBGg_.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-Bw_TKRjd.js",
    "revision": null
  }, {
    "url": "assets/package-BI3pMh_3.js",
    "revision": null
  }, {
    "url": "assets/map-pin-CUgjPE0w.js",
    "revision": null
  }, {
    "url": "assets/index.es-BaGtP96G.js",
    "revision": null
  }, {
    "url": "assets/index-CZkhAU_Z.js",
    "revision": null
  }, {
    "url": "assets/index-Ap3Lp0M6.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-DAoK2PPQ.js",
    "revision": null
  }, {
    "url": "assets/hotel-DNJQqEEr.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-BCLJqA-S.js",
    "revision": null
  }, {
    "url": "assets/defineProperty-wDFYsgMD.js",
    "revision": null
  }, {
    "url": "assets/copy-BAUBGN0r.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-BXa6pV3u.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-DBw8zbhv.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-4oFOP-Nb.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-DEzuYJY9.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-DpcFLYmm.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-CP26oK5K.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-CGAvas7l.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-BQSv6-Qp.js",
    "revision": null
  }, {
    "url": "assets/HomePage-d4nqXrle.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-DTx-at8B.js",
    "revision": null
  }, {
    "url": "assets/AITab-BWi33S8J.js",
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
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
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
