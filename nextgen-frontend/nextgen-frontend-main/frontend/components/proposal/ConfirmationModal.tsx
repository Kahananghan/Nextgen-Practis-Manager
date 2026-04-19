import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

export type IconType = 'alert' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  iconType?: IconType;
  isLoading?: boolean;
  isDisabled?: boolean;
  customContent?: React.ReactNode;
}

const iconConfig = {
  alert: {
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonColor: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
  },
  info: {
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    buttonColor: 'bg-indigo-600 hover:bg-indigo-700',
  },
  success: {
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
};

const icons: Record<IconType, React.ReactNode> = {
  alert: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
  ),
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="8" y2="12"/>
      <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <line x1="12" x2="12" y1="8" y2="12"/>
      <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  iconType = 'info',
  isLoading = false,
  isDisabled = false,
  customContent,
}) => {
  if (!isOpen) return null;

  const config = iconConfig[iconType];

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 ${config.bgColor} rounded-full flex items-center justify-center ${config.iconColor}`}>
            {icons[iconType]}
          </div>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        {customContent && <div className="mb-6">{customContent}</div>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || isDisabled}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonColor}`}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {confirmText}ing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
