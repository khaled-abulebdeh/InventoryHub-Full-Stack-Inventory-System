// API Configuration and Helper Functions

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Product Filter Types
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

// API Response Types
export interface FilteredProduct {
    Product_ID: number;
    Product_Name: string;
    Description: string;
    Visibility: 'ACTIVE' | 'INACTIVE';
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
    Description?: string;
}

export interface Category {
    Category_ID: number;
    Category_Name: string;
    Description?: string;
}

// Helper function to build query string from filters
function buildQueryString(filters: ProductFilters): string {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
        }
    });

    return params.toString();
}

// API Functions
export async function fetchFilteredProducts(filters: ProductFilters = {}): Promise<FilteredProduct[]> {
    const queryString = buildQueryString(filters);
    const url = `${API_BASE_URL}/products/filter${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    return response.json();
}

export async function fetchBrands(): Promise<Brand[]> {
    const response = await fetch(`${API_BASE_URL}/brands`);

    if (!response.ok) {
        throw new Error(`Failed to fetch brands: ${response.statusText}`);
    }

    return response.json();
}

export async function fetchCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories`);

    if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
}
