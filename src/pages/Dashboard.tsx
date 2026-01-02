import { Package, Truck, AlertTriangle, ClipboardList, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { products, suppliers, getLowStockItems, getPendingPurchaseOrders, stockMovements } from '@/data/mockData';
import { format } from 'date-fns';

export default function Dashboard() {
  const lowStockItems = getLowStockItems(10);
  const pendingPOs = getPendingPurchaseOrders();
  const recentMovements = stockMovements.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your inventory and purchasing operations"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Total Products"
          value={products.length}
          subtitle={`${products.filter(p => p.category === 'Electronics').length} Electronics`}
          icon={<Package className="w-6 h-6" />}
          iconColor="primary"
        />
        <SummaryCard
          title="Suppliers"
          value={suppliers.length}
          subtitle="Active partners"
          icon={<Truck className="w-6 h-6" />}
          iconColor="success"
        />
        <SummaryCard
          title="Low Stock Items"
          value={lowStockItems.length}
          subtitle="Below threshold (10 units)"
          icon={<AlertTriangle className="w-6 h-6" />}
          iconColor="warning"
        />
        <SummaryCard
          title="Pending POs"
          value={pendingPOs.length}
          subtitle="Awaiting completion"
          icon={<ClipboardList className="w-6 h-6" />}
          iconColor="primary"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
              Low Stock Alert
            </h2>
          </div>
          <div className="p-4">
            {lowStockItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">All items are well stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">{item.variantName} • {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-status-warning">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">{item.warehouseName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent Stock Movements
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {recentMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {movement.quantityChange > 0 ? (
                      <div className="w-8 h-8 rounded-full bg-status-success/10 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-status-success" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-status-error/10 flex items-center justify-center">
                        <ArrowDownRight className="w-4 h-4 text-status-error" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{movement.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(movement.createdAt, 'MMM d, yyyy')} • {movement.warehouseName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${
                        movement.quantityChange > 0 ? 'text-status-success' : 'text-status-error'
                      }`}
                    >
                      {movement.quantityChange > 0 ? '+' : ''}
                      {movement.quantityChange}
                    </p>
                    <StatusBadge status={movement.type} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Purchase Orders */}
      <div className="mt-6">
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Pending Purchase Orders</h2>
          </div>
          <DataTable
            columns={[
              { key: 'id', header: 'PO Number' },
              { key: 'supplierName', header: 'Supplier' },
              {
                key: 'status',
                header: 'Status',
                render: (po) => <StatusBadge status={po.status} />,
              },
              {
                key: 'totalAmount',
                header: 'Amount',
                render: (po) => `$${po.totalAmount.toLocaleString()}`,
              },
              {
                key: 'createdAt',
                header: 'Created',
                render: (po) => format(po.createdAt, 'MMM d, yyyy'),
              },
              {
                key: 'expectedDelivery',
                header: 'Expected Delivery',
                render: (po) =>
                  po.expectedDelivery ? format(po.expectedDelivery, 'MMM d, yyyy') : '-',
              },
            ]}
            data={pendingPOs}
            keyExtractor={(po) => po.id}
            emptyMessage="No pending purchase orders"
          />
        </div>
      </div>
    </div>
  );
}
