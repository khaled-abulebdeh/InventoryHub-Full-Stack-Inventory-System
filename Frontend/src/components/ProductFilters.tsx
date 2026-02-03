import { useState, useEffect } from 'react';
import { Filter, X, Search, ChevronDown, ChevronRight } from 'lucide-react';
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
    // Use any to allow temporary invalid states (like "5.") while typing
    const [filters, setFilters] = useState<any>({
        sort_by: 'name',
        sort_order: 'ASC',
    });
    const [isExpanded, setIsExpanded] = useState(false);

    // Local validation errors
    const [priceError, setPriceError] = useState<string | null>(null);
    const [stockError, setStockError] = useState<string | null>(null);

    // Apply filters whenever they change
    useEffect(() => {
        const cleanFilters: Filters = {
            ...filters,
            brand_id: filters.brand_id ? Number(filters.brand_id) : undefined,
            category_id: filters.category_id ? Number(filters.category_id) : undefined,
            min_price: filters.min_price !== '' && filters.min_price !== undefined ? Number(filters.min_price) : undefined,
            max_price: filters.max_price !== '' && filters.max_price !== undefined ? Number(filters.max_price) : undefined,
            min_stock: filters.min_stock !== '' && filters.min_stock !== undefined ? Number(filters.min_stock) : undefined,
            max_stock: filters.max_stock !== '' && filters.max_stock !== undefined ? Number(filters.max_stock) : undefined,
        };

        let isValid = true;

        // Validate Price Range
        if (cleanFilters.min_price !== undefined && cleanFilters.max_price !== undefined && cleanFilters.min_price > cleanFilters.max_price) {
            setPriceError("Min Price cannot be greater than Max Price");
            isValid = false;
        } else {
            setPriceError(null);
        }

        // Validate Stock Range
        if (cleanFilters.min_stock !== undefined && cleanFilters.max_stock !== undefined && cleanFilters.min_stock > cleanFilters.max_stock) {
            setStockError("Min Stock cannot be greater than Max Stock");
            isValid = false;
        } else {
            setStockError(null);
        }

        if (!isValid) return; // Do not fetch if invalid

        onFilterChange(cleanFilters);
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof Filters, value: any) => {
        // Strict Input Validation
        if (['min_stock', 'max_stock'].includes(key)) {
            // Integer only, no negatives, no decimals
            if (value !== '' && value !== undefined && !/^\d+$/.test(value)) {
                return;
            }
        }

        if (['min_price', 'max_price'].includes(key)) {
            // Positive decimal numbers only
            if (value !== '' && value !== undefined && !/^\d*\.?\d*$/.test(value)) {
                return;
            }
        }

        setFilters((prev: any) => ({
            ...prev,
            [key]: value === '' ? undefined : value,
        }));
    };

    const handleIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow: Backspace, Delete, Tab, Escape, Enter, Arrow keys
        if ([
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
        ].includes(e.key)) {
            return;
        }

        // Ensure that it is a number
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleDecimalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow: Backspace, Delete, Tab, Escape, Enter, Arrow keys
        if ([
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
        ].includes(e.key)) {
            return;
        }

        // Allow: Dot (.) if strictly one doesn't exist yet
        if (e.key === '.') {
            const val = (e.target as HTMLInputElement).value;
            if (val.includes('.')) {
                e.preventDefault();
            }
            return;
        }

        // Ensure that it is a number
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const clearFilters = () => {
        setFilters({
            sort_by: 'name',
            sort_order: 'ASC',
        });
        setPriceError(null);
        setStockError(null);
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
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">Advanced Filters</h3>
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
                            type="button"
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
                <form
                    className="p-4 pt-0 space-y-4"
                    onSubmit={(e) => e.preventDefault()}
                >
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
                                    onKeyDown={handleDecimalKeyDown}
                                    onChange={(e) =>
                                        handleFilterChange('min_price', e.target.value)
                                    }
                                    className={priceError ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.max_price || ''}
                                    onKeyDown={handleDecimalKeyDown}
                                    onChange={(e) =>
                                        handleFilterChange('max_price', e.target.value)
                                    }
                                    className={priceError ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                            </div>
                            {priceError && (
                                <p className="text-destructive text-sm mt-1">{priceError}</p>
                            )}
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
                                    onKeyDown={handleIntegerKeyDown}
                                    onChange={(e) =>
                                        handleFilterChange('min_stock', e.target.value)
                                    }
                                    className={stockError ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.max_stock || ''}
                                    onKeyDown={handleIntegerKeyDown}
                                    onChange={(e) =>
                                        handleFilterChange('max_stock', e.target.value)
                                    }
                                    className={stockError ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                            </div>
                            {stockError && (
                                <p className="text-destructive text-sm mt-1">{stockError}</p>
                            )}
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
                </form>
            )}
        </div>
    );
}
