import { useState, useEffect } from 'react';
import { Filter, X, Search, ChevronDown, ChevronRight, Warehouse, AlertTriangle, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface InventoryFiltersState {
    warehouse_id?: string;
    search?: string;
    stock_status?: 'ALL' | 'LOW' | 'NORMAL';
    brand_id?: string;
    category_id?: string;
}

interface InventoryFiltersProps {
    initialFilters: InventoryFiltersState;
    onFilterChange: (filters: InventoryFiltersState) => void;
    warehouses: { Warehouse_ID: number; Name: string }[];
    brands: { Brand_ID: number; Brand_Name: string }[];
    categories: { Category_ID: number; Category_Name: string }[];
}

export function InventoryFilters({ initialFilters, onFilterChange, warehouses, brands, categories }: InventoryFiltersProps) {
    // Initialize from props to match parent state
    const [filters, setFilters] = useState<InventoryFiltersState>(initialFilters);
    const [isExpanded, setIsExpanded] = useState(false);

    // Debounce listener
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // Emit filters as-is to match parent state (which uses 'ALL')
            // Also clean ALL -> undefined if needed by parent logic, but parent logic currently works with ALL/undefined via backend?
            // Wait, previous fix said "Emit filters as-is" to match parent.
            // BUT backend service (inventory_service.py) uses `if filters.get("brand_id"):`.
            // If "ALL" is sent, `if "ALL":` is true. Then `p.Brand_ID = "ALL"`. No rows.
            // So we MUST convert ALL -> undefined for the backend call.
            // But if we emit `undefined` here, parent state updates to `undefined`.
            // Parent: `useState` initial is `searchParams` or `ALL`.
            // If parent has `ALL`, and here we emit `undefined`, parent updates?
            // Wait, parent deep compare: ALL vs undefined -> Update.
            // So we loop? 
            // In step 1559 we stopped cleaning for warehouse/stock to fix loop.
            // That implied parent handles cleanup before fetch OR backend handles ALL.
            // Let's check parent `fetchInventory` logic:
            // "if (currentFilters.warehouse_id && currentFilters.warehouse_id !== 'ALL') params.append..."
            // So parent handles the cleanup.
            // So we can emit 'ALL' safely.
            onFilterChange(filters);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof InventoryFiltersState, value: any) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const clearFilters = () => {
        setFilters({
            warehouse_id: 'ALL',
            search: '',
            stock_status: 'ALL',
            brand_id: 'ALL',
            category_id: 'ALL'
        });
    };

    const hasActiveFilters =
        (filters.warehouse_id && filters.warehouse_id !== 'ALL') ||
        filters.search ||
        (filters.stock_status && filters.stock_status !== 'ALL') ||
        (filters.brand_id && filters.brand_id !== 'ALL') ||
        (filters.category_id && filters.category_id !== 'ALL');

    return (
        <div className="bg-card border border-border rounded-lg mb-6">
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

            {/* Filter Controls */}
            {isExpanded && (
                <div className="p-4 pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Search */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Search Inventory
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Product, SKU, Variant..."
                                    value={filters.search || ''}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Warehouse Filter */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Warehouse
                            </label>
                            <Select
                                value={filters.warehouse_id || 'ALL'}
                                onValueChange={(val) => handleFilterChange('warehouse_id', val)}
                            >
                                <SelectTrigger>
                                    <div className="flex items-center gap-2">
                                        <Warehouse className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="All Warehouses" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Warehouses</SelectItem>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.Warehouse_ID} value={String(w.Warehouse_ID)}>
                                            {w.Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Brand Filter */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Brand
                            </label>
                            <Select
                                value={filters.brand_id || 'ALL'}
                                onValueChange={(val) => handleFilterChange('brand_id', val)}
                            >
                                <SelectTrigger>
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="All Brands" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Brands</SelectItem>
                                    {brands.map((b) => (
                                        <SelectItem key={b.Brand_ID} value={String(b.Brand_ID)}>
                                            {b.Brand_Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Category
                            </label>
                            <Select
                                value={filters.category_id || 'ALL'}
                                onValueChange={(val) => handleFilterChange('category_id', val)}
                            >
                                <SelectTrigger>
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="All Categories" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Categories</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.Category_ID} value={String(c.Category_ID)}>
                                            {c.Category_Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Stock Status Filter */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Stock Status
                            </label>
                            <Select
                                value={filters.stock_status || 'ALL'}
                                onValueChange={(val) => handleFilterChange('stock_status', val as any)}
                            >
                                <SelectTrigger>
                                    <div className="flex items-center gap-2">
                                        {filters.stock_status === 'LOW' ? (
                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        ) : filters.stock_status === 'NORMAL' ? (
                                            <Package className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Package className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        <SelectValue placeholder="All Levels" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Levels</SelectItem>
                                    <SelectItem value="LOW">Low Stock (≤ Reorder Level)</SelectItem>
                                    <SelectItem value="NORMAL">Normal Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
