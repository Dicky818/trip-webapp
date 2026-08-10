import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Force reload when new service worker takes over (fixes blank page after SW update)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
