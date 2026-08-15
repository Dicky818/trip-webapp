import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 旅途作戰桌 PWA update policy: retain offline support, but recheck the worker
// without HTTP-cache reuse whenever the app returns to the foreground.
if ('serviceWorker' in navigator) {
  const workerScope = import.meta.env.BASE_URL;
  const workerUrl = `${workerScope}sw.js`;
  let updatingWorker: Promise<ServiceWorkerRegistration> | undefined;
  let reloadedForWorkerChange = false;

  const checkForWorkerUpdate = () => {
    if (!updatingWorker) {
      updatingWorker = navigator.serviceWorker
        .register(workerUrl, {
          scope: workerScope,
          updateViaCache: 'none',
        })
        .then(async (registration) => {
          await registration.update();
          return registration;
        })
        .finally(() => {
          updatingWorker = undefined;
        });
    }

    return updatingWorker;
  };

  const requestWorkerUpdate = () => {
    void checkForWorkerUpdate().catch((error) => {
      console.warn('無法檢查應用程式更新', error);
    });
  };

  requestWorkerUpdate();

  window.addEventListener('focus', () => {
    requestWorkerUpdate();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWorkerUpdate();
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadedForWorkerChange) {
      reloadedForWorkerChange = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
