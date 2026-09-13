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
    "revision": "aa632c178027e95f4b1d1c498d74f307"
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
    "url": "assets/users-DzgPhvTO.js",
    "revision": null
  }, {
    "url": "assets/ui-DmXiDGV6.js",
    "revision": null
  }, {
    "url": "assets/typeof-Ck1lrlJ6.js",
    "revision": null
  }, {
    "url": "assets/trash-2-x9NU6TxF.js",
    "revision": null
  }, {
    "url": "assets/tag-Cb76wT7Y.js",
    "revision": null
  }, {
    "url": "assets/square-Cd66yJRz.js",
    "revision": null
  }, {
    "url": "assets/sparkles-BO-ojdDM.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-BAoZ027s.js",
    "revision": null
  }, {
    "url": "assets/route-CFm0npvu.js",
    "revision": null
  }, {
    "url": "assets/receipt-text-wlpgiwG0.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bf9Bfr-F.js",
    "revision": null
  }, {
    "url": "assets/plus-DnQiSlFN.js",
    "revision": null
  }, {
    "url": "assets/pen-BfFUbmYN.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-CYYzBaZ9.js",
    "revision": null
  }, {
    "url": "assets/package-3J_7fEhv.js",
    "revision": null
  }, {
    "url": "assets/map-pin-BU_PlyBx.js",
    "revision": null
  }, {
    "url": "assets/index.es-DORVlzVR.js",
    "revision": null
  }, {
    "url": "assets/index-lKCWXKRY.css",
    "revision": null
  }, {
    "url": "assets/index-CwRLxf5G.js",
    "revision": null
  }, {
    "url": "assets/html2canvas-BbQnamK0.js",
    "revision": null
  }, {
    "url": "assets/file-down-ClXhCUuD.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-DOspBVOF.js",
    "revision": null
  }, {
    "url": "assets/dayFeasibility-BixkpPSa.js",
    "revision": null
  }, {
    "url": "assets/copy-Tp8vTHKG.js",
    "revision": null
  }, {
    "url": "assets/circle-check-DVOpGu_j.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-C_qSU1Lk.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-FaV_viXf.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-0laf-9Et.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-D21RLL17.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-BDtM20Gl.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-D01SR5tt.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-CTTnmCpc.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-CRdEJQj-.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-CY_NQ_sq.js",
    "revision": null
  }, {
    "url": "assets/HomePage-BSf326RR.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-BcAvBG6C.js",
    "revision": null
  }, {
    "url": "assets/AITab-CsLGD44c.js",
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
