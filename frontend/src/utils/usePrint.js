import { useState, useRef, useCallback, useEffect } from 'react';
import { isIOS, isIOSStandalone, openPrintableDocument } from './printableDocument';

/**
 * usePrint
 * Centralized, reliable print lifecycle hook for Attendly.
 *
 * Provides:
 * - Synchronous user gesture dispatch for mobile Safari (iOS) and Android Chrome
 * - Synchronous double-tap lockout via ref
 * - 1.2s auto-recovering safety timer so buttons never get stuck loading on mobile
 * - Desktop afterprint listener for fast UI reset when supported
 * - iOS Standalone PWA detection and automatic standalone document & AirPrint share fallback
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
   * openDocument
   * Explicitly opens or shares the clean standalone printable document.
   */
  const openDocument = useCallback(
    async ({
      getDocumentHtml,
      documentTitle = 'Attendly Document',
      documentFilename = 'document.html',
      preferShare = true
    } = {}) => {
      if (typeof getDocumentHtml !== 'function') return;
      try {
        const html = getDocumentHtml();
        if (!html) return;
        setIsPrinting(true);
        const result = await openPrintableDocument({
          title: documentTitle,
          contentHtml: html,
          filename: documentFilename,
          preferShare
        });
        setIsPrinting(false);
        if (result.success && result.mode === 'share' && onNotification) {
          onNotification({
            message: 'Opened native share sheet. Select "Print" or "Save to Files".',
            severity: 'info'
          });
        }
      } catch (err) {
        console.error('Failed to open document:', err);
        setIsPrinting(false);
      }
    },
    [onNotification]
  );

  /**
   * triggerPrint
   * Invokes native printing cleanly with debouncing, body classes, and error guards.
   * On iOS standalone PWA (where window.print() is a silent no-op), automatically routes
   * to the clean standalone document and native iOS share sheet.
   *
   * @param {Object} options
   * @param {string|string[]} [options.printClasses] - Body class(es) to add synchronously before print
   * @param {Function} [options.getDocumentHtml] - Function returning standalone HTML for the document
   * @param {string} [options.documentTitle] - Human-readable title for the document
   * @param {string} [options.documentFilename] - Filename for export/share
   * @param {Function} [options.onError] - Custom error handler
   */
  const triggerPrint = useCallback(
    ({
      printClasses = [],
      getDocumentHtml,
      documentTitle = 'Attendly Document',
      documentFilename = 'document.html',
      onError
    } = {}) => {
      // Guard against rapid duplicate clicks
      if (printLockRef.current) return;

      // 1. If running in iOS Standalone PWA mode (added to Home Screen), window.print()
      // is completely disabled by Apple WebKit. Immediately use the standalone document / share sheet fallback!
      if (isIOSStandalone() && typeof getDocumentHtml === 'function') {
        printLockRef.current = true;
        setIsPrinting(true);
        try {
          const html = getDocumentHtml();
          openPrintableDocument({
            title: documentTitle,
            contentHtml: html,
            filename: documentFilename,
            preferShare: true
          })
            .then((res) => {
              cleanup();
              if (res?.success && res?.mode === 'share' && onNotification) {
                onNotification({
                  message: 'Select "Print" or "Save to Files" from the iOS share sheet.',
                  severity: 'info'
                });
              }
            })
            .catch(() => {
              cleanup();
            });
        } catch (err) {
          console.error('Error generating printable document:', err);
          cleanup();
        }
        return;
      }

      // 2. Capability check
      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        if (typeof getDocumentHtml === 'function') {
          openDocument({ getDocumentHtml, documentTitle, documentFilename });
          return;
        }
        if (onNotification) {
          onNotification({
            message: 'Printing is not supported in this browser. Please use your browser menu (Share → Print).',
            severity: 'info'
          });
        }
        return;
      }

      // 3. Ensure any print-specific classes are applied synchronously to document.body
      const classesToAdd = Array.isArray(printClasses) ? printClasses : [printClasses];
      classesToAdd.filter(Boolean).forEach((cls) => {
        document.body.classList.add(cls);
      });

      // 4. Synchronous double-tap lockout & loading state
      printLockRef.current = true;
      setIsPrinting(true);

      // Auto-release the button state after 1.2s so it NEVER gets stuck on mobile
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
      printTimeoutRef.current = setTimeout(() => {
        printLockRef.current = false;
        setIsPrinting(false);
        printTimeoutRef.current = null;
      }, 1200);

      // 5. Must be synchronous within user gesture context for mobile Safari & Chrome
      try {
        window.print();

        // For mobile devices where window.print() may not open or may be suppressed,
        // display a helpful notification with fallback action
        if (isIOS() && typeof getDocumentHtml === 'function' && onNotification) {
          onNotification({
            message: 'Print initiated. If print dialog did not open, tap "Open Document" to view or share.',
            severity: 'info',
            actionLabel: 'Open Document',
            onAction: () => {
              openDocument({ getDocumentHtml, documentTitle, documentFilename });
            }
          });
        }
      } catch (err) {
        console.error('Print trigger failed:', err);
        cleanup();
        if (typeof getDocumentHtml === 'function') {
          openDocument({ getDocumentHtml, documentTitle, documentFilename });
        } else if (onError) {
          onError(err);
        } else if (onNotification) {
          onNotification({
            message: 'Could not open print dialog. Please use your browser menu (Share → Print).',
            severity: 'error'
          });
        }
      }
    },
    [cleanup, onNotification, openDocument]
  );

  return {
    isPrinting,
    triggerPrint,
    openDocument,
    cleanup
  };
};

export default usePrint;
