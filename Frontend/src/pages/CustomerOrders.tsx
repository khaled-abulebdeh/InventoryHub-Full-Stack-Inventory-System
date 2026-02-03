import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { Package, MapPin, User, Loader2 } from 'lucide-react';
import { CustomerOrderFilters, CustomerOrderFiltersState } from '@/components/CustomerOrderFilters';

const API_BASE = 'http://127.0.0.1:5000/api';

type OrderStatus = 'PLACED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';

type OrderSummary = {
    Order_ID: number;
    Customer_Name: string;
    Customer_Email: string;
    Status: OrderStatus;
    Total_Amount: number;
    Created_at: string;
};

type OrderDetail = OrderSummary & {
    Shipping_Address: {
        Line: string;
        City: string;
        State: string;
        Country: string;
        Postal_Code: string;
    };
    Items: {
        Product_Name: string;
        SKU: string;
        Variant: string;
        Quantity: number;
        Unit_Price: number;
    }[];
    Payment: {
        Method: string;
        Status: string;
    };
};

export default function CustomerOrders() {
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<CustomerOrderFiltersState>({
        status: 'ALL',
        search: '',
        product_search: '',
        start_date: '',
        end_date: ''
    });

    // Detail View State
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const { toast } = useToast();

    // Fetch when filters change
    useEffect(() => {
        fetchOrders(filters);
    }, [filters]);

    const fetchOrders = useCallback(async (currentFilters: CustomerOrderFiltersState) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (currentFilters.status && currentFilters.status !== 'ALL') params.append('status', currentFilters.status);
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.product_search) params.append('product_search', currentFilters.product_search);
        if (currentFilters.start_date) params.append('start_date', currentFilters.start_date);
        if (currentFilters.end_date) params.append('end_date', currentFilters.end_date);

        try {
            const res = await fetch(`${API_BASE}/orders?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const handleFilterChange = useCallback((newFilters: CustomerOrderFiltersState) => {
        setFilters((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(newFilters)) {
                return prev;
            }
            return newFilters;
        });
    }, []);

    const loadDetails = async (id: number) => {
        setDetailLoading(true);
        setDetailOpen(true);
        try {
            const res = await fetch(`${API_BASE}/orders/${id}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedOrder(data);
            } else {
                toast({ title: "Error", description: "Failed to load order details", variant: "destructive" });
                setDetailOpen(false);
            }
        } catch {
            toast({ title: "Error", description: "Network error", variant: "destructive" });
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: OrderStatus) => {
        if (!selectedOrder) return;
        setUpdating(true);
        try {
            const res = await fetch(`${API_BASE}/orders/${selectedOrder.Order_ID}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Update failed');
            }

            toast({ title: "Success", description: `Order status updated to ${newStatus}` });

            // Reload full details (important for getting the new Payment record for PAID status)
            await loadDetails(selectedOrder.Order_ID);

            // Also refresh main list to show new status there
            setOrders(prev => prev.map(o => o.Order_ID === selectedOrder?.Order_ID ? { ...o, Status: newStatus } : o));

        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setUpdating(false);
        }
    };

    const safeDate = (d: string) => {
        try {
            return format(new Date(d), 'MMM d, yyyy');
        } catch { return '-'; }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Customer Orders"
                description="Manage incoming orders from customers"
            />

            <CustomerOrderFilters initialFilters={filters} onFilterChange={handleFilterChange} />

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
                        ) : (
                            orders.map(order => (
                                <TableRow key={order.Order_ID} className="cursor-pointer hover:bg-slate-50" onClick={() => loadDetails(order.Order_ID)}>
                                    <TableCell className="font-medium">#{order.Order_ID}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{order.Customer_Name}</span>
                                            <span className="text-xs text-muted-foreground">{order.Customer_Email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{safeDate(order.Created_at)}</TableCell>
                                    <TableCell>${order.Total_Amount.toLocaleString()}</TableCell>
                                    <TableCell><StatusBadge status={order.Status} /></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* DETAIL DIALOG */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order #{selectedOrder?.Order_ID}</DialogTitle>
                        <DialogDescription>
                            Placed on {selectedOrder ? safeDate(selectedOrder.Created_at) : ''}
                        </DialogDescription>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
                    ) : selectedOrder ? (
                        <div className="space-y-6">
                            {/* STATUS & ACTIONS */}
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground">Current Status:</span>
                                    <StatusBadge status={selectedOrder.Status} />
                                </div>
                                <div className="flex gap-2">
                                    {/* Action Buttons based on status flow (Strict COD: Ship -> Deliver -> Pay) */}

                                    {selectedOrder.Status === 'PLACED' && (
                                        <>
                                            <Button size="sm" onClick={() => handleUpdateStatus('SHIPPED')} disabled={updating}>Ship Order</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus('CANCELLED')} disabled={updating}>Cancel</Button>
                                        </>
                                    )}

                                    {selectedOrder.Status === 'SHIPPED' && (
                                        <>
                                            <Button size="sm" onClick={() => handleUpdateStatus('PAID')} disabled={updating}>Delivered & Paid</Button>
                                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('RETURNED')} disabled={updating}>Mark Returned</Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* CUSTOMER INFO */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Customer</h3>
                                    <div className="text-sm border p-3 rounded bg-white">
                                        <div className="font-medium">{selectedOrder.Customer_Name}</div>
                                        <div>{selectedOrder.Customer_Email}</div>
                                        <div className="mt-2 text-muted-foreground">Payment: {selectedOrder.Payment.Method} ({selectedOrder.Payment.Status})</div>
                                    </div>
                                </div>

                                {/* SHIPPING INFO */}
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Shipping Address</h3>
                                    <div className="text-sm border p-3 rounded bg-white">
                                        <div>{selectedOrder.Shipping_Address.Line}</div>
                                        <div>{selectedOrder.Shipping_Address.City}, {selectedOrder.Shipping_Address.State} {selectedOrder.Shipping_Address.Postal_Code}</div>
                                        <div>{selectedOrder.Shipping_Address.Country}</div>
                                    </div>
                                </div>
                            </div>

                            {/* ITEMS */}
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Order Items</h3>
                                <div className="border rounded overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead>Item</TableHead>
                                                <TableHead>SKU</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedOrder.Items.map((item, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <div className="font-medium">{item.Product_Name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.Variant}</div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{item.SKU}</TableCell>
                                                    <TableCell className="text-right">{item.Quantity}</TableCell>
                                                    <TableCell className="text-right">${item.Unit_Price.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-medium">${(item.Quantity * item.Unit_Price).toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div >
    );
}
