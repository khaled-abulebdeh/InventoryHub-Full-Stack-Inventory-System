import { useState } from 'react';
import { Warehouse, AlertTriangle, Package, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { inventoryItems, warehouses } from '@/data/mockData';
import { cn } from '@/lib/utils';

const LOW_STOCK_THRESHOLD = 10;

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'NORMAL'>('ALL');

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.variantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWarehouse =
      warehouseFilter === 'ALL' || item.warehouseId === warehouseFilter;

    const matchesStock =
      stockFilter === 'ALL' ||
      (stockFilter === 'LOW' && item.quantity <= LOW_STOCK_THRESHOLD) ||
      (stockFilter === 'NORMAL' && item.quantity > LOW_STOCK_THRESHOLD);

    return matchesSearch && matchesWarehouse && matchesStock;
  });

  const totalUnits = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = filteredItems.filter(
    (item) => item.quantity <= LOW_STOCK_THRESHOLD
  ).length;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="View current stock levels across warehouses (read-only)"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total SKUs</p>
              <p className="text-2xl font-semibold">{filteredItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-success/10 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-status-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="text-2xl font-semibold">{totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <p className="text-2xl font-semibold">{lowStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product, variant, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Warehouses</SelectItem>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as 'ALL' | 'LOW' | 'NORMAL')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Stock Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Levels</SelectItem>
            <SelectItem value="LOW">Low Stock</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: 'product',
            header: 'Product',
            render: (item) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">{item.variantName}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'sku',
            header: 'SKU',
            render: (item) => (
              <code className="text-sm bg-muted px-2 py-1 rounded">{item.sku}</code>
            ),
          },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            render: (item) => (
              <span className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-muted-foreground" />
                {item.warehouseName}
              </span>
            ),
          },
          {
            key: 'quantity',
            header: 'Quantity',
            render: (item) => (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-lg font-semibold',
                    item.quantity <= LOW_STOCK_THRESHOLD
                      ? 'text-status-warning'
                      : 'text-foreground'
                  )}
                >
                  {item.quantity}
                </span>
                {item.quantity <= LOW_STOCK_THRESHOLD && (
                  <AlertTriangle className="w-4 h-4 text-status-warning" />
                )}
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (item) => (
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  item.quantity <= LOW_STOCK_THRESHOLD
                    ? 'bg-status-warning/10 text-status-warning'
                    : 'bg-status-success/10 text-status-success'
                )}
              >
                {item.quantity <= LOW_STOCK_THRESHOLD ? 'Low Stock' : 'In Stock'}
              </span>
            ),
          },
        ]}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        emptyMessage="No inventory items found"
      />

      <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Inventory quantities are derived from stock movements and cannot be
          edited directly. To increase stock, record a Goods Receipt. To adjust stock, create a
          stock adjustment movement.
        </p>
      </div>
    </div>
  );
}
