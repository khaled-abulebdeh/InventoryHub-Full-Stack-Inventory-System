import { useEffect, useState, useCallback } from 'react';
import { Plus, Mail, Phone, X, Pencil, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SupplierProductManager } from '@/components/SupplierProductManager';
import { SupplierFilters, SupplierFiltersState } from '@/components/SupplierFilters';
import { fetchFilteredSuppliers } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

const API_URL = 'http://127.0.0.1:5000/api/suppliers';

/* =========================
   TYPES
   ========================= */
type Supplier = {
  id: number;
  name: string;
  email: string | null;
  description: string | null;
  phones: string[];
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SupplierFiltersState>({});

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  // Confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    phones: [''],
  });

  // Supplier Product Manager State
  const [selectedSupplierForManager, setSelectedSupplierForManager] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { toast } = useToast();

  /* =========================
     FETCH SUPPLIERS
     ========================= */
  const refreshSuppliers = useCallback(async (currentFilters: SupplierFiltersState) => {
    setLoading(true);
    try {
      const data = await fetchFilteredSuppliers(currentFilters);
      setSuppliers(
        data.map((s: any) => ({
          id: s.Supplier_ID,
          name: s.Supplier_Name,
          email: s.Email,
          description: s.Description ?? null,
          phones: s.Phones ?? [],
        }))
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load suppliers.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load & Filter change
  useEffect(() => {
    refreshSuppliers(filters);
  }, [filters, refreshSuppliers]);

  const handleFilterChange = (newFilters: SupplierFiltersState) => {
    setFilters(newFilters);
  };

  /* =========================
     VALIDATION
     ========================= */
  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Supplier name is required',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Invalid email format',
        variant: 'destructive',
      });
      return false;
    }

    const phones = formData.phones.filter(p => p.trim() !== '');

    if (phones.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one phone number is required',
        variant: 'destructive',
      });
      return false;
    }

    for (const phone of phones) {
      if (!/^[\d\s]{8,}$/.test(phone)) {
        toast({
          title: 'Validation Error',
          description: `Invalid phone number: ${phone}`,
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  /* =========================
     PHONE HANDLERS
     ========================= */
  const addPhoneField = () =>
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, ''],
    }));

  const removePhoneField = (index: number) =>
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));

  const updatePhone = (index: number, value: string) => {
    const updated = [...formData.phones];
    updated[index] = value;
    setFormData({ ...formData, phones: updated });
  };

  /* =========================
     ADD / UPDATE
     ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (saving) return;
    setSaving(true);

    const method = editingSupplier ? 'PUT' : 'POST';
    const url = editingSupplier ? `${API_URL}/${editingSupplier.id}` : API_URL;

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email,
          description: formData.description,
          phones: formData.phones.filter(p => p.trim() !== ''),
        }),
      });
    } catch {
      toast({
        title: 'Network Error',
        description: 'Cannot reach backend.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      toast({
        title: 'Error',
        description: 'Invalid server response.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    if (!response.ok) {
      toast({
        title: 'Error',
        description: result?.error || 'Operation failed.',
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    toast({ title: editingSupplier ? 'Updated' : 'Added', description: `Supplier ${editingSupplier ? 'updated' : 'added'} successfully` });

    // Refresh list from server to ensure data is correct
    refreshSuppliers(filters);

    setSaving(false);
    closeDialog();
  };

  /* =========================
     DELETE
     ========================= */
  const requestDelete = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setConfirmOpen(false);

    let res: Response;
    try {
      res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch {
      toast({
        title: 'Network Error',
        description: 'Cannot reach backend.',
        variant: 'destructive',
      });
      return;
    }

    if (!res.ok) {
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      toast({
        title: 'Error',
        description: body?.error || 'Delete failed',
        variant: 'destructive',
      });
      return;
    }

    // Refresh list from server
    refreshSuppliers(filters);
    toast({ title: 'Deleted', description: 'Supplier removed' });
  };

  /* =========================
     DIALOG CONTROL
     ========================= */
  const openAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      description: '',
      phones: [''],
    });
    setIsDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      email: s.email ?? '',
      description: s.description ?? '',
      phones: Array.isArray(s.phones) && s.phones.length > 0 ? s.phones : [''],
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      description: '',
      phones: [''],
    });
    setSaving(false);
  };

  const openProductManager = (s: Supplier) => {
    setSelectedSupplierForManager({ id: s.id, name: s.name });
  };

  if (loading && suppliers.length === 0) return <p>Loading suppliers...</p>;

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier relationships"
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        }
      />

      <SupplierFilters onFilterChange={handleFilterChange} />

      {/* SUPPLIER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {suppliers.map(s => (
          <div key={s.id} className="bg-card border rounded-lg p-5">
            <div className="flex justify-between items-start">
              <div
                className="cursor-pointer hover:underline"
                onClick={() => openProductManager(s)}
                title="Click to manage linked products"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  {s.name}
                  <Truck className="w-3 h-3 text-muted-foreground" />
                </h3>
              </div>

              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {s.description && (
              <p className="text-sm text-muted-foreground mt-2">{s.description}</p>
            )}

            {s.email && (
              <div className="flex gap-2 text-sm mt-2">
                <Mail className="w-4 h-4" />
                {s.email}
              </div>
            )}

            {s.phones.map((p, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <Phone className="w-4 h-4" />
                {p}
              </div>
            ))}
          </div>
        ))}
      </div>

      {suppliers.length === 0 && !loading && (
        <div className="text-center py-10 text-muted-foreground">
          No suppliers found matching your filters.
        </div>
      )}

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
            </DialogTitle>
            <DialogDescription>Supplier details</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Phones</Label>

              {formData.phones.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={p} onChange={e => updatePhone(i, e.target.value)} />
                  {formData.phones.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => removePhoneField(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="pt-2">
                <Button type="button" variant="outline" onClick={addPhoneField}>
                  + Add Phone
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingSupplier ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LINK MANAGER DIALOG */}
      {selectedSupplierForManager && (
        <SupplierProductManager
          open={!!selectedSupplierForManager}
          onClose={() => setSelectedSupplierForManager(null)}
          supplierId={selectedSupplierForManager.id}
          supplierName={selectedSupplierForManager.name}
        />
      )}

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone."
        onConfirm={confirmDelete}
        variant="destructive"
        confirmText="Delete"
      />
    </div>
  );
}
