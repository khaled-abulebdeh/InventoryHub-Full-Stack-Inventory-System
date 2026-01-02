import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconColor?: 'primary' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    label: string;
  };
}

const iconColorClasses = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  error: 'bg-status-error/10 text-status-error',
};

export function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'primary',
  trend,
}: SummaryCardProps) {
  return (
    <div className="summary-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-2 text-sm font-medium',
                trend.value >= 0 ? 'text-status-success' : 'text-status-error'
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('summary-card-icon', iconColorClasses[iconColor])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
