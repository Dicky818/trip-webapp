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
    "revision": "3aaf00e12a90a3d59a5b7bb8f57982b2"
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
    "url": "assets/users-CoPurfbO.js",
    "revision": null
  }, {
    "url": "assets/ui-CyZjbcvg.js",
    "revision": null
  }, {
    "url": "assets/typeof-CUC_7uzW.js",
    "revision": null
  }, {
    "url": "assets/trash-2-DB05gagc.js",
    "revision": null
  }, {
    "url": "assets/tag-145DJKWU.js",
    "revision": null
  }, {
    "url": "assets/square-Dxvmlnko.js",
    "revision": null
  }, {
    "url": "assets/sparkles-D9lmj8qi.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm-Dgla5f5s.js",
    "revision": null
  }, {
    "url": "assets/receipt-text-eCXP-VsJ.js",
    "revision": null
  }, {
    "url": "assets/purify.es-BTOAQNtZ.js",
    "revision": null
  }, {
    "url": "assets/plus-DuNpFnqc.js",
    "revision": null
  }, {
    "url": "assets/pen-CwQ7G6ss.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-D_xIMKLR.js",
    "revision": null
  }, {
    "url": "assets/package-Nc2NVNPA.js",
    "revision": null
  }, {
    "url": "assets/map-pin-BhbybXhU.js",
    "revision": null
  }, {
    "url": "assets/index.es-Blo8qwlT.js",
    "revision": null
  }, {
    "url": "assets/index-Jg0tE8IM.css",
    "revision": null
  }, {
    "url": "assets/index-DhzNDqjx.js",
    "revision": null
  }, {
    "url": "assets/html2canvas-Bu7Nz5H8.js",
    "revision": null
  }, {
    "url": "assets/hotel-B1Adl5IS.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-CmqMGBTe.js",
    "revision": null
  }, {
    "url": "assets/defineProperty-DWLZ7T0u.js",
    "revision": null
  }, {
    "url": "assets/copy-CkEKNXXt.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-DKDC8dJf.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-FY-QzTiE.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-ClketwKS.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-ChsC3ywL.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-Q-oUaqFu.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-CRswQQdO.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-CAcwp9Oc.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-0B9LrRMR.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-BIwj4Tr3.js",
    "revision": null
  }, {
    "url": "assets/HomePage-BMAjKw6Q.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-Dk5ocMZK.js",
    "revision": null
  }, {
    "url": "assets/AITab-D5mdTusS.js",
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
