import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: string;
}

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items to display right now.',
  actionText,
  onAction,
  icon = '📦'
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h4 className="empty-title">{title}</h4>
      <p className="empty-desc">{description}</p>
      {actionText && onAction && (
        <button type="button" className="btn primary empty-action" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}

