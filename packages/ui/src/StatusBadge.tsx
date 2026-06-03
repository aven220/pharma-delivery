import React from 'react';

const colors: Record<string, string> = {
  PENDING: '#eab308',
  ASSIGNED: '#3b82f6',
  IN_ROUTE: '#6366f1',
  DELIVERED: '#22c55e',
  FAILED: '#ef4444',
  CANCELLED: '#94a3b8',
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const style: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: colors[status] || '#94a3b8',
    color: '#fff',
    borderRadius: 12,
    padding: size === 'sm' ? '2px 8px' : '4px 12px',
    fontSize: size === 'sm' ? 11 : 13,
    fontWeight: 600,
  };

  return <span style={style}>{status}</span>;
}
