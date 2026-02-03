import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Package, ChevronDown, ChevronRight, Loader2, Pencil, Plus, X, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { VariantSuppliersDialog } from '@/components/VariantSuppliersDialog';
import { ProductFilters } from '@/components/ProductFilters';
import {
  fetchFilteredProducts,
  ProductFilters as Filters,
  FilteredProduct,
  Brand as ApiBrand,
  Category as ApiCategory
} from '@/lib/api';

const API_PRODUCTS = 'http://127.0.0.1:5000/api/products';
const API_BRANDS = 'http://127.0.0.1:5000/api/brands';
const API_CATEGORIES = 'http://127.0.0.1:5000/api/categories';

type Brand = { id: number; name: string };
type Category = { id: number; name: string; parentName?: string | null };

type Visibility = 'ACTIVE' | 'INACTIVE';

// Extended to include new fields from filter API
type ProductRow = {
  Product_ID: number;
  Product_Name: string;
  Description: string | null;
  Visibility: Visibility;
  Brand_Name: string;
  Category_Name: string;
  Variant_Count: number;
  Total_Stock?: number;
  Min_Price?: number;
  Max_Price?: number;
};

type Variant = {
  // ✅ added for edit/delete when product already exists in DB
  Product_Variant_ID?: number;

  sku: string;
  color: string;
  size: string;
  material: string;
  price: string; // keep as string for inputs
  discount_percent: string; // keep as string for inputs
};

const SKU_RE = /^[A-Z0-9_-]{5,40}$/;

export default function Products() {
  const { toast } = useToast();
  console.log("Rendering Products Page"); // DEBUG

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filters, setFilters] = useState<Filters>({});

  // Product dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ NEW: Editing product mode (null = create, number = edit product id)
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  // Variant dialog
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(
    null
  );

  // Supplier Dialog State
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [selectedVariantForSuppliers, setSelectedVariantForSuppliers] = useState<{
    id: number;
    sku: string;
  } | null>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    brandId: '',
    categoryId: '',
    visibility: 'ACTIVE' as Visibility,
  });

  const [variants, setVariants] = useState<Variant[]>([]);

  const [variantForm, setVariantForm] = useState<Variant>({
    sku: '',
    color: '',
    size: '',
    material: '',
    price: '',
    discount_percent: '0',
  });

  /* =========================
     Helpers
     ========================= */
  const mapApiVariantToUi = (v: any): Variant => ({
    Product_Variant_ID: Number(v.Product_Variant_ID),
    sku: String(v.SKU ?? '').toUpperCase(),
    color: String(v.Color ?? ''),
    size: String(v.Size ?? ''),
    material: String(v.Material ?? ''),
    price: String(v.Unit_Price ?? ''),
    // Convert 0-1 from DB to 0-100 for UI
    discount_percent: String((Number(v.Discount_Percent ?? 0) * 100).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '')),
  });

  // Track the current abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Updated to support filters
  const refreshProducts = async (currentFilters: Filters = filters) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      // Use the filter API instead of fetching all products directly
      const pData = await fetchFilteredProducts(currentFilters, controller.signal);
      if (Array.isArray(pData)) {
        setProducts(
          pData.map((p) => ({
            Product_ID: p.Product_ID,
            Product_Name: p.Product_Name,
            Description: p.Description,
            Visibility: (p.Visibility === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as Visibility,
            Brand_Name: p.Brand_Name,
            Category_Name: p.Category_Name,
            Variant_Count: p.Variant_Count,
            Total_Stock: p.Total_Stock,
            Min_Price: p.Min_Price,
            Max_Price: p.Max_Price
          }))
        );
      }
    } catch (e: any) {
      // Ignore abort errors
      if (e.name !== 'AbortError') {
        console.error(e);
      }
    } finally {
      // Only turn off loading if this is still the active request
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const refreshEditingProductVariants = async (productId: number) => {
    const res = await fetch(`${API_PRODUCTS}/${productId}`);
    const data = await res.json();
    setVariants((data.Variants || []).map(mapApiVariantToUi));
  };

  /* =========================
     Load Brands, Categories
     ========================= */
  useEffect(() => {
    let cancelled = false;

    const loadMetadata = async () => {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch(API_BRANDS),
          fetch(API_CATEGORIES),
        ]);

        // ---- BRANDS ----
        if (!bRes.ok) throw new Error('Failed to load brands');
        const bData = await bRes.json();
        const mappedBrands: Brand[] = (bData || []).map((b: any) => ({
          id: Number(b.Brand_ID),
          name: String(b.Brand_Name),
        }));

        // ---- CATEGORIES ----
        if (!cRes.ok) throw new Error('Failed to load categories');
        const cData = await cRes.json();
        const mappedCategories: Category[] = (cData || []).map((c: any) => ({
          id: Number(c.Category_ID),
          name: String(c.Category_Name),
          // safe: backend may return Parent_Name or Parent_Category_Name
          parentName: c.Parent_Name ?? c.Parent_Category_Name ?? null,
        }));

        if (!cancelled) {
          setBrands(mappedBrands);
          setCategories(mappedCategories);
        }

      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          toast({
            title: 'Error',
            description: e?.message || 'Failed to load metadata',
            variant: 'destructive',
          });
        }
      }
    };

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    refreshProducts(filters);
  }, [filters]);

  const categoryLabel = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach(c => {
      map.set(c.id, c.parentName ? `${c.parentName} → ${c.name}` : c.name);
    });
    return map;
  }, [categories]);

  /* =========================
     State for DEFERRED DELETES
     ========================= */
  const [deletedVariantIds, setDeletedVariantIds] = useState<number[]>([]);

  /* =========================
     Dialog Controls
     ========================= */
  const openAddProduct = () => {
    // ✅ create mode
    setEditingProductId(null);
    setDeletedVariantIds([]); // Reset deleted IDs

    setProductForm({
      name: '',
      description: '',
      brandId: '',
      categoryId: '',
      visibility: 'ACTIVE',
    });
    setVariants([]);
    setSaving(false);
    setProductDialogOpen(true);
  };

  // ✅ NEW: open edit product (same dialog, same UI)
  const openEditProduct = async (productId: number) => {
    try {
      const res = await fetch(`${API_PRODUCTS}/${productId}`);
      if (!res.ok) {
        toast({
          title: 'Error',
          description: `Failed to load product (HTTP ${res.status})`,
          variant: 'destructive',
        });
        return;
      }
      const data = await res.json();

      setEditingProductId(productId);
      setDeletedVariantIds([]); // Reset deleted IDs

      // map Brand_Name/Category_Name -> ids (because backend returns names)
      const brandId =
        brands.find(b => b.name === data.Brand_Name)?.id ?? '';
      const categoryId =
        categories.find(c => c.name === data.Category_Name)?.id ?? '';

      setProductForm({
        name: data.Product_Name ?? '',
        description: data.Description ?? '',
        brandId: String(brandId),
        categoryId: String(categoryId),
        visibility: (data.Visibility === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as Visibility,
      });

      setVariants((data.Variants || []).map(mapApiVariantToUi));

      setSaving(false);
      setProductDialogOpen(true);
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to load product',
        variant: 'destructive',
      });
    }
  };

  const closeProductDialog = () => {
    setProductDialogOpen(false);
    setSaving(false);

    // ✅ reset editing state so next open is clean
    setEditingProductId(null);
    setEditingVariantIndex(null);
    setDeletedVariantIds([]);
  };

  const openAddVariant = () => {
    setEditingVariantIndex(null);
    setVariantForm({
      sku: '',
      color: '',
      size: '',
      material: '',
      price: '',
      discount_percent: '0',
    });
    setVariantDialogOpen(true);
  };

  const openEditVariant = (index: number) => {
    setEditingVariantIndex(index);
    setVariantForm(variants[index]);
    setVariantDialogOpen(true);
  };

  const closeVariantDialog = () => {
    setVariantDialogOpen(false);
    setEditingVariantIndex(null);
  };

  // ✅ UPDATED: Local-only remove. Actual delete happens on Save.
  const removeVariant = async (index: number) => {
    // PREVENT deleting last variant
    if (variants.length <= 1) {
      toast({
        title: 'Validation',
        description: 'Product must have at least one variant',
        variant: 'destructive',
      });
      return;
    }

    const v = variants[index];

    // If it has an ID, mark for deletion upon Save
    if (v.Product_Variant_ID) {
      setDeletedVariantIds(prev => [...prev, v.Product_Variant_ID!]);
    }

    // Remove locally from UI
    setVariants(prev => prev.filter((_, i) => i !== index));
    toast({ title: 'Removed', description: 'Variant removed (save to apply)' });
  };

  // ✅ NEW: Open Supplier Manager
  const openSupplierDialog = (variant: Variant) => {
    if (!variant.Product_Variant_ID) return; // Should not happen if button disabled
    setSelectedVariantForSuppliers({
      id: variant.Product_Variant_ID,
      sku: variant.sku,
    });
    setSupplierDialogOpen(true);
  };

  const closeSupplierDialog = () => {
    setSupplierDialogOpen(false);
    setSelectedVariantForSuppliers(null);
  };

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  /* =========================
     Validation
     ========================= */
  const validateProduct = () => {
    if (!productForm.name.trim()) {
      toast({
        title: 'Validation',
        description: 'Product name is required',
        variant: 'destructive',
      });
      return false;
    }
    if (!productForm.brandId) {
      toast({
        title: 'Validation',
        description: 'Brand is required',
        variant: 'destructive',
      });
      return false;
    }
    if (!productForm.categoryId) {
      toast({
        title: 'Validation',
        description: 'Category is required',
        variant: 'destructive',
      });
      return false;
    }
    if (variants.length < 1) {
      toast({
        title: 'Validation',
        description: 'You must add at least one variant',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const validateVariant = (v: Variant) => {
    const sku = (v.sku || '').trim().toUpperCase();
    if (!SKU_RE.test(sku)) {
      toast({
        title: 'Variant Validation',
        description: 'SKU must be 5–40 chars and contain only A-Z, 0-9, _ or -',
        variant: 'destructive',
      });
      return false;
    }

    const price = Number(v.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast({
        title: 'Variant Validation',
        description: 'Price must be a positive number',
        variant: 'destructive',
      });
      return false;
    }

    const discount = Number(v.discount_percent);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      toast({
        title: 'Variant Validation',
        description: 'Discount must be between 0 and 100',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  /* =========================
     Save Variant (Local Only)
     ========================= */
  const saveVariant = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized: Variant = {
      ...variantForm,
      sku: (variantForm.sku || '').toUpperCase(),
      discount_percent: variantForm.discount_percent === '' ? '0' : variantForm.discount_percent,
      // IMPORTANT: Preserve ID if editing an existing variant
      Product_Variant_ID: variantForm.Product_Variant_ID,
    };

    if (!validateVariant(normalized)) return;

    // PREVENT DUPLICATE SKU LOCALLY
    const normalizedSku = normalized.sku.trim().toUpperCase();
    const existsLocally = variants.some((v, idx) => {
      if (editingVariantIndex !== null && idx === editingVariantIndex) {
        return false;
      }
      return v.sku.trim().toUpperCase() === normalizedSku;
    });

    if (existsLocally) {
      toast({
        title: 'Variant Validation',
        description: `Duplicate SKU in this product: ${normalizedSku}`,
        variant: 'destructive',
      });
      return;
    }

    // UPDATE LOCAL STATE ONLY
    if (editingVariantIndex === null) {
      // Add new
      setVariants(prev => [...prev, normalized]);
      toast({ title: 'Variant Added', description: 'Variant added to list (save to apply)' });
    } else {
      // Update existing
      setVariants(prev =>
        prev.map((x, i) => (i === editingVariantIndex ? normalized : x))
      );
      toast({ title: 'Variant Updated', description: 'Variant updated in list (save to apply)' });
    }

    closeVariantDialog();
  };

  /* =========================
     Submit Product + Variants
     ========================= */
  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProduct()) return;

    if (saving) return;
    setSaving(true);

    // ============================================
    // CREATE MODE
    // ============================================
    if (!editingProductId) {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description
          ? productForm.description.trim()
          : null,
        brand_id: Number(productForm.brandId),
        category_id: Number(productForm.categoryId),
        visibility: productForm.visibility,
        variants: variants.map(v => ({
          sku: v.sku.trim().toUpperCase(),
          color: v.color || null,
          size: v.size || null,
          material: v.material || null,
          price: Number(v.price),
          discount_percent: Number(v.discount_percent || '0') / 100, // Convert 0-100 to 0-1
        })),
      };

      const fixedPayload = {
        ...payload,
        description:
          productForm.description.trim() ? productForm.description.trim() : null,
        variants: payload.variants.map(v => ({
          ...v,
          color: v.color || null,
          size: v.size || null,
          material: v.material || null,
        })),
      };

      let res: Response;
      try {
        res = await fetch(API_PRODUCTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fixedPayload),
        });
      } catch {
        toast({
          title: 'Network Error',
          description: 'Cannot reach backend',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (!res.ok) {
        toast({
          title: 'Creation Failed',
          description: body?.error || 'Failed to create product',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({ title: 'Success', description: 'Product created with variants' });

      await refreshProducts();

      setSaving(false);
      closeProductDialog();
      return;
    }

    // ============================================
    // EDIT MODE - BATCH UPDATES
    // ============================================
    try {
      // 1. Update Product Details
      const editPayload = {
        name: productForm.name.trim(),
        description: productForm.description.trim() ? productForm.description.trim() : null,
        brand_id: Number(productForm.brandId),
        category_id: Number(productForm.categoryId),
        visibility: productForm.visibility,
      };

      const updateProductPromise = fetch(`${API_PRODUCTS}/${editingProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPayload),
      });

      // 2. Perform Variants Operations
      // We will collect all promises
      const variantPromises: Promise<any>[] = [updateProductPromise];

      // Deletes
      deletedVariantIds.forEach(vid => {
        variantPromises.push(
          fetch(`${API_PRODUCTS}/${editingProductId}/variants/${vid}`, {
            method: 'DELETE',
          })
        );
      });

      // Upserts (Create or Update)
      variants.forEach(v => {
        const payload = {
          sku: v.sku.trim().toUpperCase(),
          color: v.color || null,
          size: v.size || null,
          material: v.material || null,
          price: Number(v.price),
          discount_percent: Number(v.discount_percent || '0') / 100, // Convert 0-100 to 0-1
        };

        if (v.Product_Variant_ID) {
          // UPDATE EXISTING
          variantPromises.push(
            fetch(`${API_PRODUCTS}/${editingProductId}/variants/${v.Product_Variant_ID}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          );
        } else {
          // CREATE NEW
          variantPromises.push(
            fetch(`${API_PRODUCTS}/${editingProductId}/variants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          );
        }
      });

      // EXECUTE ALL
      const results = await Promise.all(variantPromises);

      // Check results
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        // We can try to get the first error message
        let errorMsg = 'One or more updates failed';
        try {
          const errBody = await failed[0].json();
          errorMsg = errBody.error || errorMsg;
        } catch { }

        toast({
          title: 'Update Incomplete',
          description: errorMsg,
          variant: 'destructive',
        });
        // We still refresh to show latest state
        await refreshProducts();
        setSaving(false);
        return;
      }

      toast({ title: 'Success', description: 'Product and variants updated' });
      await refreshProducts();
      closeProductDialog();

    } catch (e: any) {
      toast({
        title: 'System Error',
        description: e.message || 'An error occurred during save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Adapters for ProductFilters
  const brandOptions: ApiBrand[] = brands.map(b => ({
    Brand_ID: b.id,
    Brand_Name: b.name
  }));

  const categoryOptions: ApiCategory[] = categories.map(c => ({
    Category_ID: c.id,
    Category_Name: c.name
  }));

  // REMOVED early return which unmounted filters on load
  // if (loading && !products.length) return ( ... );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Create products and manage their variants"
        actions={
          <Button type="button" onClick={openAddProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        }
      />

      {/* FILTER COMPONENT */}
      <ProductFilters
        onFilterChange={handleFilterChange}
        brands={brandOptions}
        categories={categoryOptions}
      />

      {/* PRODUCT LIST */}
      {loading && !products.length ? (
        <div className="flex justify-center items-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 text-muted-foreground text-sm flex flex-col items-center gap-2 py-10 border rounded-lg bg-card">
          <Package className="w-8 h-8 opacity-50" />
          <p>No products found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {products.map((p) => (
            <div key={p.Product_ID} className="bg-card border rounded-lg p-5 relative hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{p.Product_Name}</h3>
                    <span className="text-xs text-muted-foreground">{p.Brand_Name}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-sm mt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{p.Category_Name}</span>
                </div>

                {p.Min_Price !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium">
                      {p.Min_Price === p.Max_Price
                        ? `$${p.Min_Price.toFixed(2)}`
                        : `$${p.Min_Price.toFixed(2)} - $${p.Max_Price?.toFixed(2)}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={`font-medium ${(p.Total_Stock || 0) > 20 ? 'text-green-600' :
                    (p.Total_Stock || 0) > 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {p.Total_Stock !== undefined ? `${p.Total_Stock} units` : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variants:</span>
                  <span className="bg-secondary px-2 py-0.5 rounded text-xs">
                    {p.Variant_Count}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${p.Visibility === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
                  }`}>
                  {p.Visibility}
                </span>

                {/* Edit Button */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => openEditProduct(p.Product_ID)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProductId ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              Fill product info, then add at least one variant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitProduct} className="grid gap-5">
            {/* Product fields */}
            <div className="grid gap-4">
              <div>
                <Label>Product Name</Label>
                <Input
                  value={productForm.name}
                  onChange={e =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={productForm.description}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Select
                    value={productForm.brandId}
                    onValueChange={v =>
                      setProductForm({ ...productForm, brandId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={productForm.categoryId}
                    onValueChange={v =>
                      setProductForm({ ...productForm, categoryId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.parentName ? `${c.parentName} → ${c.name}` : c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Visibility</Label>
                  <Select
                    value={productForm.visibility}
                    onValueChange={v =>
                      setProductForm({
                        ...productForm,
                        visibility: v as Visibility,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Variants section */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Variants</h3>
                  <p className="text-sm text-muted-foreground">
                    Add at least one variant (SKU, price, discount).
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={openAddVariant}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variant
                </Button>
              </div>

              {variants.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No variants yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 border rounded-md p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm break-all">{v.sku}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {v.color || '—'} • {v.size || '—'} • {v.material || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Selling Price: {v.price || '—'} | Customer Discount: {v.discount_percent || '0'}%
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {/* ✅ NEW: Manage Suppliers Button */}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Manage Suppliers"
                          disabled={!v.Product_Variant_ID} // Only if saved
                          className={!v.Product_Variant_ID ? 'opacity-30' : ''}
                          onClick={() => openSupplierDialog(v)}
                        >
                          <Truck className="w-4 h-4 text-blue-600" />
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditVariant(idx)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeVariant(idx)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeProductDialog}>
                Cancel
              </Button>

              {/* ✅ keep same button UI; only text changes in edit mode */}
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingProductId ? 'Save Changes' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>
              {editingVariantIndex === null ? 'Add Variant' : 'Edit Variant'}
            </DialogTitle>
            <DialogDescription>
              SKU is required and must be unique. Price must be positive. Discount 0–100.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveVariant} className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <Input
                  value={variantForm.sku}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      sku: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. RB-CL-BLK-M"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Allowed: A-Z 0-9 _ - (5–40 chars)
                </div>
              </div>

              <div>
                <Label>Material</Label>
                <Input
                  value={variantForm.material}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      material: e.target.value,
                    })
                  }
                  placeholder="Metal / Plastic ..."
                />
              </div>

              <div>
                <Label>Color</Label>
                <Input
                  value={variantForm.color}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      color: e.target.value,
                    })
                  }
                  placeholder="Black / Blue ..."
                />
              </div>

              <div>
                <Label>Size</Label>
                <Input
                  value={variantForm.size}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      size: e.target.value,
                    })
                  }
                  placeholder="S / M / L ..."
                />
              </div>

              <div>
                <Label>Selling Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variantForm.price}
                  onChange={e =>
                    setVariantForm({ ...variantForm, price: e.target.value })
                  }
                  placeholder="0.00 (to customer)"
                />
              </div>

              <div>
                <Label>Customer Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={variantForm.discount_percent}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      discount_percent: e.target.value,
                    })
                  }
                  placeholder="0 (Selling Discount)"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeVariantDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVariantIndex === null ? 'Add Variant' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ NEW: Variant Suppliers Dialog */}
      {selectedVariantForSuppliers && (
        <VariantSuppliersDialog
          open={supplierDialogOpen}
          onClose={closeSupplierDialog}
          variantId={selectedVariantForSuppliers.id}
          variantSku={selectedVariantForSuppliers.sku}
        />
      )}
    </div>
  );
}
