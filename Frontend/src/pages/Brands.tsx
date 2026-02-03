import { useEffect, useState } from 'react';
import { Plus, Edit, Tag, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';


const API_URL = 'http://127.0.0.1:5000/api/brands';

type Brand = {
  id: number;
  name: string;
  description: string | null;
};

export default function Brands() {
  /* =========================
     STATE
     ========================= */
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const { toast } = useToast();

  /* =========================
     FETCH BRANDS
     ========================= */
  const fetchBrands = () => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setBrands(
          data.map((b: any) => ({
            id: b.Brand_ID,
            name: b.Brand_Name,
            description: b.Description ?? null,
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to load brands.',
          variant: 'destructive',
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  /* =========================
     ADD / UPDATE
     ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Brand name is required',
        variant: 'destructive',
      });
      return;
    }

    if (saving) return;
    setSaving(true);

    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API_URL}/${editing.id}` : API_URL;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Operation failed');
      }

      toast({
        title: 'Success',
        description: `Brand ${editing ? 'updated' : 'added'} successfully`,
      });
      fetchBrands();
      closeDialog();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };



  /* =========================
     DIALOG
     ========================= */
  const openAdd = () => {
    setEditing(null);
    setFormData({ name: '', description: '' });
    setOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setFormData({
      name: b.name,
      description: b.description ?? '',
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setFormData({ name: '', description: '' });
  };

  if (loading) return <p>Loading brands...</p>;

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage product brands"
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Brand
          </Button>
        }
      />

      {/* Search Filter */}
      <div className="mt-6 mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search brands (name or description)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands
          .filter(b =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .map(b => (
            <Card key={b.id} className="group hover:shadow-md transition-shadow relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary/60" />
                  <CardTitle className="text-xl font-bold text-gray-800">{b.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openEdit(b)}
                >
                  <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </Button>
              </CardHeader>
              <CardContent>
                {b.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {b.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">
                    No description provided
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      <Dialog open={open} onOpenChange={o => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Brand' : 'Add Brand'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


    </div>
  );
}
