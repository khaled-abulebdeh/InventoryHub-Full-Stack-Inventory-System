import { useState } from 'react';
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
import { purchaseOrders as initialPurchaseOrders, purchaseOrderItems, suppliers, productVariants, products } from '@/data/mockData';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/types/inventory';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDelivery: '',
    items: [{ variantId: '', quantity: 1 }],
  });
  const { toast } = useToast();

  const getProductName = (variantId: string) => {
    const variant = productVariants.find((v) => v.id === variantId);
    if (!variant) return '';
    const product = products.find((p) => p.id === variant.productId);
    return product?.name || '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const supplier = suppliers.find((s) => s.id === formData.supplierId);
    if (!supplier) return;

    let totalAmount = 0;
    formData.items.forEach((item) => {
      const variant = productVariants.find((v) => v.id === item.variantId);
      if (variant) {
        totalAmount += variant.price * item.quantity;
      }
    });

    const newPO: PurchaseOrder = {
      id: `PO-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      supplierId: formData.supplierId,
      supplierName: supplier.name,
      status: 'CREATED',
      totalAmount,
      createdAt: new Date(),
      expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined,
    };

    setPurchaseOrders([...purchaseOrders, newPO]);
    setFormData({ supplierId: '', expectedDelivery: '', items: [{ variantId: '', quantity: 1 }] });
    setIsDialogOpen(false);

    toast({
      title: 'Purchase Order Created',
      description: `${newPO.id} has been created successfully.`,
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { variantId: '', quantity: 1 }],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: 'variantId' | 'quantity', value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const getItemsForPO = (poId: string): PurchaseOrderItem[] => {
    return purchaseOrderItems.filter((item) => item.purchaseOrderId === poId);
  };

  const statusFilters: PurchaseOrderStatus[] = ['CREATED', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'];
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'ALL'>('ALL');

  const filteredPOs = statusFilter === 'ALL' 
    ? purchaseOrders 
    : purchaseOrders.filter((po) => po.status === statusFilter);

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Create and manage purchase orders to suppliers"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create PO
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
                <DialogDescription>
                  Create a new purchase order for a supplier.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier">Supplier</Label>
                      <Select
                        value={formData.supplierId}
                        onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                      <Input
                        id="expectedDelivery"
                        type="date"
                        value={formData.expectedDelivery}
                        onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Order Items</Label>
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select
                              value={item.variantId}
                              onValueChange={(value) => updateItem(index, 'variantId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product variant" />
                              </SelectTrigger>
                              <SelectContent>
                                {productVariants.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {getProductName(variant.id)} - {variant.name} (${variant.price})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                              placeholder="Qty"
                            />
                          </div>
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        + Add Item
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!formData.supplierId || formData.items.every((i) => !i.variantId)}>
                    Create Order
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Status Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ALL')}
        >
          All
        </Button>
        {statusFilters.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status.replace('_', ' ')}
          </Button>
        ))}
      </div>

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
                {po.totalAmount.toLocaleString()}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Created',
            render: (po) => (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(po.createdAt, 'MMM d, yyyy')}
              </span>
            ),
          },
          {
            key: 'expectedDelivery',
            header: 'Expected Delivery',
            render: (po) =>
              po.expectedDelivery ? format(po.expectedDelivery, 'MMM d, yyyy') : '-',
          },
        ]}
        data={filteredPOs}
        keyExtractor={(po) => po.id}
        emptyMessage="No purchase orders found"
      />

      {/* PO Detail Dialog */}
      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="sm:max-w-[600px]">
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
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedPO.status} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p>{format(selectedPO.createdAt, 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">${selectedPO.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-3">Order Items</h4>
                <div className="space-y-2">
                  {getItemsForPO(selectedPO.id).map((item) => (
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
                          {item.receivedQuantity} / {item.quantity}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @ ${item.unitPrice.toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  ))}
                  {getItemsForPO(selectedPO.id).length === 0 && (
                    <p className="text-muted-foreground text-sm">No items found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
