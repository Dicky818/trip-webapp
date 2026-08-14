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
    "revision": "2500ad2e001155bd6f15555853793765"
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
    "url": "assets/users-c2BNV84h.js",
    "revision": null
  }, {
    "url": "assets/ui-DRfvmYzV.js",
    "revision": null
  }, {
    "url": "assets/typeof-CFYxgWuE.js",
    "revision": null
  }, {
    "url": "assets/trash-2-D54UymBV.js",
    "revision": null
  }, {
    "url": "assets/tag-BYqkYih2.js",
    "revision": null
  }, {
    "url": "assets/square-Ej8ooY_2.js",
    "revision": null
  }, {
    "url": "assets/sparkles-CUV5bqgl.js",
    "revision": null
  }, {
    "url": "assets/sortable.esm--MudfFJ7.js",
    "revision": null
  }, {
    "url": "assets/purify.es-TR0vuwzy.js",
    "revision": null
  }, {
    "url": "assets/plus-BMbb3spV.js",
    "revision": null
  }, {
    "url": "assets/pen-DmvOL4KK.js",
    "revision": null
  }, {
    "url": "assets/pdfExport-BGEf_5wx.js",
    "revision": null
  }, {
    "url": "assets/package-BRC0mAZa.js",
    "revision": null
  }, {
    "url": "assets/map-pin-CJ7UW05P.js",
    "revision": null
  }, {
    "url": "assets/index.es-CerfPJDp.js",
    "revision": null
  }, {
    "url": "assets/index-BMcei3X-.js",
    "revision": null
  }, {
    "url": "assets/index-Ap3Lp0M6.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-NhHQYhU7.js",
    "revision": null
  }, {
    "url": "assets/hotel-eSvJs8-A.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-DrKpTSG6.js",
    "revision": null
  }, {
    "url": "assets/defineProperty-wDFYsgMD.js",
    "revision": null
  }, {
    "url": "assets/copy-Crli1SUl.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-CfmaGJfC.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-g2TUIIzF.js",
    "revision": null
  }, {
    "url": "assets/TripDetailPage-CKkPHlOr.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-B56_lM3R.js",
    "revision": null
  }, {
    "url": "assets/PackingListTab-8VuBZWFI.js",
    "revision": null
  }, {
    "url": "assets/LoginPage-QzsimBMV.js",
    "revision": null
  }, {
    "url": "assets/ItineraryTab-C7Ltixno.js",
    "revision": null
  }, {
    "url": "assets/InfoTab-Dwj0bDVI.js",
    "revision": null
  }, {
    "url": "assets/HomePage-DsfZfApb.js",
    "revision": null
  }, {
    "url": "assets/ExpensesTab-BUkETutS.js",
    "revision": null
  }, {
    "url": "assets/AITab-D3_fMb_9.js",
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
