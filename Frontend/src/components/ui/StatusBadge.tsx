import { cn } from '@/lib/utils';
import { PurchaseOrderStatus, PaymentStatus, StockMovementType } from '@/types/inventory';

type StatusType = PurchaseOrderStatus | PaymentStatus | StockMovementType | 'ACTIVE' | 'LOW_STOCK' | 'LIVE' | 'AWAITING';

interface StatusBadgeProps {
  status: any; // Allow any to be flexible with backend strings
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Core Statuses
  ACTIVE: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  LIVE: { label: 'Live', className: 'bg-emerald-500 text-white animate-pulse border-none text-[8px] px-1.5 py-0' },
  AWAITING: { label: 'Awaiting', className: 'status-pending' },
  LOW_STOCK: { label: 'Low Stock', className: 'status-cancelled' },

  // Purchase Order Status
  PENDING: { label: 'Pending', className: 'status-pending' },
  RECEIVED: { label: 'Received', className: 'status-completed' },
  CANCELLED: { label: 'Cancelled', className: 'status-cancelled' },

  // Payment Status (PENDING already defined above, shared with PO)
  SUCCESS: { label: 'Success', className: 'status-completed' },
  FAILED: { label: 'Failed', className: 'status-cancelled' },
  REFUNDED: { label: 'Refunded', className: 'status-partial' },

  // Stock Movement Type
  GOODS_RECEIPT: { label: 'Goods Receipt', className: 'status-completed' },
  ADJUSTMENT: { label: 'Adjustment', className: 'status-partial' },
  TRANSFER_IN: { label: 'Transfer In', className: 'status-sent' },
  TRANSFER_OUT: { label: 'Transfer Out', className: 'status-pending' },
  RETURN: { label: 'Return', className: 'status-cancelled' },

  // Customer Order Status
  PLACED: { label: 'Placed', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SHIPPED: { label: 'Shipped', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-700 border-green-200' },
  PAID: { label: 'Paid', className: 'status-completed' },
  RETURNED: { label: 'Returned', className: 'bg-orange-100 text-orange-700 border-orange-200' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'status-created' };

  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
}
