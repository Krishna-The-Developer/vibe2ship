import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installFetchInterceptor } from './utils/fetchInterceptor';

// Safely install fetch interceptor before rendering the React application
try {
  installFetchInterceptor();
} catch (e) {
  console.error('Failed to initialize fetch interceptor safely:', e);
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
