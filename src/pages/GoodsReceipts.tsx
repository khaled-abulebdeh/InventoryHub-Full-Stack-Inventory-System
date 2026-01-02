import { useState } from 'react';
import { Plus, PackageCheck, ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  goodsReceipts as initialGoodsReceipts,
  goodsReceiptItems,
  purchaseOrders,
  purchaseOrderItems,
  warehouses,
} from '@/data/mockData';
import { GoodsReceipt, PurchaseOrderItem } from '@/types/inventory';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function GoodsReceipts() {
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>(initialGoodsReceipts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [receivingItems, setReceivingItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const { toast } = useToast();

  // Get POs that can receive goods (SENT or PARTIALLY_RECEIVED)
  const receivablePOs = purchaseOrders.filter(
    (po) => po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED'
  );

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    const items = purchaseOrderItems.filter((item) => item.purchaseOrderId === poId);
    setReceivingItems(
      items.map((item) => ({
        itemId: item.id,
        quantity: 0,
      }))
    );
  };

  const updateReceivingQuantity = (itemId: string, quantity: number) => {
    setReceivingItems(
      receivingItems.map((item) =>
        item.itemId === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    );
  };

  const getMaxReceivable = (item: PurchaseOrderItem): number => {
    return item.quantity - item.receivedQuantity;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const warehouse = warehouses.find((w) => w.id === selectedWarehouseId);
    if (!warehouse) return;

    const newGR: GoodsReceipt = {
      id: `GR-${String(goodsReceipts.length + 1).padStart(3, '0')}`,
      purchaseOrderId: selectedPOId,
      warehouseId: selectedWarehouseId,
      warehouseName: warehouse.name,
      receivedAt: new Date(),
      notes: notes || undefined,
    };

    setGoodsReceipts([...goodsReceipts, newGR]);
    setSelectedPOId('');
    setSelectedWarehouseId('');
    setNotes('');
    setReceivingItems([]);
    setIsDialogOpen(false);

    toast({
      title: 'Goods Receipt Created',
      description: `${newGR.id} has been recorded. Stock has been increased.`,
    });
  };

  const getItemsForGR = (grId: string) => {
    return goodsReceiptItems.filter((item) => item.goodsReceiptId === grId);
  };

  const getPOItems = (poId: string): PurchaseOrderItem[] => {
    return purchaseOrderItems.filter((item) => item.purchaseOrderId === poId);
  };

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
                        <SelectContent>
                          {receivablePOs.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                              {po.id} - {po.supplierName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="warehouse">Warehouse</Label>
                      <Select
                        value={selectedWarehouseId}
                        onValueChange={setSelectedWarehouseId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedPOId && (
                    <div className="grid gap-2">
                      <Label>Items to Receive</Label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {getPOItems(selectedPOId).map((item) => {
                          const maxReceivable = getMaxReceivable(item);
                          const receiving = receivingItems.find((r) => r.itemId === item.id);
                          
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.variantName} • Pending: {maxReceivable} of {item.quantity}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxReceivable}
                                  value={receiving?.quantity || 0}
                                  onChange={(e) =>
                                    updateReceivingQuantity(item.id, parseInt(e.target.value) || 0)
                                  }
                                  className="w-20"
                                  disabled={maxReceivable === 0}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateReceivingQuantity(item.id, maxReceivable)}
                                  disabled={maxReceivable === 0}
                                >
                                  All
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                      !selectedWarehouseId ||
                      receivingItems.every((r) => r.quantity === 0)
                    }
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Confirm Receipt
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        columns={[
          {
            key: 'id',
            header: 'Receipt #',
            render: (gr) => (
              <span className="font-medium flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-status-success" />
                {gr.id}
              </span>
            ),
          },
          { key: 'purchaseOrderId', header: 'Purchase Order' },
          { key: 'warehouseName', header: 'Warehouse' },
          {
            key: 'items',
            header: 'Items Received',
            render: (gr) => {
              const items = getItemsForGR(gr.id);
              return (
                <span>
                  {items.length} item{items.length !== 1 ? 's' : ''} (
                  {items.reduce((sum, i) => sum + i.quantityReceived, 0)} units)
                </span>
              );
            },
          },
          {
            key: 'receivedAt',
            header: 'Received At',
            render: (gr) => format(gr.receivedAt, 'MMM d, yyyy HH:mm'),
          },
          {
            key: 'notes',
            header: 'Notes',
            render: (gr) => (
              <span className="text-muted-foreground truncate max-w-xs block">
                {gr.notes || '-'}
              </span>
            ),
          },
        ]}
        data={goodsReceipts}
        keyExtractor={(gr) => gr.id}
        emptyMessage="No goods receipts recorded"
      />
    </div>
  );
}
