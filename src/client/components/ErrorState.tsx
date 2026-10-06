import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'تعذر إتمام الطلب',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-space-lg text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm max-w-md mx-auto my-space-md">
      <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-space-sm">
        <span className="material-symbols-outlined text-2xl">error_outline</span>
      </div>
      <h3 className="font-title-md text-title-md text-on-surface font-bold mb-space-xs">{title}</h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-space-xs px-space-md py-space-xs bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          <span>إعادة المحاولة</span>
        </button>
      )}
    </div>
  );
};
