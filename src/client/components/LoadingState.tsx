import React from 'react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'جاري التحقق واسترجاع الأدلة الموثقة...',
  subMessage = 'تجري المطابقة مع نصوص المصادر المعتمدة',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-space-xl text-center">
      <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low shadow-sm mb-space-md">
        <span className="material-symbols-outlined text-3xl text-secondary animate-spin">
          progress_activity
        </span>
      </div>
      <p className="font-title-md text-title-md text-primary font-bold mb-space-xs">{message}</p>
      {subMessage && (
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">{subMessage}</p>
      )}
    </div>
  );
};
