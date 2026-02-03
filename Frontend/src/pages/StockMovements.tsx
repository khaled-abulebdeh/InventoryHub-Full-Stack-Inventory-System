import { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, Filter, Download, Calendar, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StockMovementType } from '@/types/inventory';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

const API_BASE = 'http://127.0.0.1:5000/api';

const movementTypes: StockMovementType[] = [
  'INBOUND',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
];

type DatePreset = 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'all';
type SortBy = 'date' | 'product' | 'quantity' | 'type';
type SortOrder = 'asc' | 'desc';

export default function StockMovements() {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'ALL'>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Data state
  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search term for SQL query (600ms after typing stops)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch movements from API with SQL-based filters
  const fetchMovements = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const params = new URLSearchParams();

      // Warehouse filter
      if (warehouseFilter && warehouseFilter !== 'ALL') {
        params.append('warehouse_id', warehouseFilter);
      }

      // Type filter
      if (typeFilter && typeFilter !== 'ALL') {
        params.append('movement_type', typeFilter);
      }

      // Date range filter
      if (dateRange.from && dateRange.to) {
        params.append('date_from', dateRange.from.toISOString());
        params.append('date_to', dateRange.to.toISOString());
      }

      // Search filter (SQL-based via debounced value)
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      // Sorting
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);

      const res = await fetch(`${API_BASE}/stock-movements?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Convert date strings to Date objects
        const movementsWithDates = data.map((m: any) => ({
          ...m,
          createdAt: m.date ? new Date(m.date) : new Date(),
        }));
        setMovements(movementsWithDates);
      }
    } catch (e) {
      console.error('Failed to load stock movements:', e);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, typeFilter, dateRange, debouncedSearch, sortBy, sortOrder]);

  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/warehouses`);
      if (res.ok) {
        setWarehouses(await res.json());
      }
    } catch (e) {
      console.error('Failed to load warehouses:', e);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Initial load with loading spinner
  useEffect(() => {
    fetchMovements(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent filter changes without loading spinner (smoother UX)
  useEffect(() => {
    // Skip initial render
    if (movements.length > 0 || !loading) {
      fetchMovements(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseFilter, typeFilter, dateRange, debouncedSearch, sortBy, sortOrder]);

  // Calculate date range based on preset
  const getDateRangeFromPreset = (preset: DatePreset) => {
    const now = new Date();
    switch (preset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'thisWeek':
        // Week starts on Sunday (weekStartsOn: 0)
        return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'thisMonth':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'thisYear':
        return { from: startOfYear(now), to: endOfYear(now) };
      case 'all':
      default:
        return { from: null, to: null };
    }
  };

  // Apply date preset
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setDateRange(getDateRangeFromPreset(preset));
  };

  // Calculate summary metrics from server-filtered data
  const summaryMetrics = useMemo(() => {
    const inbound = movements.reduce(
      (sum, m) => sum + (m.quantityChange > 0 ? m.quantityChange : 0),
      0
    );
    const outbound = movements.reduce(
      (sum, m) => sum + (m.quantityChange < 0 ? Math.abs(m.quantityChange) : 0),
      0
    );
    return { inbound, outbound };
  }, [movements]);

  // Dynamic sort order options based on sortBy
  const getSortOrderOptions = () => {
    switch (sortBy) {
      case 'date':
        return [
          { value: 'desc', label: 'Newest First' },
          { value: 'asc', label: 'Oldest First' },
        ];
      case 'product':
      case 'type':
        return [
          { value: 'asc', label: 'A-Z' },
          { value: 'desc', label: 'Z-A' },
        ];
      case 'quantity':
        return [
          { value: 'desc', label: 'Largest Change' },
          { value: 'asc', label: 'Smallest Change' },
        ];
      default:
        return [
          { value: 'desc', label: 'Descending' },
          { value: 'asc', label: 'Ascending' },
        ];
    }
  };


  // CSV Export function
  const handleExportCSV = () => {
    if (!movements.length) return;

    const headers = [
      'Date',
      'Time',
      'Movement ID',
      'Product',
      'Variant',
      'Warehouse',
      'Quantity Change',
      'Type',
      'Reference ID',
      'Created By',
    ];

    const rows = movements.map((movement) => [
      format(movement.createdAt, 'yyyy-MM-dd'),
      format(movement.createdAt, 'HH:mm:ss'),
      movement.id,
      movement.productName,
      movement.variantName,
      movement.warehouseName,
      movement.quantityChange.toString(),
      movement.type,
      movement.referenceId || 'N/A',
      movement.createdBy,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `stock_movements_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading stock movements...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title="Stock Movements"
          description="Audit trail of all inventory changes"
        />
        <Button onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Inbound Total</p>
              <p className="text-2xl font-semibold text-emerald-700">
                +{summaryMetrics.inbound.toLocaleString()} units
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Outbound Total</p>
              <p className="text-2xl font-semibold text-red-700">
                -{summaryMetrics.outbound.toLocaleString()} units
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
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
                <SelectItem key={warehouse.Warehouse_ID} value={warehouse.Warehouse_ID.toString()}>
                  {warehouse.Name}
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

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Period:</span>
            <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as DatePreset)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">This Day</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
              </SelectContent>
            </Select>
            {dateRange.from && dateRange.to && (
              <span className="text-sm text-muted-foreground">
                ({format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')})
              </span>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Sort:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="quantity">Quantity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getSortOrderOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
        data={movements}
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
