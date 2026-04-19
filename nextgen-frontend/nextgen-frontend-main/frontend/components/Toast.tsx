import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 3000 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 
                   type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
  
  const textColor = type === 'success' ? 'text-white' : 'text-white';

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`${bgColor} ${textColor} px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-sm`}>
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
        ) : type === 'error' ? (
          <XCircle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 flex-shrink-0 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
            <span className="text-xs font-bold">!</span>
          </div>
        )}
        <p className="flex-1 text-sm font-medium">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className={`${textColor} hover:opacity-80 transition-opacity p-1 rounded-full`}
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
