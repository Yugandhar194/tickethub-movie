import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };

export default function Modal({ open, onClose, title, size = 'md', children, className, bare = false, centered = false, closeOnBackdrop = true, floatingCloseButton = false }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[80] flex h-[100dvh] w-screen justify-center',
            centered ? 'items-center p-4 sm:p-6' : 'items-end p-0 sm:items-center sm:p-6'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeOnBackdrop ? onClose : undefined} aria-hidden />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              cn(
                'relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden outline-none sm:max-h-[92vh]',
                centered ? 'rounded-panel' : 'rounded-t-[24px] sm:rounded-panel'
              ),
              bare ? '' : 'glass shadow-lift',
              widths[size],
              className
            )}
          >
            {!bare && (
              <div className="flex items-center justify-between border-b hairline px-6 py-4">
                <h2 className="text-lg font-bold">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className={cn(!bare && 'overflow-y-auto px-6 py-5')}>{children}</div>
          </motion.div>
          {floatingCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title || 'dialog'}`}
              className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/20 transition hover:bg-black"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
