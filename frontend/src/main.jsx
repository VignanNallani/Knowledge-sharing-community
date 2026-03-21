import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketProvider.jsx';
import ToastProvider from './components/ToastProvider.jsx';
import GlobalToastProvider from './components/GlobalToastProvider.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { Suspense } from 'react';
import ConnectionBanner from './components/ConnectionBanner';
import './index.css';

// Environment validation
import { validateEnv } from './utils/env';
if (!validateEnv()) {
  console.error('Application startup failed due to missing environment variables');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <SocketProvider>
            <ConnectionBanner />
            <ToastProvider>
              <App />
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
