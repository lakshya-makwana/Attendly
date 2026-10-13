import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * usePrint
 * Centralized, reliable print lifecycle hook for Attendly.
 *
 * Provides:
 * - Synchronous user gesture dispatch for mobile Safari (iOS) and Android Chrome
 * - Synchronous double-tap lockout via ref
 * - 1.2s auto-recovering safety timer so buttons never get stuck loading on mobile
 * - Desktop afterprint listener for fast UI reset when supported
 * - Graceful fallback & user notification when native printing is unsupported or fails
 * - Clean teardown on unmount
 */
export const usePrint = ({ onNotification } = {}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const printLockRef = useRef(false);
  const printTimeoutRef = useRef(null);

  // Clean up print state cleanly
  const cleanup = useCallback(() => {
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
      printTimeoutRef.current = null;
    }
    printLockRef.current = false;
    setIsPrinting(false);
  }, []);

  // Desktop browser afterprint event for fast recovery when supported
  useEffect(() => {
    const handlePrintEnd = () => {
      cleanup();
    };

    window.addEventListener('afterprint', handlePrintEnd);

    return () => {
      window.removeEventListener('afterprint', handlePrintEnd);
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
      printLockRef.current = false;
    };
  }, [cleanup]);

  /**
   * triggerPrint
   * Invokes native printing cleanly with debouncing, body classes, and error guards.
   *
   * @param {Object} options
   * @param {string|string[]} [options.printClasses] - Body class(es) to add synchronously before print
   * @param {Function} [options.onError] - Custom error handler
   */
  const triggerPrint = useCallback(
    ({ printClasses = [], onError } = {}) => {
      // Guard against rapid duplicate clicks
      if (printLockRef.current) return;

      // Environment capability check
      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        if (onNotification) {
          onNotification({
            message: 'Printing is not supported in this browser. Please use your browser menu (Share → Print).',
            severity: 'info'
          });
        }
        return;
      }

      // Ensure any print-specific classes are applied synchronously to document.body
      const classesToAdd = Array.isArray(printClasses) ? printClasses : [printClasses];
      classesToAdd.filter(Boolean).forEach((cls) => {
        document.body.classList.add(cls);
      });

      // Synchronous double-tap lockout & loading state
      printLockRef.current = true;
      setIsPrinting(true);

      // Auto-release the button state after 1.2s so it NEVER gets stuck on mobile
      // even if the mobile browser does not dispatch afterprint or focus events
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
      printTimeoutRef.current = setTimeout(() => {
        printLockRef.current = false;
        setIsPrinting(false);
        printTimeoutRef.current = null;
      }, 1200);

      // Must be synchronous within user gesture context for mobile Safari & Chrome
      try {
        window.print();
      } catch (err) {
        console.error('Print trigger failed:', err);
        cleanup();
        if (onError) {
          onError(err);
        } else if (onNotification) {
          onNotification({
            message: 'Could not open print dialog. Please use your browser menu (Share → Print).',
            severity: 'error'
          });
        }
      }
    },
    [cleanup, onNotification]
  );

  return {
    isPrinting,
    triggerPrint,
    cleanup
  };
};

export default usePrint;
