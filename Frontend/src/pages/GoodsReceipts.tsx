import { useState, useEffect, useCallback } from 'react';
import { Plus, PackageCheck, ClipboardCheck, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GoodsReceiptFilters, GoodsReceiptFiltersState } from '@/components/GoodsReceiptFilters';
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
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'http://127.0.0.1:5000/api';

interface GoodsReceipt {
  Receipt_ID: number;
  PO_ID: number;
  Warehouse_ID: number;
  Warehouse_Name: string;
  Receipt_Date: string;
  Supplier_Name: string;
  Items?: GoodsReceiptItem[];
  Notes?: string;
  PO_Date?: string;
  Expected_Date?: string;
  Received_By?: string;
}

interface GoodsReceiptItem {
  Product_Variant_ID: number;
  Quantity_Received: number;
  Unit_Cost: number;
  SKU: string;
  Product_Name: string;
}

interface Warehouse {
  Warehouse_ID: number;
  Name: string;
  City: string;
}

interface PurchaseOrder {
  PO_ID: number;
  Supplier_ID: number;
  Supplier_Name: string;
  Status: string;
}

interface ReceivableItem {
  Product_Variant_ID: number;
  SKU: string;
  Product_Name: string;
  Quantity_Ordered: number;
  Quantity_Received: number;
  Quantity_Pending: number;
  Unit_Cost: number;
}

export default function GoodsReceipts() {
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState<GoodsReceiptFiltersState>({});

  // Form state
  const [selectedPOId, setSelectedPOId] = useState('');
  const [notes, setNotes] = useState('');
  const [receivingItems, setReceivingItems] = useState<{ variantId: number; quantity: number; unitCost: number }[]>([]);

  // Detail View State
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Data for dropdowns
  const [receivablePOs, setReceivablePOs] = useState<PurchaseOrder[]>([]);
  const [poItems, setPOItems] = useState<ReceivableItem[]>([]);
  const [loadingPOItems, setLoadingPOItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();

  const fetchGoodsReceipts = useCallback(async (currentFilters: GoodsReceiptFiltersState = filters) => {
    const params = new URLSearchParams();
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.product_search) params.append('product_search', currentFilters.product_search);
    if (currentFilters.start_date) params.append('start_date', currentFilters.start_date);
    if (currentFilters.end_date) params.append('end_date', currentFilters.end_date);

    try {
      const res = await fetch(`${API_BASE}/goods-receipts?${params.toString()}`);
      const data = await res.json();
      setGoodsReceipts(data);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load goods receipts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Initial fetch
  useEffect(() => {
    fetchReceivablePOs();
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchGoodsReceipts(filters);
  }, [filters, fetchGoodsReceipts]);

  const handleFilterChange = useCallback((newFilters: GoodsReceiptFiltersState) => {
    setFilters(newFilters);
  }, []);


  const fetchReceivablePOs = async () => {
    try {
      // Fetch POs with status PENDING (not yet received)
      const res = await fetch(`${API_BASE}/purchase-orders`);
      const data = await res.json();
      const receivable = data.filter((po: PurchaseOrder) =>
        po.Status === 'PENDING'
      );
      setReceivablePOs(receivable);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePOSelect = async (poId: string) => {
    setSelectedPOId(poId);
    setLoadingPOItems(true);
    setPOItems([]);
    setReceivingItems([]);

    try {
      const res = await fetch(`${API_BASE}/purchase-orders/${poId}/receivable-items`);

      if (!res.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("Expected array but got:", data);
        setPOItems([]);
        return;
      }

      setPOItems(data);
      // Initialize receiving items with FULL ordered quantity (Strict No Partial Receiving)
      setReceivingItems(data.map((item: ReceivableItem) => ({
        variantId: item.Product_Variant_ID,
        quantity: item.Quantity_Ordered, // Force full quantity
        unitCost: item.Unit_Cost
      })));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load PO items', variant: 'destructive' });
      setPOItems([]);
    } finally {
      setLoadingPOItems(false);
    }
  };

  const updateReceivingQuantity = (variantId: number, quantity: number) => {
    setReceivingItems(
      receivingItems.map((item) =>
        item.variantId === variantId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    );
  };

  const getMaxReceivable = (item: ReceivableItem): number => {
    return item.Quantity_Pending;
  };

  const handleRowClick = async (gr: GoodsReceipt) => {
    setSelectedReceipt(gr);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/goods-receipts/${gr.Receipt_ID}`);
      if (res.ok) {
        const data = await res.json();
        // data contains Items
        setSelectedReceipt(data);
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load receipt details', variant: 'destructive' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToReceive = receivingItems.filter(item => item.quantity > 0);
    if (itemsToReceive.length === 0) {
      toast({ title: 'Error', description: 'Please enter quantities to receive', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const getStoredAdminId = (): string | null => {
        return localStorage.getItem('adminId') || sessionStorage.getItem('adminId');
      };
      const storedAdminId = getStoredAdminId();
      if (!storedAdminId) {
        toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const payload = {
        po_id: Number(selectedPOId),
        notes: notes,
        received_by_admin_id: Number(storedAdminId)
      };

      const res = await fetch(`${API_BASE}/goods-receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create receipt');
      }

      const result = await res.json();

      toast({
        title: 'Goods Receipt Created',
        description: `Receipt #${result.Receipt_ID} has been recorded. Stock has been increased.`,
      });

      // Reset form
      setSelectedPOId('');
      setNotes('');
      setReceivingItems([]);
      setPOItems([]);
      setIsDialogOpen(false);

      // Refresh data
      fetchGoodsReceipts(filters);
      fetchReceivablePOs();

    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Goods Receipts"
        description="Record received goods from purchase orders"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Receive Goods
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Receive Goods</DialogTitle>
                <DialogDescription>
                  Record received items from a purchase order. This will increase stock levels.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="purchaseOrder">Purchase Order</Label>
                      <Select value={selectedPOId} onValueChange={handlePOSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PO" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {receivablePOs.map((po) => (
                            <SelectItem key={po.PO_ID} value={String(po.PO_ID)}>
                              PO-{po.PO_ID} - {po.Supplier_Name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedPOId && (
                    <div className="grid gap-2">
                      <Label>Items to Receive</Label>
                      {loadingPOItems ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      ) : poItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No items pending for this PO.</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {poItems.map((item) => {
                            const maxReceivable = getMaxReceivable(item);
                            const receiving = receivingItems.find((r) => r.variantId === item.Product_Variant_ID);

                            return (
                              <div
                                key={item.Product_Variant_ID}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium">{item.Product_Name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.SKU}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium mr-2">Qty:</span>
                                  <Input
                                    type="number"
                                    value={receiving?.quantity || 0}
                                    readOnly
                                    className="w-20 bg-muted cursor-not-allowed"
                                    disabled
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes about this receipt..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !selectedPOId ||
                      receivingItems.every((r) => r.quantity === 0) ||
                      submitting
                    }
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                    )}
                    Confirm Full Receipt
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <GoodsReceiptFilters onFilterChange={handleFilterChange} />

      <DataTable
        columns={[
          {
            key: 'Receipt_ID',
            header: 'Receipt #',
            render: (gr) => (
              <span className="font-medium flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-status-success" />
                GR-{gr.Receipt_ID}
              </span>
            ),
          },
          {
            key: 'PO_ID',
            header: 'Purchase Order',
            render: (gr) => `PO-${gr.PO_ID}`
          },
          { key: 'Warehouse_Name', header: 'Warehouse' },
          { key: 'Supplier_Name', header: 'Supplier' },
          {
            key: 'Receipt_Date',
            header: 'Received At',
            render: (gr) => gr.Receipt_Date ? format(new Date(gr.Receipt_Date), 'MMM d, yyyy') : '-',
          },
        ]}
        data={goodsReceipts}
        keyExtractor={(gr) => String(gr.Receipt_ID)}
        emptyMessage="No goods receipts recorded"
        onRowClick={handleRowClick}
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Goods Receipt #{selectedReceipt?.Receipt_ID}</DialogTitle>
          </DialogHeader>

          {selectedReceipt && (
            <div className="py-2">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Supplier</Label>
                  <p className="font-medium">{selectedReceipt.Supplier_Name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Warehouse</Label>
                  <p className="font-medium">{selectedReceipt.Warehouse_Name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Purchase Order</Label>
                  <p className="font-medium">PO-{selectedReceipt.PO_ID}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Received By</Label>
                  <p className="font-medium">{selectedReceipt.Received_By || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">PO Date</Label>
                  <p className="font-medium">{selectedReceipt.PO_Date ? format(new Date(selectedReceipt.PO_Date), 'MMM d, yyyy') : '-'}</p>
                </div>
                {selectedReceipt.Receipt_Date && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase">Reception Date</Label>
                    <p className="font-medium">{format(new Date(selectedReceipt.Receipt_Date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              {selectedReceipt.Notes && ( // Wait, interface doesn't have Notes, checking backend response it DOES.
                <div className="mb-4 bg-muted/30 p-3 rounded-md">
                  <Label className="text-xs text-muted-foreground uppercase">Notes</Label>
                  <p className="text-sm mt-1">{selectedReceipt.Notes}</p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" /> Received Items
                </h4>
                {detailLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="border rounded-md divide-y">
                    {selectedReceipt.Items && selectedReceipt.Items.length > 0 ? (
                      selectedReceipt.Items.map((item, idx) => (
                        <div key={idx} className="flex justify-between p-3 text-sm">
                          <div>
                            <div className="font-medium">{item.Product_Name}</div>
                            <div className="text-muted-foreground text-xs">{item.SKU}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{item.Quantity_Received} units</div>
                            <div className="text-xs text-muted-foreground">Cost: ${item.Unit_Cost}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">No items data available.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
