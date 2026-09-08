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
    "revision": "54f3cf0c476d5dc93ecdc9a27fee3dff"
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
    "url": "assets/users-CkX6CNPS.js",
    "revision": null
  }, {
    "url": "assets/ui-DzZIpNMU.js",
    "revision": null
  }, {
    "url": "assets/typeof-Ck1lrlJ6.js",
    "revision": null
  }, {
    "url": "assets/trash-2-BFGpz-J6.js",
    "revision": null
  }, {
    "url": "assets/tag-CFlaAzOF.js",
    "revision": null
  }, {
    "url": "assets/square-BFgVg6Rt.js",
    "revision": null
  }, {
    "url": "assets/sparkles-CyRkhD3p.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-Ir0YgKmW.js",
    "revision": null
  }, {
    "url": "assets/route-DMt1ioEC.js",
    "revision": null
  }, {
    "url": "assets/receipt-text-g-pPVyqa.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bf9Bfr-F.js",
    "revision": null
  }, {
    "url": "assets/plus-Bcfh7VkJ.js",
    "revision": null
  }, {
    "url": "assets/pen-Ce_r35vq.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-CUVJjVs4.js",
    "revision": null
  }, {
    "url": "assets/package-E3e2VpYO.js",
    "revision": null
  }, {
    "url": "assets/map-pin-X4ZBTTD8.js",
    "revision": null
  }, {
    "url": "assets/index.es-iBinyMFv.js",
    "revision": null
  }, {
    "url": "assets/index-BwOvBYIy.js",
    "revision": null
  }, {
    "url": "assets/index-BhgDEYrr.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-D8YS58ar.js",
    "revision": null
  }, {
    "url": "assets/file-down-CGHzoSid.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-C5wwvbBT.js",
    "revision": null
  }, {
    "url": "assets/dayFeasibility-nwiAHndV.js",
    "revision": null
  }, {
    "url": "assets/copy-BSHf5ho_.js",
    "revision": null
  }, {
    "url": "assets/circle-check-BMUN2Pyk.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-xPsNfMpv.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-CAcXVWCJ.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-D-TJ6IHN.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-BII-hj5K.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-BwNgiJsr.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-D4iAKQCu.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-Dl-DRJCn.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-B0l9pe3n.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-bkAhDjPp.js",
    "revision": null
  }, {
    "url": "assets/HomePage-BCTc5qRG.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-BWbfKzY3.js",
    "revision": null
  }, {
    "url": "assets/AITab-CM5r9E1Z.js",
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
