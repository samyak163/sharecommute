"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function Modal({
  title,
  children,
  close,
  wide = false,
  errorMessage,
  busy = false,
  footer,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
  errorMessage?: string;
  busy?: boolean;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""} ${footer ? "modal-with-footer" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else close();
      }}
      onClick={(e) => {
        if (!busy && e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {errorMessage && (
        <p className="warning modal-error" role="alert">
          {errorMessage}
        </p>
      )}
      {footer ? (
        <>
          <div className="modal-scroll-body">{children}</div>
          <div className="modal-fixed-footer">{footer}</div>
        </>
      ) : (
        children
      )}
    </dialog>
  );
}
