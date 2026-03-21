import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketProvider';
import ToastProvider from './components/ToastProvider';
import GlobalToastProvider from './components/GlobalToastProvider';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { Suspense } from 'react';
import ConnectionBanner from './components/ConnectionBanner';
import './index.css';

// Lazy load heavy components
const BookingModal = React.lazy(() => import('./components/BookingModal'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <ConnectionBanner />
            <ToastProvider>
              <App />
              <Suspense fallback={null}>
                <BookingModal />
              </Suspense>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
