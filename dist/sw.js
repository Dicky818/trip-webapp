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
    "revision": "fac59cfad6d5862143b4d6311c2ac627"
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
    "url": "assets/users-On24_Kqh.js",
    "revision": null
  }, {
    "url": "assets/ui-C6NmVFxw.js",
    "revision": null
  }, {
    "url": "assets/typeof-Ck1lrlJ6.js",
    "revision": null
  }, {
    "url": "assets/trash-2-D9uktuNP.js",
    "revision": null
  }, {
    "url": "assets/tag-DSDYwAOU.js",
    "revision": null
  }, {
    "url": "assets/square--9Smgkii.js",
    "revision": null
  }, {
    "url": "assets/sparkles-Bk3IZQeR.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-BSbasxBu.js",
    "revision": null
  }, {
    "url": "assets/route-DFDp9AMh.js",
    "revision": null
  }, {
    "url": "assets/receipt-text-DNkZuOQh.js",
    "revision": null
  }, {
    "url": "assets/purify.es-Bf9Bfr-F.js",
    "revision": null
  }, {
    "url": "assets/plus-DH9QnckT.js",
    "revision": null
  }, {
    "url": "assets/pen-CWJCnlL3.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-CJCMgKRU.js",
    "revision": null
  }, {
    "url": "assets/package-iECcvyN5.js",
    "revision": null
  }, {
    "url": "assets/map-pin-DVg2iWzU.js",
    "revision": null
  }, {
    "url": "assets/index.es-Cp6cA8LY.js",
    "revision": null
  }, {
    "url": "assets/index-BsZN0bf3.js",
    "revision": null
  }, {
    "url": "assets/index-6FlvxC-Q.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-DYNdLiBh.js",
    "revision": null
  }, {
    "url": "assets/file-down-CnHfXDn7.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-BGuTgEn0.js",
    "revision": null
  }, {
    "url": "assets/dayFeasibility-CvrKLSO3.js",
    "revision": null
  }, {
    "url": "assets/copy-BU3utGlc.js",
    "revision": null
  }, {
    "url": "assets/circle-check-Da1N8vkh.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-DVk6HTE3.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-DU9XlVie.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-DfuD82pI.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-DEBAdXSN.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-CRxxN5Po.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-BxxiuQgB.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-D01XnQwW.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-DzpMCa5k.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-B0Z5bwYU.js",
    "revision": null
  }, {
    "url": "assets/HomePage-D3cxM9RU.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-FIRQzdCD.js",
    "revision": null
  }, {
    "url": "assets/AITab-CAFrorZt.js",
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
