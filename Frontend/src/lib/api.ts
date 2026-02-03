
export interface ProductFilters {
    brand_id?: number;
    category_id?: number;
    visibility?: 'ACTIVE' | 'INACTIVE';
    min_price?: number;
    max_price?: number;
    min_stock?: number;
    max_stock?: number;
    has_discount?: boolean;
    search?: string;
    sku_search?: string;
    sort_by?: 'name' | 'price' | 'stock' | 'variant_count' | 'brand' | 'category';
    sort_order?: 'ASC' | 'DESC';
}

export interface FilteredProduct {
    Product_ID: number;
    Product_Name: string;
    Description: string;
    Visibility: string;
    Brand_Name: string;
    Brand_ID: number;
    Category_Name: string;
    Category_ID: number;
    Variant_Count: number;
    Min_Price: number;
    Max_Price: number;
    Total_Stock: number;
}

export interface Brand {
    Brand_ID: number;
    Brand_Name: string;
}

export interface Category {
    Category_ID: number;
    Category_Name: string;
}

const API_BASE_URL = 'http://127.0.0.1:5000/api';

function buildQueryString(filters: ProductFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
        }
    });
    return params.toString();
}

export async function fetchFilteredProducts(filters: ProductFilters, signal?: AbortSignal): Promise<FilteredProduct[]> {
    const queryString = buildQueryString(filters);
    const response = await fetch(`${API_BASE_URL}/products?${queryString}`, { signal });
    if (!response.ok) {
        throw new Error('Failed to fetch filtered products');
    }
    return response.json();
}

export async function fetchBrands(): Promise<Brand[]> {
    const response = await fetch(`${API_BASE_URL}/brands`);
    if (!response.ok) {
        throw new Error('Failed to fetch brands');
    }
    return response.json();
}

export async function fetchCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
        throw new Error('Failed to fetch categories');
    }
    return response.json();
}


export interface SupplierFilters {
    search?: string;
    email?: string;
    sort_by?: 'name' | 'email';
    order?: 'ASC' | 'DESC';
}

export interface Supplier {
    Supplier_ID: number;
    Supplier_Name: string;
    Email: string;
    Description: string | null;
    Phones: string[];
}

export async function fetchFilteredSuppliers(filters: SupplierFilters): Promise<Supplier[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
        }
    });

    const response = await fetch(`${API_BASE_URL}/suppliers?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
    }
    return response.json();
}
