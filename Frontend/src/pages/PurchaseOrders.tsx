import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, FileText, Calendar, DollarSign } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/types/inventory';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { POAddItemDialog } from '@/components/POAddItemDialog';
import { PurchaseOrderFilters, PurchaseOrderFiltersState } from '@/components/PurchaseOrderFilters';

const API_URL = 'http://127.0.0.1:5000/api/purchase-orders';
const API_BASE = 'http://127.0.0.1:5000/api';

// Helper to get logged-in admin ID from storage
const getLoggedInAdminId = (): number | null => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!userStr) {
    const adminId = localStorage.getItem('adminId') || sessionStorage.getItem('adminId');
    return adminId ? Number(adminId) : null;
  }
  try {
    const user = JSON.parse(userStr);
    return user.adminId || null;
  } catch {
    return null;
  }
};

// Helper to safely format dates
const safeFormat = (date: any, fmt: string) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return format(d, fmt);
  } catch {
    return '-';
  }
};

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [filters, setFilters] = useState<PurchaseOrderFiltersState>({});

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // New PO State
  const [poSupplier, setPoSupplier] = useState<{ id: number, name: string } | null>(null);
  const [poWarehouse, setPoWarehouse] = useState<{ id: number, name: string } | null>(null);
  const [poItems, setPoItems] = useState<any[]>([]);

  // Warehouses for dropdown
  const [warehouses, setWarehouses] = useState<{ Warehouse_ID: number, Name: string }[]>([]);

  // State to hold the PO just created for display
  const [createdPO, setCreatedPO] = useState<any>(null);

  const { toast } = useToast();

  const fetchPurchaseOrders = useCallback(async (currentFilters: PurchaseOrderFiltersState = filters) => {
    const params = new URLSearchParams();
    if (currentFilters.status && currentFilters.status !== 'ALL') params.append('status', currentFilters.status);
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.product_search) params.append('product_search', currentFilters.product_search);
    if (currentFilters.start_date) params.append('start_date', currentFilters.start_date);
    if (currentFilters.end_date) params.append('end_date', currentFilters.end_date);

    try {
      const res = await fetch(`${API_URL}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      if (Array.isArray(data)) {
        setPurchaseOrders(data.map((po: any) => ({
          id: po.PO_ID,
          supplierId: po.Supplier_ID,
          supplierName: po.Supplier_Name,
          status: po.Status,
          orderDate: po.Order_Date,
          totalAmount: po.Total_Amount,
          createdAt: po.Order_Date,
          estimatedArrivalDate: po.Estimated_Arrival_Date,
          warehouseId: po.Warehouse_ID,
          warehouseName: po.Warehouse_Name
        })));
      } else {
        console.error("Received non-array data:", data);
        setPurchaseOrders([]);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load purchase orders', variant: 'destructive' });
    }
  }, [filters, toast]); // Dependency on filters is okay if we use it as default

  // Initial Fetch & Warehouse Load
  useEffect(() => {
    fetchWarehouses();
    // fetchPurchaseOrders is handled by the filter change effect in PurchaseOrderFilters initially
  }, []); // Only on mount

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${API_BASE}/warehouses`);
      const data = await res.json();
      setWarehouses(data);
    } catch (e) {
      console.error('Failed to fetch warehouses', e);
    }
  };

  // Fetch when filters change
  useEffect(() => {
    fetchPurchaseOrders(filters);
  }, [filters, fetchPurchaseOrders]);

  const handleFilterChange = useCallback((newFilters: PurchaseOrderFiltersState) => {
    setFilters(newFilters);
  }, []);

  const handleCreatePO = async () => {
    if (!poSupplier || !poWarehouse || poItems.length === 0) {
      toast({ title: 'Error', description: 'Please select supplier, warehouse, and add items', variant: 'destructive' });
      return;
    }

    const adminId = getLoggedInAdminId();
    if (!adminId) {
      toast({ title: 'Error', description: 'You must be logged in as an admin to create a PO', variant: 'destructive' });
      return;
    }

    const payload = {
      supplierId: poSupplier.id,
      warehouseId: poWarehouse.id,
      createdByAdminId: adminId,
      items: poItems.map((it) => ({
        productVariantId: it.variantId,
        quantity: it.quantity,
        unitCost: it.unitCost,
      })),
    };

    try {
      const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await r.json();

      if (!r.ok) {
        toast({ title: 'Create failed', description: body.error || 'Unable to create PO', variant: 'destructive' });
        return;
      }

      // Fetch full PO details (including items) after creation
      let fullPO = body; // fallback if detail fetch fails
      try {
        const detailRes = await fetch(`${API_URL}/${body.PO_ID}`);
        if (detailRes.ok) {
          const detailBody = await detailRes.json();
          // Merge detail info with original response
          fullPO = { ...body, Items: detailBody.Items || [] };
        }
      } catch (e) {
        console.error('Failed to fetch PO details:', e);
      }

      // Store created PO for UI display
      setCreatedPO(fullPO);

      // Display order info with estimated date in toast
      const estimatedDate = body.Estimated_Arrival_Date
        ? new Date(body.Estimated_Arrival_Date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

      toast({
        title: `PO Created: ${body.PO_Number}`,
        description: `Estimated Arrival: ${estimatedDate} (${body.Max_Lead_Time_Days || 0} days lead time)`,
      });

      fetchPurchaseOrders(filters); // Refresh list with current filters
      setIsDialogOpen(false);
      // Reset form
      setPoSupplier(null);
      setPoWarehouse(null);
      setPoItems([]);
    } catch (e) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleAddItem = (item: any) => {
    // If this is the first item, set the supplier
    if (poItems.length === 0) {
      setPoSupplier({ id: item.supplierId, name: item.supplierName });
    } else {
      // Logic check (should be prevented by Dialog, but double check)
      if (item.supplierId !== poSupplier?.id) {
        toast({ title: 'Error', description: 'All items must be from the same supplier', variant: 'destructive' });
        return;
      }
    }

    setPoItems([...poItems, item]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = poItems.filter((_, i) => i !== index);
    setPoItems(newItems);
    if (newItems.length === 0) {
      setPoSupplier(null);
    }
  };

  // Helper for detail view
  // const getItemsForPO = (poId: any): PurchaseOrderItem[] => {
  //   // This is currently a mock because the API doesn't return items in the list view
  //   // In a real app, we'd fetch details on open. 
  //   return [];
  // };

  const [selectedPOItems, setSelectedPOItems] = useState<any[]>([]);

  const handleRowClick = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setSelectedPOItems([]); // Clear previous
    try {
      const res = await fetch(`${API_URL}/${po.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.Items) {
          const items = data.Items.map((it: any, index: number) => ({
            id: `item-${index}-${it.Product_Variant_ID}`,
            productVariantId: it.Product_Variant_ID,
            productName: it.Product_Name || it.SKU, // Prefer Product_Name
            variantName: it.SKU,
            quantity: it.Quantity_Ordered,
            unitCost: it.Unit_Cost, // Use unitCost for consistency with creation payload
            unitPrice: it.Unit_Cost, // For display
            leadTime: it.Lead_Time_Days
          }));
          setSelectedPOItems(items);
        }
        if (data.Created_By_Name) {
          setSelectedPO(prev => prev ? ({ ...prev, createdByName: data.Created_By_Name }) : null);
        }
      }
    } catch (e) {
      console.error("Failed to fetch PO details", e);
      toast({ title: 'Error', description: 'Failed to load order details', variant: 'destructive' });
    }
  };

  const handleReorder = async () => {
    if (!selectedPO || !selectedPOItems.length) return;

    const supplierId = Number(selectedPO.supplierId);
    setPoSupplier({ id: supplierId, name: selectedPO.supplierName });

    if (selectedPO.warehouseId && selectedPO.warehouseName) {
      setPoWarehouse({ id: selectedPO.warehouseId, name: selectedPO.warehouseName });
    }

    try {
      // 1. Fetch current supplier product map to validate items and get current costs
      const res = await fetch(`${API_BASE}/suppliers/${supplierId}/products`);
      if (!res.ok) throw new Error("Failed to fetch supplier products");

      const products = await res.json();

      // Flatten to a map of VariantID -> VariantDetails for quick lookup
      // We only care about variants that are LINKED
      const variantMap = new Map();
      products.forEach((p: any) => {
        if (p.Variants) {
          p.Variants.forEach((v: any) => {
            if (v.Is_Linked) {
              variantMap.set(v.Product_Variant_ID, v);
            }
          });
        }
      });

      const newItems: any[] = [];
      // const droppedItems: string[] = []; // Removed
      let priceChanged = false;

      // 2. Refresh items
      for (const item of selectedPOItems) {
        const currentVariant = variantMap.get(item.productVariantId);

        if (!currentVariant) {
          // Item no longer supplied: Keep it but mark as error
          newItems.push({
            ...item,
            variantId: item.productVariantId,
            unitCost: item.unitCost,
            error: "Item no longer supplied"
          });
          continue;
        }

        const currentCost = currentVariant.Unit_Cost ?? 0;

        // Detect price change
        if (Math.abs(currentCost - item.unitCost) > 0.01) {
          priceChanged = true;
        }

        newItems.push({
          ...item,
          variantId: item.productVariantId,
          unitCost: currentCost, // UPDATE COST
          leadTime: currentVariant.Lead_Time_Days || item.leadTime // Update lead time if available
        });
      }



      if (priceChanged) {
        toast({
          title: "Prices Updated",
          description: "Unit costs have been updated to current supplier rates.",
          variant: "default" // Info
        });
      }

      setPoItems(newItems);
      setIsDialogOpen(true);
      setSelectedPO(null); // Close the detail dialog

    } catch (e) {
      console.error("Reorder failed", e);
      toast({ title: "Error", description: "Failed to validate items for reorder", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Create and manage purchase orders to suppliers"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setPoSupplier(null); setPoWarehouse(null); setPoItems([]); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create PO
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>New Purchase Order</DialogTitle>
                <DialogDescription>
                  Date: {safeFormat(new Date(), 'MMMM d, yyyy')}
                </DialogDescription>
                <DialogDescription>
                  Add items to create a PO. All items must be from the same supplier.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Supplier</Label>
                    <div className="font-semibold text-lg">
                      {poSupplier ? poSupplier.name : <span className="text-muted-foreground italic">Selected by first item</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Destination Warehouse</Label>
                    {warehouses.length === 0 ? (
                      <div className="text-sm text-red-500 border p-2 rounded bg-red-50">
                        No warehouses found. Please create one.
                      </div>
                    ) : (
                      <Select
                        value={poWarehouse ? String(poWarehouse.id) : ''}
                        onValueChange={(v) => {
                          const wh = warehouses.find(w => String(w.Warehouse_ID) === v);
                          if (wh) setPoWarehouse({ id: wh.Warehouse_ID, name: wh.Name });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((wh) => (
                            <SelectItem key={wh.Warehouse_ID} value={String(wh.Warehouse_ID)}>
                              {wh.Name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsAddItemOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="border rounded-md min-h-[200px] max-h-[400px] overflow-y-auto">
                  {poItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <FileText className="w-8 h-8 mb-2 opacity-20" />
                      <p>No items added</p>
                      <p className="text-xs">Add an item to select a supplier</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {poItems.map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 ${item.error ? 'border border-red-500 bg-red-50 rounded-md' : ''}`}>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-muted-foreground">{item.variantName}</div>
                            {item.error && <div className="text-xs text-red-600 font-semibold mt-1">{item.error}</div>}
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm font-medium">{item.quantity} units</div>
                              <div className="text-xs text-muted-foreground">@ ${item.unitCost}</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveItem(idx)}>
                              <span className="sr-only">Remove</span>
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {poItems.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground mr-2">Total Estimated:</span>
                      <span className="font-bold text-lg">
                        ${poItems.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePO} disabled={poItems.length === 0 || !poWarehouse || poItems.some(i => i.error)}>Create Order</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <POAddItemDialog
        open={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onAdd={handleAddItem}
        currentSupplierId={poSupplier?.id}
      />

      {/* SQL Status Filter - Replaces the old button group */}
      <PurchaseOrderFilters onFilterChange={handleFilterChange} />

      <DataTable
        columns={[
          {
            key: 'id',
            header: 'PO Number',
            render: (po) => (
              <button
                onClick={() => setSelectedPO(po)}
                className="font-medium text-primary hover:underline flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {po.id}
              </button>
            ),
          },
          { key: 'supplierName', header: 'Supplier' },
          {
            key: 'status',
            header: 'Status',
            render: (po) => <StatusBadge status={po.status} />,
          },
          {
            key: 'totalAmount',
            header: 'Amount',
            render: (po) => (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                {Number(po.totalAmount || 0).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'CREATED AT',
            render: (po) => (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {safeFormat(po.createdAt, 'MMM d, yyyy')}
              </span>
            ),
          },
          {
            key: 'estimatedArrivalDate',
            header: 'EXPECTED ARRIVAL',
            render: (po) => {
              if (po.status === 'PENDING') {
                return (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {po.estimatedArrivalDate
                      ? safeFormat(po.estimatedArrivalDate, 'MMM d, yyyy')
                      : '-'}
                  </span>
                );
              }
              // For non-pending, show status
              return <StatusBadge status={po.status} />;
            },
          },
        ]}
        data={purchaseOrders}
        keyExtractor={(po) => po.id}
        emptyMessage="No purchase orders found"
        onRowClick={handleRowClick}
      />

      {/* PO Detail Dialog */}
      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order {selectedPO?.id}</DialogTitle>
            <DialogDescription>
              Order details and line items
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedPO.supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{selectedPO.warehouseName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedPO.status} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p>{safeFormat(selectedPO.createdAt, 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">${Number(selectedPO.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{selectedPO.createdByName || 'Unknown'}</p>
                </div>
                {selectedPO.estimatedArrivalDate && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Expected Arrival</p>
                    <p className="font-medium text-blue-600">
                      {safeFormat(selectedPO.estimatedArrivalDate, 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-3">Order Items</h4>
                <div className="space-y-2">
                  {selectedPOItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {item.quantity} units
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @ ${item.unitPrice.toFixed(2)} each
                        </p>
                        {item.leadTime !== undefined && (
                          <p className="text-xs text-muted-foreground italic">
                            Lead time: {item.leadTime} days
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedPOItems.length === 0 && (
                    <p className="text-muted-foreground text-sm">Loading items...</p>
                  )}
                </div>
              </div>

              {/* Cancel button - only show for PENDING orders */}
              {selectedPO.status === 'PENDING' && (
                <div className="border-t border-border pt-4 mt-4">
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/${selectedPO.id}/cancel`, {
                          method: 'POST',
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          toast({ title: 'Error', description: data.error, variant: 'destructive' });
                          return;
                        }
                        toast({ title: 'Cancelled', description: data.message });
                        setSelectedPO(null);
                        fetchPurchaseOrders(filters);
                      } catch (e) {
                        toast({ title: 'Error', description: 'Failed to cancel order', variant: 'destructive' });
                      }
                    }}
                  >
                    Cancel Order
                  </Button>
                </div>
              )}

              {/* Reorder button - show for CANCELLED orders */}
              {selectedPO.status === 'CANCELLED' && (
                <div className="border-t border-border pt-4 mt-4">
                  <Button onClick={handleReorder} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Re-order (Create Copy)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
