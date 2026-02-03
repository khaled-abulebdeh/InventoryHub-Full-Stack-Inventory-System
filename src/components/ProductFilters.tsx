import { useState, useEffect } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ProductFilters as Filters, Brand, Category } from '@/lib/api';

interface ProductFiltersProps {
    onFilterChange: (filters: Filters) => void;
    brands: Brand[];
    categories: Category[];
}

export function ProductFilters({ onFilterChange, brands, categories }: ProductFiltersProps) {
    const [filters, setFilters] = useState<Filters>({
        sort_by: 'name',
        sort_order: 'ASC',
    });
    const [isExpanded, setIsExpanded] = useState(true);

    // Apply filters whenever they change
    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof Filters, value: any) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === '' ? undefined : value,
        }));
    };

    const clearFilters = () => {
        setFilters({
            sort_by: 'name',
            sort_order: 'ASC',
        });
    };

    const hasActiveFilters =
        filters.brand_id ||
        filters.category_id ||
        filters.visibility ||
        filters.min_price ||
        filters.max_price ||
        filters.min_stock ||
        filters.max_stock ||
        filters.has_discount ||
        filters.search ||
        filters.sku_search;

    return (
        <div className="bg-card border border-border rounded-lg mb-4">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">Filters</h3>
                    {hasActiveFilters && (
                        <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                            Active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearFilters();
                            }}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Controls */}
            {isExpanded && (
                <div className="p-4 pt-0 space-y-4">
                    {/* Search Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Search Products
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name or description..."
                                    value={filters.search || ''}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Search by SKU
                            </label>
                            <Input
                                placeholder="Enter SKU..."
                                value={filters.sku_search || ''}
                                onChange={(e) => handleFilterChange('sku_search', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Brand, Category, Visibility Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Brand
                            </label>
                            <Select
                                value={filters.brand_id?.toString() || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('brand_id', value === 'all' ? undefined : parseInt(value))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Brands" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Brands</SelectItem>
                                    {brands.map((brand) => (
                                        <SelectItem key={brand.Brand_ID} value={brand.Brand_ID.toString()}>
                                            {brand.Brand_Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Category
                            </label>
                            <Select
                                value={filters.category_id?.toString() || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('category_id', value === 'all' ? undefined : parseInt(value))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.Category_ID} value={category.Category_ID.toString()}>
                                            {category.Category_Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Visibility
                            </label>
                            <Select
                                value={filters.visibility || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('visibility', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Products" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Products</SelectItem>
                                    <SelectItem value="ACTIVE">Active Only</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Price & Stock Range Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Price Range
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.min_price || ''}
                                    onChange={(e) =>
                                        handleFilterChange('min_price', e.target.value ? parseFloat(e.target.value) : undefined)
                                    }
                                />
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.max_price || ''}
                                    onChange={(e) =>
                                        handleFilterChange('max_price', e.target.value ? parseFloat(e.target.value) : undefined)
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Stock Level
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.min_stock || ''}
                                    onChange={(e) =>
                                        handleFilterChange('min_stock', e.target.value ? parseInt(e.target.value) : undefined)
                                    }
                                />
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.max_stock || ''}
                                    onChange={(e) =>
                                        handleFilterChange('max_stock', e.target.value ? parseInt(e.target.value) : undefined)
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sort & Additional Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Sort By
                            </label>
                            <Select
                                value={filters.sort_by || 'name'}
                                onValueChange={(value) => handleFilterChange('sort_by', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="price">Price</SelectItem>
                                    <SelectItem value="stock">Stock</SelectItem>
                                    <SelectItem value="variant_count">Variant Count</SelectItem>
                                    <SelectItem value="brand">Brand</SelectItem>
                                    <SelectItem value="category">Category</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Order
                            </label>
                            <Select
                                value={filters.sort_order || 'ASC'}
                                onValueChange={(value) => handleFilterChange('sort_order', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ASC">Ascending</SelectItem>
                                    <SelectItem value="DESC">Descending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Discount
                            </label>
                            <Select
                                value={filters.has_discount === true ? 'true' : filters.has_discount === false ? 'false' : 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('has_discount', value === 'all' ? undefined : value === 'true')
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Products" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Products</SelectItem>
                                    <SelectItem value="true">With Discount</SelectItem>
                                    <SelectItem value="false">No Discount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
