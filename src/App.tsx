import { useEffect } from 'react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/toaster';
import { initWebVitals } from './lib/vitals';

import { LoadingOverlay } from './components/ui/LoadingOverlay';

function App() {
  // Initialize Web Vitals monitoring
  useEffect(() => {
    initWebVitals((metric) => {
      // Log to console in development
      // In production, this could send to analytics platform
      if (import.meta.env.DEV) {
        console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(0)}ms (${metric.rating})`);
      }
    });
  }, []);

  return (
    <TooltipProvider>
      <LoadingOverlay />
      <Layout />
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
