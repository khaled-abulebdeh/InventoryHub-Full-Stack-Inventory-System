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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'http://127.0.0.1:5000/api';

interface Product {
    Product_ID: number;
    Product_Name: string;
    Category_ID: number;
    Brand_ID: number;
    Description: string;
}

interface Variant {
    Product_Variant_ID: number;
    Product_ID: number;
    SKU: string;
    Unit_Price: number;
}

// Update Interface
interface SupplierInfo {
    Supplier_ID: number;
    Supplier_Name: string;
    Unit_Cost: number; // This is SupplierProductVariant.Unit_Cost (likely unused if we use ProductVariant.Unit_Price)
    Lead_Time_Days: number;
    Is_Preferred: boolean;
    Unit_Price?: number; // From ProductVariant
}

interface POAddItemDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (item: any) => void;
    currentSupplierId?: number | null;
}

export function POAddItemDialog({ open, onClose, onAdd, currentSupplierId }: POAddItemDialogProps) {
    const { toast } = useToast();

    // Data Loading State
    const [products, setProducts] = useState<Product[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);

    // Selection State
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    const [selectedSupplier, setSelectedSupplier] = useState<SupplierInfo | null>(null);
    const [quantity, setQuantity] = useState<number>(1);

    // Initial Data Fetch
    useEffect(() => {
        if (open) {
            setSelectedProductId('');
            setSelectedVariantId('');
            setSuppliers([]);
            setSelectedSupplier(null);
            setQuantity(1);
            fetchProducts();
        }
    }, [open]);

    // Clear variant when product changes
    useEffect(() => {
        setSelectedVariantId('');
    }, [selectedProductId]);

    const fetchProducts = async () => {
        try {
            const [pRes, vRes] = await Promise.all([
                fetch(`${API_BASE}/products`),
                fetch(`${API_BASE}/products/variants`)
            ]);
            const pData = await pRes.json();
            const vData = await vRes.json();
            setProducts(pData);
            setVariants(vData);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
        }
    };

    // Fetch Suppliers when Variant is selected
    useEffect(() => {
        if (selectedVariantId) {
            fetchSuppliersForVariant(selectedVariantId);
        } else {
            setSuppliers([]);
            setSelectedSupplier(null);
        }
    }, [selectedVariantId]);

    const fetchSuppliersForVariant = async (vid: string) => {
        setLoadingSuppliers(true);
        try {
            const res = await fetch(`${API_BASE}/variants/${vid}/suppliers`);
            if (!res.ok) throw new Error('Failed to load suppliers');
            const data = await res.json();
            setSuppliers(data);

            if (currentSupplierId) {
                const match = data.find((s: SupplierInfo) => s.Supplier_ID === currentSupplierId);
                if (match) setSelectedSupplier(match);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSuppliers(false);
        }
    };

    const handleAdd = () => {
        if (!selectedVariantId || !selectedSupplier || quantity < 1) return;

        const variant = variants.find(v => String(v.Product_Variant_ID) === selectedVariantId);
        const product = products.find(p => p.Product_ID === variant?.Product_ID);

        // Calculate Cost Details from Selected Supplier (strictly use Unit_Cost)
        const supplierCost = selectedSupplier.Unit_Cost ?? 0;

        onAdd({
            variantId: Number(selectedVariantId),
            variantName: variant?.SKU,
            productName: product?.Product_Name,
            supplierId: selectedSupplier.Supplier_ID,
            supplierName: selectedSupplier.Supplier_Name,
            quantity: quantity,
            unitCost: supplierCost,
            leadTime: selectedSupplier.Lead_Time_Days
        });
        onClose();
    };

    const productVariants = variants.filter(v => String(v.Product_ID) === selectedProductId);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add Item to Order</DialogTitle>
                    <DialogDescription>Select a product variant and supplier.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Product & Variant Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Product</Label>
                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.Product_ID} value={String(p.Product_ID)}>
                                            {p.Product_Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Variant</Label>
                            <Select
                                value={selectedVariantId}
                                onValueChange={setSelectedVariantId}
                                disabled={!selectedProductId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Variant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {productVariants.map(v => (
                                        <SelectItem key={v.Product_Variant_ID} value={String(v.Product_Variant_ID)}>
                                            {v.SKU}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={quantity}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                if (val) {
                                    setQuantity(parseInt(val, 10));
                                } else {
                                    setQuantity(0);
                                }
                            }}
                            onBlur={() => {
                                if (quantity < 1) setQuantity(1);
                            }}
                        />
                    </div>

                    {/* Supplier List */}
                    {
                        selectedVariantId && (
                            <div className="space-y-2 border rounded-md p-3 bg-slate-50">
                                <Label className="mb-2 block">Select Supplier</Label>
                                {loadingSuppliers ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : suppliers.length === 0 ? (
                                    <p className="text-sm text-red-500">No suppliers linked to this variant.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                        {suppliers.map(s => {
                                            const isAllowed = !currentSupplierId || s.Supplier_ID === currentSupplierId;
                                            const isSelected = selectedSupplier?.Supplier_ID === s.Supplier_ID;

                                            // Calculate Cost Details
                                            const cost = s.Unit_Cost || 0;


                                            return (
                                                <div
                                                    key={s.Supplier_ID}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded border cursor-pointer transition-colors",
                                                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-white hover:bg-slate-100",
                                                        !isAllowed && "opacity-50 cursor-not-allowed bg-slate-100 grayscale"
                                                    )}
                                                    onClick={() => isAllowed && setSelectedSupplier(s)}
                                                >
                                                    <div className="flex flex-col w-full">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{s.Supplier_Name}</span>
                                                                {s.Is_Preferred && <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded">Preferred</span>}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">Lead: {s.Lead_Time_Days ?? '-'} days</span>
                                                        </div>

                                                        <div className="text-xs flex gap-3 mt-1 items-center">
                                                            <span className="text-muted-foreground">Supplier Cost: ${cost.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    {isSelected && <Check className="w-4 h-4 text-primary ml-2" />}

                                                    {!isAllowed && (
                                                        <span className="text-[10px] text-red-500 font-medium ml-auto px-2">
                                                            Diff Supplier
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    }
                </div >

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={!selectedSupplier || quantity < 1}>
                        Add Item
                    </Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
