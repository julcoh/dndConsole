import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ComponentChildren;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleBackdropClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === dialogRef.current) {
      onClose();
    }
  };

  // Always render the dialog element so useEffect can manage its state
  return (
    <dialog
      ref={dialogRef}
      class="modal"
      onClick={handleBackdropClick}
      style={{ display: isOpen ? undefined : 'none' }}
    >
      {isOpen && (
        <div class="modal__content">
          {title && (
            <div class="modal__header">
              <h2 class="modal__title">{title}</h2>
              <button class="modal__close" onClick={onClose} aria-label="Close">×</button>
            </div>
          )}
          <div class="modal__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}
