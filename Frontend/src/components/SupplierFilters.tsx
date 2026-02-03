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

export interface SupplierFiltersState {
    search?: string;
    sort_by?: 'name' | 'email';
    order?: 'ASC' | 'DESC';
}

interface SupplierFiltersProps {
    onFilterChange: (filters: SupplierFiltersState) => void;
}

export function SupplierFilters({ onFilterChange }: SupplierFiltersProps) {
    const [filters, setFilters] = useState<SupplierFiltersState>({
        sort_by: 'name',
        order: 'ASC',
    });
    const [isExpanded, setIsExpanded] = useState(false);

    // Apply filters whenever they change
    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleFilterChange = (key: keyof SupplierFiltersState, value: any) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === '' ? undefined : value,
        }));
    };

    const clearFilters = () => {
        setFilters({
            sort_by: 'name',
            order: 'ASC',
        });
    };

    const hasActiveFilters =
        !!filters.search ||
        (filters.sort_by !== 'name' && filters.sort_by !== undefined) ||
        (filters.order !== 'ASC' && filters.order !== undefined);

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
                                Search Suppliers
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, email, phone..."
                                    value={filters.search || ''}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1.5 block">
                                    Sort By
                                </label>
                                <Select
                                    value={filters.sort_by || 'default'}
                                    onValueChange={(value) => handleFilterChange('sort_by', value === 'default' ? undefined : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">Name</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-1.5 block">
                                    Order
                                </label>
                                <Select
                                    value={filters.order || 'default'}
                                    onValueChange={(value) => handleFilterChange('order', value === 'default' ? undefined : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ASC">Ascending</SelectItem>
                                        <SelectItem value="DESC">Descending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
