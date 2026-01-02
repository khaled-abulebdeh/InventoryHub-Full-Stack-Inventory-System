import { cn } from '@/lib/utils';
import { PurchaseOrderStatus, PaymentStatus, StockMovementType } from '@/types/inventory';

type StatusType = PurchaseOrderStatus | PaymentStatus | StockMovementType;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Purchase Order Status
  CREATED: { label: 'Created', className: 'status-created' },
  SENT: { label: 'Sent', className: 'status-sent' },
  PARTIALLY_RECEIVED: { label: 'Partial', className: 'status-partial' },
  COMPLETED: { label: 'Completed', className: 'status-completed' },
  CANCELLED: { label: 'Cancelled', className: 'status-cancelled' },
  
  // Payment Status
  PENDING: { label: 'Pending', className: 'status-pending' },
  SUCCESS: { label: 'Success', className: 'status-completed' },
  FAILED: { label: 'Failed', className: 'status-cancelled' },
  REFUNDED: { label: 'Refunded', className: 'status-partial' },
  
  // Stock Movement Type
  GOODS_RECEIPT: { label: 'Goods Receipt', className: 'status-completed' },
  ADJUSTMENT: { label: 'Adjustment', className: 'status-partial' },
  TRANSFER_IN: { label: 'Transfer In', className: 'status-sent' },
  TRANSFER_OUT: { label: 'Transfer Out', className: 'status-pending' },
  RETURN: { label: 'Return', className: 'status-cancelled' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'status-created' };
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
}
