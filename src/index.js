import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { LocalizationProvider } from './util/LocalizationContext';

const isResizeObserverNoise = (message = '') => {
  return (
    message.includes('ResizeObserver loop completed with undelivered notifications') ||
    message.includes('ResizeObserver loop limit exceeded')
  );
};

window.addEventListener('error', (event) => {
  if (isResizeObserverNoise(event?.message || '')) {
    event.stopImmediatePropagation();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const message = typeof reason === 'string' ? reason : (reason?.message || '');
  if (isResizeObserverNoise(message)) {
    event.preventDefault();
  }
});

ReactDOM.render(
  <LocalizationProvider>
    <App />
  </LocalizationProvider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
