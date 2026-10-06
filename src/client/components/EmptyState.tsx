import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-space-xl text-center bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant my-space-md">
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline mb-space-sm">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="font-title-md text-title-md text-primary font-bold mb-space-xs">{title}</h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mb-space-md">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-space-xs px-space-md py-space-xs bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm"
        >
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
