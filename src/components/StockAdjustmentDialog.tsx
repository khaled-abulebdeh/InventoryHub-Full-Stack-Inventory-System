import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface StockAdjustmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: any; // Using any for simplicity as per existing patterns, ideally strict type
    onConfirm: (data: any) => Promise<void>;
}

export function StockAdjustmentDialog({ open, onOpenChange, item, onConfirm }: StockAdjustmentDialogProps) {
    const [qtyChange, setQtyChange] = useState<string>("");
    const [reason, setReason] = useState<string>("Manual Adjustment");
    const [notes, setNotes] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!qtyChange || isNaN(Number(qtyChange)) || Number(qtyChange) === 0) return;

        setLoading(true);
        try {
            await onConfirm({
                warehouse_id: item.warehouseId,
                product_variant_id: item.productVariantId,
                quantity_change: Number(qtyChange),
                reason,
                notes
            });
            onOpenChange(false);
            setQtyChange("");
            setNotes("");
            setReason("Manual Adjustment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adjust Stock: {item?.productName} ({item?.sku})</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Current</Label>
                        <div className="col-span-3 font-medium">{item?.quantity} units</div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Adjustment</Label>
                        <Input
                            type="number"
                            placeholder="+/- Qty"
                            className="col-span-3"
                            value={qtyChange}
                            onChange={(e) => setQtyChange(e.target.value)}
                        />
                        <div className="col-span-4 text-xs text-muted-foreground text-right">
                            Use negative numbers to remove stock (e.g., -5)
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Reason</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manual Adjustment">Manual Adjustment</SelectItem>
                                <SelectItem value="Damaged">Damaged / Expired</SelectItem>
                                <SelectItem value="Lost">Lost / Theft</SelectItem>
                                <SelectItem value="Found">Found / Extra</SelectItem>
                                <SelectItem value="Correction">Count Correction</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Notes</Label>
                        <Textarea
                            className="col-span-3"
                            placeholder="Optional details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Confirm Adjustment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
