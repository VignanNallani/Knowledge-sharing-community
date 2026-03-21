import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketProvider.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { GlobalToastProvider } from './components/GlobalToastProvider.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <GlobalToastProvider>
              <OfflineBanner />
              <ToastProvider>
                <App />
              </ToastProvider>
            </GlobalToastProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
