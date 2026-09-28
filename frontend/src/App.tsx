import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AppRoutes } from './routes/AppRoutes';
import { useUiStore } from './stores/ui.store';
import { useAuthStore } from './stores/auth.store';
import { ToastContainer } from './components/common/ToastContainer';
import { GlobalConfirmModal } from './components/common/GlobalConfirmModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  const { theme } = useUiStore();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
        <GlobalConfirmModal />
        <Analytics />
      </BrowserRouter>
    </ErrorBoundary>
  );
};


export default App;
