import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, Trash2, Plus, Star, Pencil, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'http://127.0.0.1:5000/api';

type Supplier = {
    Supplier_ID: number;
    Supplier_Name: string;
};

type LinkedSupplier = {
    Supplier_ID: number;
    Supplier_Name: string;
    Product_Variant_ID: number;
    Preferred_Flag: boolean;
    Unit_Cost: number | null;
    Lead_Time_Days: number | null;
};

interface VariantSuppliersDialogProps {
    open: boolean;
    onClose: () => void;
    variantId: number;
    variantSku: string;
}

import { ConfirmationDialog } from '@/components/ConfirmationDialog';

export function VariantSuppliersDialog({
    open,
    onClose,
    variantId,
    variantSku,
}: VariantSuppliersDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [links, setLinks] = useState<LinkedSupplier[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

    // Confirmation State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Form State (Add)
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [leadTime, setLeadTime] = useState('');
    const [isPreferred, setIsPreferred] = useState(false);
    const [adding, setAdding] = useState(false);

    // Form State (Edit)
    const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
    const [editUnitCost, setEditUnitCost] = useState('');
    const [editLeadTime, setEditLeadTime] = useState('');
    const [editIsPreferred, setEditIsPreferred] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (open && variantId) {
            fetchData();
        }
    }, [open, variantId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Links
            const linksRes = await fetch(`${API_BASE}/variants/${variantId}/suppliers`);
            if (!linksRes.ok) throw new Error('Failed to load links');
            const linksData = await linksRes.json();
            setLinks(linksData);

            // 2. Fetch All Suppliers (for dropdown)
            const suppRes = await fetch(`${API_BASE}/suppliers`);
            if (!suppRes.ok) throw new Error('Failed to load suppliers');
            const suppData = await suppRes.json();
            setAllSuppliers(suppData);
        } catch (e: any) {
            console.error(e);
            toast({
                title: 'Error',
                description: 'Failed to load supplier data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddLink = async () => {
        if (!selectedSupplierId) {
            toast({
                title: 'Validation',
                description: 'Please select a supplier',
                variant: 'destructive',
            });
            return;
        }

        if (!unitCost || !leadTime) {
            toast({
                title: 'Validation',
                description: 'Unit Cost and Lead Time are required',
                variant: 'destructive',
            });
            return;
        }

        setAdding(true);
        try {
            const payload = {
                supplier_id: Number(selectedSupplierId),
                unit_cost: unitCost ? Number(unitCost) : null,
                lead_time_days: leadTime ? Number(leadTime) : null,
                is_preferred: isPreferred
            };

            const res = await fetch(`${API_BASE}/variants/${variantId}/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to link supplier');
            }

            toast({ title: 'Success', description: 'Supplier linked' });

            // Reset form
            setSelectedSupplierId('');
            setUnitCost('');
            setLeadTime('');
            setIsPreferred(false);

            // Refresh list
            await fetchData();
        } catch (e: any) {
            toast({
                title: 'Error',
                description: e.message,
                variant: 'destructive',
            });
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateLink = async (supplierId: number) => {
        if (!editUnitCost || !editLeadTime) {
            toast({
                title: 'Validation',
                description: 'Unit Cost and Lead Time are required',
                variant: 'destructive',
            });
            return;
        }

        setUpdating(true);
        try {
            const payload = {
                unit_cost: editUnitCost ? Number(editUnitCost) : null,
                lead_time_days: editLeadTime ? Number(editLeadTime) : null,
                is_preferred: editIsPreferred
            };

            const res = await fetch(`${API_BASE}/variants/${variantId}/suppliers/${supplierId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update link');
            }

            toast({ title: 'Success', description: 'Link updated' });
            setEditingSupplierId(null);
            await fetchData();
        } catch (e: any) {
            toast({
                title: 'Error',
                description: e.message,
                variant: 'destructive',
            });
        } finally {
            setUpdating(false);
        }
    };

    const startEditing = (link: LinkedSupplier) => {
        setEditingSupplierId(link.Supplier_ID);
        setEditUnitCost(link.Unit_Cost ? String(link.Unit_Cost) : '');
        setEditLeadTime(link.Lead_Time_Days ? String(link.Lead_Time_Days) : '');
        setEditIsPreferred(link.Preferred_Flag);
    };

    const requestDelete = (supplierId: number) => {
        setDeleteId(supplierId);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const supplierId = deleteId;
        setConfirmOpen(false);

        try {
            const res = await fetch(
                `${API_BASE}/variants/${variantId}/suppliers/${supplierId}`,
                { method: 'DELETE' }
            );

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to remove link');
            }

            toast({ title: 'Removed', description: 'Supplier link removed' });
            // update local state
            setLinks(prev => prev.filter(l => l.Supplier_ID !== supplierId));
        } catch (e: any) {
            toast({
                title: 'Error',
                description: e.message,
                variant: 'destructive',
            });
        }
    };

    const handleDeleteLink = (supplierId: number) => {
        requestDelete(supplierId);
    };


    // Filter out suppliers already linked
    const availableSuppliers = allSuppliers.filter(
        s => !links.some(l => l.Supplier_ID === s.Supplier_ID)
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Suppliers for SKU: {variantSku}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* ADD NEW LINK FORM */}
                    <div className="bg-slate-50 p-4 rounded-md border space-y-4">
                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Link New Supplier
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Supplier</Label>
                                <Select
                                    value={selectedSupplierId}
                                    onValueChange={setSelectedSupplierId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Supplier..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSuppliers.map(s => (
                                            <SelectItem key={s.Supplier_ID} value={String(s.Supplier_ID)}>
                                                {s.Supplier_Name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Unit Cost</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={unitCost}
                                    onChange={e => setUnitCost(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Lead Time (Days)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 7"
                                    value={leadTime}
                                    onChange={e => setLeadTime(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center space-x-2 h-full pt-6">
                                <Checkbox
                                    id="preferred"
                                    checked={isPreferred}
                                    onCheckedChange={(c) => setIsPreferred(!!c)}
                                />
                                <Label htmlFor="preferred" className="cursor-pointer">Preferred Supplier?</Label>
                            </div>
                        </div>

                        <Button
                            onClick={handleAddLink}
                            disabled={adding || !selectedSupplierId}
                            className="w-full md:w-auto"
                        >
                            {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Add Link
                        </Button>
                    </div>

                    {/* LIST EXISTING LINKS */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Lead Time</TableHead>
                                    <TableHead className="w-[100px] text-center">Attr</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : links.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No suppliers linked yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    links.map(link => {
                                        const isEditing = editingSupplierId === link.Supplier_ID;
                                        return (
                                            <TableRow key={link.Supplier_ID} className={isEditing ? "bg-blue-50/50" : ""}>
                                                <TableCell className="font-medium align-middle">
                                                    {link.Supplier_Name}
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className="h-8 w-24"
                                                            value={editUnitCost}
                                                            onChange={e => setEditUnitCost(e.target.value)}
                                                        />
                                                    ) : (
                                                        link.Unit_Cost ? `$${Number(link.Unit_Cost).toFixed(2)}` : '-'
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-20"
                                                            value={editLeadTime}
                                                            onChange={e => setEditLeadTime(e.target.value)}
                                                        />
                                                    ) : (
                                                        link.Lead_Time_Days ? `${link.Lead_Time_Days} days` : '-'
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center align-middle">
                                                    {isEditing ? (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                            onClick={() => setEditIsPreferred(!editIsPreferred)}
                                                        >
                                                            <Star
                                                                className={cn(
                                                                    "w-4 h-4 transition-colors",
                                                                    editIsPreferred ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                                                                )}
                                                            />
                                                        </Button>
                                                    ) : (
                                                        link.Preferred_Flag && (
                                                            <div className="flex justify-center">
                                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                            </div>
                                                        )
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    <div className="flex items-center gap-1">
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => handleUpdateLink(link.Supplier_ID)}
                                                                    disabled={updating}
                                                                >
                                                                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-500"
                                                                    onClick={() => setEditingSupplierId(null)}
                                                                    disabled={updating}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={() => startEditing(link)}
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDeleteLink(link.Supplier_ID)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <ConfirmationDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title="Remove Link?"
                    description="This will unlink the supplier from this variant."
                    onConfirm={confirmDelete}
                    variant="destructive"
                    confirmText="Remove"
                />
            </DialogContent>
        </Dialog>
    );
}
