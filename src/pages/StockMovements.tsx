import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { stockMovements, warehouses } from '@/data/mockData';
import { StockMovementType } from '@/types/inventory';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const movementTypes: StockMovementType[] = [
  'GOODS_RECEIPT',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'RETURN',
];

export default function StockMovements() {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'ALL'>('ALL');

  const filteredMovements = stockMovements
    .filter((movement) => {
      const matchesSearch =
        movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.variantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWarehouse =
        warehouseFilter === 'ALL' || movement.warehouseId === warehouseFilter;

      const matchesType = typeFilter === 'ALL' || movement.type === typeFilter;

      return matchesSearch && matchesWarehouse && matchesType;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        description="Audit trail of all inventory changes"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or movement ID..."
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
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as StockMovementType | 'ALL')}
        >
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {movementTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: 'createdAt',
            header: 'Date & Time',
            render: (movement) => (
              <div className="text-sm">
                <p className="font-medium">{format(movement.createdAt, 'MMM d, yyyy')}</p>
                <p className="text-muted-foreground">{format(movement.createdAt, 'HH:mm:ss')}</p>
              </div>
            ),
          },
          {
            key: 'id',
            header: 'Movement ID',
            render: (movement) => (
              <code className="text-sm bg-muted px-2 py-1 rounded">{movement.id}</code>
            ),
          },
          {
            key: 'product',
            header: 'Product',
            render: (movement) => (
              <div>
                <p className="font-medium text-foreground">{movement.productName}</p>
                <p className="text-sm text-muted-foreground">{movement.variantName}</p>
              </div>
            ),
          },
          { key: 'warehouseName', header: 'Warehouse' },
          {
            key: 'quantityChange',
            header: 'Quantity Change',
            render: (movement) => (
              <div className="flex items-center gap-2">
                {movement.quantityChange > 0 ? (
                  <div className="w-6 h-6 rounded-full bg-status-success/10 flex items-center justify-center">
                    <ArrowUpRight className="w-3 h-3 text-status-success" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-status-error/10 flex items-center justify-center">
                    <ArrowDownRight className="w-3 h-3 text-status-error" />
                  </div>
                )}
                <span
                  className={cn(
                    'text-lg font-semibold',
                    movement.quantityChange > 0 ? 'text-status-success' : 'text-status-error'
                  )}
                >
                  {movement.quantityChange > 0 ? '+' : ''}
                  {movement.quantityChange}
                </span>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (movement) => <StatusBadge status={movement.type} />,
          },
          {
            key: 'referenceId',
            header: 'Reference',
            render: (movement) =>
              movement.referenceId ? (
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {movement.referenceId}
                </code>
              ) : (
                <span className="text-muted-foreground">-</span>
              ),
          },
          {
            key: 'createdBy',
            header: 'Created By',
            render: (movement) => (
              <span className="text-muted-foreground">{movement.createdBy}</span>
            ),
          },
        ]}
        data={filteredMovements}
        keyExtractor={(movement) => movement.id}
        emptyMessage="No stock movements found"
      />

      <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Audit Trail:</strong> This log records all inventory changes including goods
          receipts, stock adjustments, and transfers. These records are immutable and used to
          derive current inventory quantities.
        </p>
      </div>
    </div>
  );
}
