import { useState, useEffect } from 'react';

export function useDevToolsDetection() {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  useEffect(() => {
    // Method 1: Window size detection
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // Method 2: Debugger detection using console timing
    const detectDebugger = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        setIsDevToolsOpen(true);
      }
    };

    // Method 3: Console detection
    const devtools = { open: false };
    const threshold = 160;
    
    const emitEvent = (isOpen: boolean) => {
      if (isOpen !== devtools.open) {
        devtools.open = isOpen;
        setIsDevToolsOpen(isOpen);
      }
    };

    const checkConsole = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      emitEvent(widthDiff || heightDiff);
    };

    // Method 4: Element-based detection
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: function() {
        setIsDevToolsOpen(true);
        return '';
      }
    });

    // Check periodically
    const interval = setInterval(() => {
      checkDevTools();
      checkConsole();
      // Console.log trick - when devtools is open, this getter will be triggered
      console.log('%c', element);
      console.clear();
    }, 1000);

    // Initial check
    checkDevTools();

    // Resize listener
    window.addEventListener('resize', checkDevTools);

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-protected="true"]')) {
        e.preventDefault();
        return false;
      }
    };

    // Disable keyboard shortcuts for dev tools
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && e.key.toUpperCase() === 'U') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkDevTools);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return isDevToolsOpen;
}
