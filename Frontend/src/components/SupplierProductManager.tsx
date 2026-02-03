import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const API_BASE = 'http://127.0.0.1:5000/api';

interface VariantNode {
    Product_Variant_ID: number;
    SKU: string;
    Is_Linked: boolean;
    Is_Preferred: boolean;
    Unit_Cost: number | null;
    Lead_Time_Days: number | null;
}

interface ProductNode {
    Product_ID: number;
    Product_Name: string;
    Variants: VariantNode[];
}

interface SupplierProductManagerProps {
    open: boolean;
    onClose: () => void;
    supplierId: number;
    supplierName: string;
}

// Helper to track local changes
interface LinkState {
    status: 'LINK' | 'UNLINK';
    unitCost: string;
    leadTime: string;
    isPreferred: boolean;
}

export function SupplierProductManager({
    open,
    onClose,
    supplierId,
    supplierName,
}: SupplierProductManagerProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [products, setProducts] = useState<ProductNode[]>([]);

    // Map<VariantID, LinkState>
    // Stores the CURRENT desired state for each variant
    const [localState, setLocalState] = useState<Map<number, LinkState>>(new Map());

    const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (open && supplierId) {
            fetchMap();
        }
    }, [open, supplierId]);

    const fetchMap = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/suppliers/${supplierId}/products`);
            if (!res.ok) throw new Error('Failed to load product map');
            const data = await res.json();
            setProducts(data);

            // Initialize local state based on fetched data
            const initialMap = new Map<number, LinkState>();
            const initialExpanded = new Set<number>();

            data.forEach((p: ProductNode) => {
                let hasLinked = false;
                p.Variants.forEach(v => {
                    initialMap.set(v.Product_Variant_ID, {
                        status: v.Is_Linked ? 'LINK' : 'UNLINK',
                        unitCost: v.Unit_Cost ? String(v.Unit_Cost) : '',
                        leadTime: v.Lead_Time_Days ? String(v.Lead_Time_Days) : '',
                        isPreferred: v.Is_Preferred
                    });
                    if (v.Is_Linked) hasLinked = true;
                });
                if (hasLinked) initialExpanded.add(p.Product_ID);
            });

            setLocalState(initialMap);
            setExpandedProductIds(initialExpanded);

        } catch (e: any) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to load product map', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (pid: number) => {
        const next = new Set(expandedProductIds);
        if (next.has(pid)) next.delete(pid);
        else next.add(pid);
        setExpandedProductIds(next);
    };

    const updateVariantState = (vid: number, partial: Partial<LinkState>) => {
        const next = new Map(localState);
        const current = next.get(vid);
        if (current) {
            next.set(vid, { ...current, ...partial });
            setLocalState(next);
        }
    };


    const handleSave = async () => {
        setSaving(true);
        try {
            // Build payload by comparing localState vs original products (optional optimization)
            // For now, let's just send everything that is LINKED or explicitly UNLINKED
            // Actually, backend needs specific actions.
            // We'll iterate all current local states and send actions.
            // To minimize traffic, we CAN compare against 'products' prop but simple strategy is send differences.
            // Let's send everything for simplicity/robustness or just what changed.
            // Sending everything is fine for smaller datasets but let's be smart: checking changes.

            const payload: any[] = [];

            // Validation errors
            const missingFields: string[] = [];

            // Flatten original variants for easy lookup
            const originalMap = new Map<number, VariantNode>();
            products.forEach(p => p.Variants.forEach(v => originalMap.set(v.Product_Variant_ID, v)));

            localState.forEach((state, vid) => {
                const original = originalMap.get(vid);
                if (!original) return;

                // Validate if LINKED
                if (state.status === 'LINK') {
                    if (!state.unitCost || !state.leadTime) {
                        missingFields.push(original.SKU);
                    }
                }

                // Determine if changed
                const costChanged = state.unitCost !== (original.Unit_Cost ? String(original.Unit_Cost) : '');
                const leadChanged = state.leadTime !== (original.Lead_Time_Days ? String(original.Lead_Time_Days) : '');
                const prefChanged = state.isPreferred !== original.Is_Preferred;
                const statusChanged = state.status !== (original.Is_Linked ? 'LINK' : 'UNLINK');

                if (statusChanged || (state.status === 'LINK' && (costChanged || leadChanged || prefChanged))) {
                    payload.push({
                        variant_id: vid,
                        action: state.status,
                        unit_cost: state.unitCost ? Number(state.unitCost) : null,
                        lead_time_days: state.leadTime ? Number(state.leadTime) : null,
                        is_preferred: state.isPreferred
                    });
                }
            });

            if (missingFields.length > 0) {
                toast({
                    title: "Validation Error",
                    description: `Unit Cost and Lead Time are required for: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? '...' : ''}`,
                    variant: "destructive"
                });
                setSaving(false);
                return;
            }

            if (payload.length === 0) {
                onClose();
                return;
            }

            const res = await fetch(`${API_BASE}/suppliers/${supplierId}/products/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to save changes');

            toast({ title: 'Success', description: 'Supplier links updated' });
            onClose();
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Products for {supplierName}</DialogTitle>
                    <DialogDescription>Link products and set supplier-specific attributes.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden border rounded-md">
                    <ScrollArea className="h-full bg-slate-50">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="divide-y">
                                {products.map(p => {
                                    const states = p.Variants.map(v => localState.get(v.Product_Variant_ID));
                                    const allLinked = states.every(s => s?.status === 'LINK');
                                    const someLinked = states.some(s => s?.status === 'LINK');
                                    const isExpanded = expandedProductIds.has(p.Product_ID);

                                    return (
                                        <div key={p.Product_ID} className="bg-white">
                                            {/* Product Row */}
                                            <div className="flex items-center gap-2 p-2 hover:bg-slate-50 sticky top-0 bg-white z-10 border-b">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-6 h-6 p-0"
                                                    onClick={() => toggleExpand(p.Product_ID)}
                                                >
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </Button>

                                                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleExpand(p.Product_ID)}>
                                                    <span className="font-semibold">{p.Product_Name}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        {states.filter(s => s?.status === 'LINK').length} variants
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Variants List */}
                                            {isExpanded && (
                                                <div className="p-2 pl-10 space-y-2 bg-slate-50/50">
                                                    {p.Variants.map(v => {
                                                        const state = localState.get(v.Product_Variant_ID);
                                                        const isLinked = state?.status === 'LINK';

                                                        return (
                                                            <div key={v.Product_Variant_ID} className={cn(
                                                                "flex flex-col sm:flex-row sm:items-center gap-3 p-2 rounded border transition-colors",
                                                                isLinked ? "bg-white border-blue-200 shadow-sm" : "border-transparent opacity-70"
                                                            )}>
                                                                <div className="flex items-center gap-3 min-w-[150px]">
                                                                    <Checkbox
                                                                        checked={isLinked}
                                                                        onCheckedChange={(c) => updateVariantState(v.Product_Variant_ID, { status: c ? 'LINK' : 'UNLINK' })}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-mono text-sm font-medium">{v.SKU}</span>
                                                                    </div>
                                                                </div>

                                                                {isLinked && (
                                                                    <div className="flex items-center gap-2 flex-1 animate-in fade-in zoom-in-95 duration-200">
                                                                        <div className="grid grid-cols-2 gap-2 flex-1">
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[10px] uppercase text-muted-foreground">Unit Cost</Label>
                                                                                <Input
                                                                                    className="h-7 text-sm"
                                                                                    placeholder="0.00"
                                                                                    type="number"
                                                                                    value={state?.unitCost}
                                                                                    onChange={(e) => updateVariantState(v.Product_Variant_ID, { unitCost: e.target.value })}
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[10px] uppercase text-muted-foreground">Lead Time (Days)</Label>
                                                                                <Input
                                                                                    className="h-7 text-sm"
                                                                                    placeholder="Days"
                                                                                    type="number"
                                                                                    value={state?.leadTime}
                                                                                    onChange={(e) => updateVariantState(v.Product_Variant_ID, { leadTime: e.target.value })}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center pt-4">
                                                                            <Checkbox
                                                                                id={`pref-${v.Product_Variant_ID}`}
                                                                                checked={state?.isPreferred}
                                                                                onCheckedChange={(c) => updateVariantState(v.Product_Variant_ID, { isPreferred: !!c })}
                                                                            />
                                                                            <Label htmlFor={`pref-${v.Product_Variant_ID}`} className="ml-2 text-xs cursor-pointer">Preferred</Label>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading || saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

