import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ApiProvider } from './api';
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
      {/* Wire getAccessToken to your admin auth (OIDC) when integrating. */}
      <ApiProvider>
        <App />
      </ApiProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
