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
    "url": "pwa-512x512.png",
    "revision": "f79c199c452cabee906e5a77f932c782"
  }, {
    "url": "pwa-192x192.png",
    "revision": "db6f82a4f109cd29d90bec86b7932f90"
  }, {
    "url": "index.html",
    "revision": "1a2e67a661c76cd41228574bcfb88b32"
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
    "url": "assets/users-BDl3A-ht.js",
    "revision": null
  }, {
    "url": "assets/ui-CTRXWv5j.js",
    "revision": null
  }, {
    "url": "assets/typeof-Ck1lrlJ6.js",
    "revision": null
  }, {
    "url": "assets/trash-2-DukFApxn.js",
    "revision": null
  }, {
    "url": "assets/tag-Bo26pzIf.js",
    "revision": null
  }, {
    "url": "assets/square-DmWmY8rP.js",
    "revision": null
  }, {
    "url": "assets/sparkles-CDn3aVx4.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-B7eRSO3Y.js",
    "revision": null
  }, {
    "url": "assets/route-LPl81Um5.js",
    "revision": null
  }, {
    "url": "assets/receipt-text-DpJKCSkY.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bf9Bfr-F.js",
    "revision": null
  }, {
    "url": "assets/plus-D6G9W9Z9.js",
    "revision": null
  }, {
    "url": "assets/pen--N1J6t6M.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-Bo_Axdnm.js",
    "revision": null
  }, {
    "url": "assets/package-OizaewBv.js",
    "revision": null
  }, {
    "url": "assets/map-pin-CtI0FlIX.js",
    "revision": null
  }, {
    "url": "assets/index.es-Cwjfjs1S.js",
    "revision": null
  }, {
    "url": "assets/index-BJEm-7pt.js",
    "revision": null
  }, {
    "url": "assets/index--o5rNfLZ.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-BZ1h_shX.js",
    "revision": null
  }, {
    "url": "assets/file-down-f2qCS2cD.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-Cl5Kf7k1.js",
    "revision": null
  }, {
    "url": "assets/dayFeasibility-CPPywuF2.js",
    "revision": null
  }, {
    "url": "assets/copy-BlE8p2Du.js",
    "revision": null
  }, {
    "url": "assets/circle-check-Suh44SDi.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-BcfBFfRK.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-B1ZDG6H0.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-CovFvWFM.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-BoNWFSk_.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-DJUfaYXm.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-B3AcZ51B.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-BSLbS45Z.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-Vu7hmYiJ.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-Du8sWLuB.js",
    "revision": null
  }, {
    "url": "assets/HomePage-D_7P0t1a.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-DlWI7V0t.js",
    "revision": null
  }, {
    "url": "assets/AITab-BHY4KvQO.js",
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
