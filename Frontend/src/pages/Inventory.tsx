import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Warehouse, AlertTriangle, Package, Search, Loader2,
  History as HistoryIcon, ArrowUpRight, ArrowDownRight, X, Settings, TrendingUp, Tag, FolderTree, AlertOctagon, Truck
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryFilters, InventoryFiltersState } from '@/components/InventoryFilters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { StockAdjustmentDialog } from '@/components/StockAdjustmentDialog';
import { StockTransferDialog } from '@/components/StockTransferDialog';
import { Download, RefreshCw, ArrowRightLeft } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api';
const LOW_STOCK_THRESHOLD = 10;

export default function Inventory() {
  const [searchParams] = useSearchParams();

  // Backwards compatibility for URL params, but prioritizing filter state
  const [filters, setFilters] = useState<InventoryFiltersState>({
    warehouse_id: searchParams.get('warehouse') || 'ALL',
    search: '',
    stock_status: (searchParams.get('filter')?.toUpperCase() as any) || 'ALL'
  });

  const [sortConfig, setSortConfig] = useState({ column: 'name', direction: 'asc' as 'asc' | 'desc' });

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Drilldown State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Threshold Edit State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newThreshold, setNewThreshold] = useState<number>(10);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);

  // Advanced Actions State
  const [adjustItem, setAdjustItem] = useState<any>(null);
  const [transferItem, setTransferItem] = useState<any>(null);
  const { toast } = useToast();

  const fetchInventory = useCallback(async (currentFilters: InventoryFiltersState = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (currentFilters.warehouse_id && currentFilters.warehouse_id !== 'ALL') {
        params.append('warehouse_id', currentFilters.warehouse_id);
      }
      if (currentFilters.search) {
        params.append('search', currentFilters.search);
      }
      if (currentFilters.stock_status && currentFilters.stock_status !== 'ALL') {
        params.append('stock_status', currentFilters.stock_status);
      }
      if (currentFilters.brand_id && currentFilters.brand_id !== 'ALL') {
        params.append('brand_id', currentFilters.brand_id);
      }
      if (currentFilters.category_id && currentFilters.category_id !== 'ALL') {
        params.append('category_id', currentFilters.category_id);
      }

      // Add Sorting
      params.append('sort_by', sortConfig.column);
      params.append('sort_order', sortConfig.direction);

      const res = await fetch(`${API_BASE}/inventory?${params.toString()}`);
      if (res.ok) {
        setInventoryItems(await res.json());
      }
    } catch (e) {
      console.error("Failed to load inventory data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${API_BASE}/warehouses`);
      if (res.ok) setWarehouses(await res.json());
    } catch (e) {
      console.error("Failed to load warehouses:", e);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_BASE}/brands`);
      if (res.ok) setBrands(await res.json());
    } catch (e) {
      console.error("Failed to load brands:", e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchBrands();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchInventory(filters);
  }, [filters, sortConfig, fetchInventory]);

  const handleSort = (column: string) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = useCallback((newFilters: InventoryFiltersState) => {
    setFilters((prev) => {
      // Deep compare to avoid unnecessary updates and loops
      if (JSON.stringify(prev) === JSON.stringify(newFilters)) {
        return prev;
      }
      return newFilters;
    });
  }, []);

  const fetchHistory = async (pvId: number, whId: number) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_BASE}/inventory/history?product_variant_id=${pvId}&warehouse_id=${whId}`);
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch handled by filters useEffect
  }, []);

  const handleViewHistory = (item: any) => {
    setSelectedItem(item);
    fetchHistory(item.productVariantId, item.warehouseId);
  };

  const handleEditThreshold = (item: any) => {
    setEditingItem(item);
    setNewThreshold(item.reorderLevel || 10);
  };

  const saveThreshold = async () => {
    if (!editingItem) return;
    try {
      setUpdatingThreshold(true);
      const res = await fetch(`${API_BASE}/inventory/threshold`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: editingItem.warehouseId,
          product_variant_id: editingItem.productVariantId,
          reorder_level: newThreshold
        })
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Reorder level updated successfully' });
        setEditingItem(null);
        fetchInventory(); // Refresh list
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to update threshold', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to connect to server', variant: 'destructive' });
    } finally {
      setUpdatingThreshold(false);
    }
  };

  const handleAdjustStock = async (data: any) => {
    try {
      const res = await fetch(`${API_BASE}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast({ title: "Success", description: "Stock adjusted successfully" });
        fetchInventory();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to adjust stock", variant: "destructive" });
    }
  };

  const handleTransferStock = async (data: any) => {
    try {
      const res = await fetch(`${API_BASE}/inventory/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast({ title: "Success", description: "Stock transferred successfully" });
        fetchInventory();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to transfer stock", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    if (!inventoryItems.length) return;

    // Flatten data for CSV
    const headers = ["Warehouse", "Product", "SKU", "Category", "Brand", "Quantity", "Unit Price", "Total Value"];
    const rows = inventoryItems.map(item => [
      item.warehouseName,
      item.productName,
      item.sku,
      item.category,
      item.brand,
      item.quantity,
      item.unitPrice,
      (item.quantity * item.unitPrice).toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side filtering removed - using backend filtering now
  const filteredItems = inventoryItems;

  const totalUnits = filteredItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalValue = filteredItems.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);

  // NOTE: Low stock count might be inaccurate if filters exclude them, 
  // but for the current filtered view it is correct.
  const lowStockCount = filteredItems.filter(
    (item) => item.quantity <= (item.reorderLevel || LOW_STOCK_THRESHOLD)
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading inventory data...</p>
      </div>
    );
  }

  // Group items by Product Name + Brand for the main table view
  const groupInventoryByProduct = (items: any[]) => {
    const groups: { [key: string]: any } = {};

    items.forEach(item => {
      const key = `${item.productName}-${item.brand}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          productName: item.productName,
          brand: item.brand,
          category: item.category,
          totalQuantity: 0,
          totalValue: 0,
          variants: [],
          warehouseNames: new Set(),
          supplierNames: new Set()
        };
      }
      groups[key].totalQuantity += item.quantity;
      groups[key].totalValue += item.totalValue;
      groups[key].variants.push(item);
      groups[key].warehouseNames.add(item.warehouseName);
      if (item.supplierName && item.supplierName !== "N/A") {
        groups[key].supplierNames.add(item.supplierName);
      }
    });

    return Object.values(groups).map(g => ({
      ...g,
      warehouseCount: g.warehouseNames.size,
      warehouseList: Array.from(g.warehouseNames).join(', '),
      supplierName: Array.from(g.supplierNames).join(', ') || "N/A"
    }));
  };

  const groupedItems = groupInventoryByProduct(filteredItems);
  const selectedProductGroup = selectedGroupId ? groupedItems.find(g => g.id === selectedGroupId) : null;

  // Detail View Handlers
  const handleProductClick = (group: any) => {
    setSelectedGroupId(group.id);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title="Inventory"
          description="View current stock levels across warehouses"
        />
        <Button variant="outline" onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800">Low Stock Alert</h4>
            <p className="text-sm text-amber-700 mt-1">
              Attention needed: <span className="font-bold">{lowStockCount} items</span> are currently below their reorder level.
              Please review the "Low Stock" filter or check the table below to prevent stockouts.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Products</p>
              <p className="text-2xl font-semibold">{groupedItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Units</p>
              <p className="text-2xl font-semibold">{totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Low Stock Items</p>
              <p className="text-2xl font-semibold">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Valuation</p>
              <p className="text-2xl font-semibold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

      </div>



      {/* Filters */}
      {/* Filters */}
      <InventoryFilters
        initialFilters={filters}
        onFilterChange={handleFilterChange}
        warehouses={warehouses}
        brands={brands}
        categories={categories}
      />

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <DataTable
          columns={[
            {
              key: 'product',
              header: 'Product',
              render: (group) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{group.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {group.variants.length} Variants
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Category',
              render: (group) => (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 w-fit">
                  <FolderTree className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight">{group.category}</span>
                </div>
              ),
            },
            {
              key: 'brand',
              header: 'Brand',
              render: (group) => (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50/50 border border-indigo-100 w-fit">
                  <Tag className="w-3 h-3 text-indigo-400" />
                  <span className="text-xs font-black text-indigo-700 uppercase tracking-tighter">{group.brand}</span>
                </div>
              ),
            },
            {
              key: 'supplier',
              header: 'Pref. Supplier',
              sortable: true,
              render: (group) => (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Truck className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-medium truncate max-w-[120px]" title={group.supplierName}>{group.supplierName}</span>
                </div>
              ),
            },
            {
              key: 'totalQuantity',
              header: 'Total On Hand',
              sortable: true,
              render: (group) => (
                <span className="text-sm font-bold text-slate-900">{group.totalQuantity} units</span>
              ),
            },
            {
              key: 'totalValue',
              header: 'Total Value',
              sortable: true,
              render: (group) => (
                <span className="text-sm font-bold text-emerald-700">${group.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              ),
            },
          ]}
          data={groupedItems}
          keyExtractor={(group) => group.id}
          onRowClick={handleProductClick}
          emptyMessage="No inventory entries match your filters"
          onSort={(key) => {
            // Map frontend keys to backend sort keys
            const map: any = { 'totalQuantity': 'quantity', 'totalValue': 'value', 'product': 'name', 'supplier': 'supplier', 'sku': 'sku' };
            handleSort(map[key] || key);
          }}
          sortColumn={Object.keys({ 'quantity': 'totalQuantity', 'value': 'totalValue', 'name': 'product', 'supplier': 'supplier' }).find(k => ({ 'quantity': 'totalQuantity', 'value': 'totalValue', 'name': 'product', 'supplier': 'supplier' } as any)[k] === sortConfig.column) || sortConfig.column}
          sortDirection={sortConfig.direction}
        />
      </div>

      {/* PRODUCT DETAILS DIALOG (VARIANTS) */}
      <Dialog open={!!selectedProductGroup} onOpenChange={(open) => !open && setSelectedGroupId(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Package className="w-6 h-6 text-primary" />
              {selectedProductGroup?.productName}
            </DialogTitle>
            <div className="text-sm text-muted-foreground flex gap-4 mt-1">
              <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> {selectedProductGroup?.brand}</span>
              <span className="flex items-center gap-1.5"><FolderTree className="w-3.5 h-3.5" /> {selectedProductGroup?.category}</span>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0">
            <DataTable
              className="border-0 shadow-none rounded-none"
              columns={[
                {
                  key: 'variantName',
                  header: 'Variant',
                  render: (item: any) => (
                    <div className="font-medium text-sm">{item.variantName}</div>
                  )
                },
                {
                  key: 'sku',
                  header: 'SKU',
                  render: (item: any) => (
                    <code className="text-[12px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{item.sku}</code>
                  )
                },
                {
                  key: 'warehouseName',
                  header: 'Location',
                  render: (item: any) => (
                    <span className="flex items-center gap-1 text-sm text-slate-600">
                      <Warehouse className="w-3 h-3 text-muted-foreground" />
                      {item.warehouseName}
                    </span>
                  )
                },
                {
                  key: 'quantity',
                  header: 'On Hand Qty',
                  render: (item: any) => (
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-bold', item.quantity <= (item.reorderLevel || LOW_STOCK_THRESHOLD) ? 'text-amber-600' : 'text-slate-900')}>
                        {item.quantity}
                      </span>
                      {item.quantity <= (item.reorderLevel || LOW_STOCK_THRESHOLD) && (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  )
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (item: any) => (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setAdjustItem(item); }}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded transition-all border border-slate-200"
                        title="Adjust Stock"
                      >
                        <Settings className="w-3 h-3" /> Adjust
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setTransferItem(item); }}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded transition-all border border-slate-200"
                        title="Transfer Stock"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Transfer
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewHistory(item); }}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-foreground hover:bg-primary px-2 py-1 rounded transition-all border border-primary/20"
                      >
                        <HistoryIcon className="w-3 h-3" /> History
                      </button>
                    </div>
                  )
                }
              ]}
              data={selectedProductGroup?.variants || []}
              keyExtractor={(item: any) => item.id}
            />
          </div>

          <div className="p-4 bg-slate-50 border-t flex justify-end">
            <Button variant="outline" onClick={() => setSelectedGroupId(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* History Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <HistoryIcon className="w-5 h-5 text-primary" />
              Stock Ledger: {selectedItem?.productName}
            </DialogTitle>
            <div className="text-sm text-muted-foreground flex gap-3 mt-1">
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {selectedItem?.sku}</span>
              <span className="flex items-center gap-1"><Warehouse className="w-3.5 h-3.5" /> {selectedItem?.warehouseName}</span>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground italic">
                No movement history recorded yet.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-6 py-2">
                {history.map((m) => (
                  <div key={m.id} className="relative">
                    {/* Timeline Dot */}
                    <div className={cn(
                      "absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                      m.type === 'INBOUND' ? 'bg-emerald-500' : 'bg-slate-400'
                    )} />

                    <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                          m.type === 'INBOUND' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {m.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {format(new Date(m.date), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2">
                          {m.quantityChange > 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={cn(
                            "text-lg font-bold",
                            m.quantityChange > 0 ? "text-emerald-700" : "text-slate-700"
                          )}>
                            {m.quantityChange > 0 ? '+' : ''}{m.quantityChange}
                          </span>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Reference</p>
                          <p className="text-xs font-mono font-semibold text-slate-600">
                            {m.referenceType}: {m.referenceId}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t flex justify-end">
            <button
              onClick={() => setSelectedItem(null)}
              className="bg-slate-900 text-white text-sm font-bold px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Close Ledger
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Threshold Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Low Stock Threshold</DialogTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Set the minimum stock level for <span className="font-bold text-foreground">{editingItem?.productName}</span> at <span className="font-bold text-foreground">{editingItem?.warehouseName}</span>.
            </div>
          </DialogHeader>

          <div className="py-6">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Min. Reorder Level
            </label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value) || 0)}
                className="text-lg font-bold"
                min="0"
              />
              <div className="text-[11px] text-muted-foreground italic leading-tight">
                Current stock is {editingItem?.quantity}. An alert will trigger when it reaches {newThreshold} or below.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={saveThreshold} disabled={updatingThreshold}>
              {updatingThreshold ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Threshold
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StockAdjustmentDialog
        open={!!adjustItem}
        onOpenChange={(open) => !open && setAdjustItem(null)}
        item={adjustItem}
        onConfirm={handleAdjustStock}
      />

      <StockTransferDialog
        open={!!transferItem}
        onOpenChange={(open) => !open && setTransferItem(null)}
        item={transferItem}
        onConfirm={handleTransferStock}
      />
    </div >
  );
}
