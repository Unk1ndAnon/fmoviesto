import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-703MF3DNBF', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
};
