import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import '@/ui/tokens.css';
import { initSession } from '@/core/session';
import { dataConfig } from '@/app/registry';
import { createAppRouter } from '@/app/router';

registerSW({ immediate: true });

const router = createAppRouter();
void initSession(dataConfig);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
