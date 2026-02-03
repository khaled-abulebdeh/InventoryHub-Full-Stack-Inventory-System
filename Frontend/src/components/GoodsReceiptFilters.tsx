import { useState, useEffect } from 'react';
import { Filter, X, Search, ChevronDown, ChevronRight, Package, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SmartDateInput } from './SmartDateInput';

export interface GoodsReceiptFiltersState {
    search?: string;
    product_search?: string;
    start_date?: string;
    end_date?: string;
}

interface GoodsReceiptFiltersProps {
    onFilterChange: (filters: GoodsReceiptFiltersState) => void;
}

export function GoodsReceiptFilters({ onFilterChange }: GoodsReceiptFiltersProps) {
    const [filters, setFilters] = useState<GoodsReceiptFiltersState>({
        search: '',
        product_search: '',
        start_date: '',
        end_date: ''
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const [dateError, setDateError] = useState(false);

    // Debounce listener with validation
    useEffect(() => {
        // Only validate date range when BOTH dates are filled
        if (filters.start_date && filters.end_date) {
            if (new Date(filters.end_date) < new Date(filters.start_date)) {
                setDateError(true);
                return; // Do not trigger parent update if invalid
            }
        }
        setDateError(false);

        const timeoutId = setTimeout(() => {
            onFilterChange(filters);
        }, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof GoodsReceiptFiltersState, value: any) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === '' ? undefined : value,
        }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            product_search: '',
            start_date: '',
            end_date: ''
        });
        setDateError(false);
    };

    const hasActiveFilters =
        filters.search ||
        filters.product_search ||
        filters.start_date ||
        filters.end_date;

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* General Search */}
                        <div className="lg:col-span-2">
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Search Receipt
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Receipt ID, PO Number, Supplier..."
                                    value={filters.search || ''}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Product Search */}
                        <div className="lg:col-span-2">
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Contains Product
                            </label>
                            <div className="relative">
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="SKU or Product Name..."
                                    value={filters.product_search || ''}
                                    onChange={(e) => handleFilterChange('product_search', e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                From Date
                            </label>
                            <SmartDateInput
                                value={filters.start_date}
                                onChange={(val) => handleFilterChange('start_date', val)}
                                hasError={dateError}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                To Date
                            </label>
                            <SmartDateInput
                                value={filters.end_date}
                                onChange={(val) => handleFilterChange('end_date', val)}
                                hasError={dateError}
                            />
                            {dateError && (
                                <p className="text-xs text-red-500 mt-1 font-medium">
                                    Start date cannot be after end date
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
