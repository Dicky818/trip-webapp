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
    "revision": "98460566303ca5b98593f187f420c373"
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
    "url": "assets/users-BJpvu3Lo.js",
    "revision": null
  }, {
    "url": "assets/ui-C4LydSkQ.js",
    "revision": null
  }, {
    "url": "assets/typeof-CUC_7uzW.js",
    "revision": null
  }, {
    "url": "assets/trash-2-DqS6VAme.js",
    "revision": null
  }, {
    "url": "assets/tag-gL6t4Q_s.js",
    "revision": null
  }, {
    "url": "assets/square-DIB9z7mu.js",
    "revision": null
  }, {
    "url": "assets/sparkles-BjNMPatl.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-CWqpcQvD.js",
    "revision": null
  }, {
    "url": "assets/receipt-text-DLqcbvs5.js",
    "revision": null
  }, {
    "url": "assets/purify.es-BTOAQNtZ.js",
    "revision": null
  }, {
    "url": "assets/plus-DqUW6fSB.js",
    "revision": null
  }, {
    "url": "assets/pen-B2O8t9cJ.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-BtZKekFf.js",
    "revision": null
  }, {
    "url": "assets/package-CmCAmNS-.js",
    "revision": null
  }, {
    "url": "assets/map-pin-CGGC_DEI.js",
    "revision": null
  }, {
    "url": "assets/index.es-D5TTQuff.js",
    "revision": null
  }, {
    "url": "assets/index-yMzS4xoy.js",
    "revision": null
  }, {
    "url": "assets/index-C8biUB6i.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-sdGauwBq.js",
    "revision": null
  }, {
    "url": "assets/hotel-BKi-A7SB.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-Ql9JUhOA.js",
    "revision": null
  }, {
    "url": "assets/defineProperty-DWLZ7T0u.js",
    "revision": null
  }, {
    "url": "assets/copy-D_wf6jCl.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-DRoPJvuD.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-CoJZRfjI.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-C2Dv7_4z.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-CclJ_bRo.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-C_BYMKQS.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-DqZUVy7o.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-BTTL6bcK.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-DuFJPEn5.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-DRPWGvPj.js",
    "revision": null
  }, {
    "url": "assets/HomePage-CSi9m4xJ.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-BwlV5UZD.js",
    "revision": null
  }, {
    "url": "assets/AITab-4dJ9ZJKj.js",
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
