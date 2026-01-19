import { render } from 'preact';
import { App } from './app';
import './index.css';

const container = document.getElementById('app');
if (container) {
  render(<App />, container);
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
