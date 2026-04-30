'use client';

import { useEffect, useRef, useState } from 'react';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  confirmLabel?: string;
  confirmClass?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  isLoading?: boolean;
}

export default function Modal({
  title,
  isOpen,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmClass = 'btn-danger',
  requireReason = false,
  reasonLabel = 'Reason',
  isLoading = false,
}: ModalProps) {
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

        {requireReason && (
          <div className="mb-4">
            <label className="label">{reasonLabel}</label>
            <textarea
              ref={inputRef}
              className="input h-24 resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Enter reason..."
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className={confirmClass}
            onClick={handleConfirm}
            disabled={isLoading || (requireReason && !reason.trim())}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
