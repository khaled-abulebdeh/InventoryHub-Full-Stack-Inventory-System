import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Warehouse {
    id: number;
    name: string;
}

interface StockTransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: any;
    onConfirm: (data: any) => Promise<void>;
    warehouses?: Warehouse[]; // Pass in available warehouses if possible, or fetch
}

export function StockTransferDialog({ open, onOpenChange, item, onConfirm }: StockTransferDialogProps) {
    const [targetWarehouse, setTargetWarehouse] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

    // Simple fetch warehouses logic duplication for now (ideally passed as prop or context)
    useEffect(() => {
        if (open) {
            // We need a way to get warehouses. Since this is a standalone component, we might need to fetch.
            // Assuming /api/warehouses exists as per convention (verified in previous tasks)
            fetch("http://localhost:5000/api/warehouses")
                .then(res => res.json())
                .then(data => setWarehouses(data))
                .catch(err => console.error("Failed to load warehouses", err));
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!targetWarehouse || !quantity || Number(quantity) <= 0) return;

        setLoading(true);
        try {
            await onConfirm({
                source_warehouse_id: item.warehouseId,
                target_warehouse_id: Number(targetWarehouse),
                product_variant_id: item.productVariantId,
                quantity: Number(quantity),
                notes
            });
            onOpenChange(false);
            setQuantity("");
            setNotes("");
            setTargetWarehouse("");
        } finally {
            setLoading(false);
        }
    };

    const availableTargets = warehouses.filter(w => w.id !== item?.warehouseId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer Stock: {item?.productName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Source</Label>
                        <div className="col-span-3 font-medium">{item?.warehouseName} (Available: {item?.quantity})</div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Target</Label>
                        <Select value={targetWarehouse} onValueChange={setTargetWarehouse}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select destination warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTargets.map(w => (
                                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Quantity</Label>
                        <Input
                            type="number"
                            placeholder="Qty to move"
                            className="col-span-3"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            max={item?.quantity}
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Notes</Label>
                        <Textarea
                            className="col-span-3"
                            placeholder="Optional reason..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Transferring..." : "Confirm Transfer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
