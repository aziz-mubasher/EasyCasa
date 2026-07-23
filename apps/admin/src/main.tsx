import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ApiProvider } from './api';
import { AuthProvider } from './auth/AuthProvider';
import { App } from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiProvider>
          <App />
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
