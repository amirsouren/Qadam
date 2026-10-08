import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './index.css';

/**
 * Qadam boots with zero network calls: the service worker precaches the whole
 * shell, and all data lives in IndexedDB on this device.
 */
try {
  registerSW({
    immediate: true,
    onRegisteredSW(_registration) {
      // Kept intentionally quiet — there is no push server to sync with.
    },
    onRegisterError(error) {
      console.warn('[qadam] offline support unavailable:', error);
    },
  });
} catch (error) {
  console.warn('[qadam] service worker registration skipped:', error);
}

const container = document.getElementById('root');
if (!container) throw new Error('Qadam could not find its #root mount point.');

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
