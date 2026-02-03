import api from '@/lib/api';
import { Product, ProductVariant } from '@/types/inventory';

// Backend types (Snake Case)
interface BackendProduct {
    Product_ID: number;
    Product_Name: string;
    Description: string;
    Visibility: string;
    Brand_Name: string;
    Category_Name: string;
    Variant_Count: number;
    Variants?: BackendVariant[];
}

interface BackendVariant {
    Product_Variant_ID: number;
    SKU: string;
    Color?: string;
    Size?: string;
    Material?: string;
    Unit_Price: number;
    Discount_Percent: number;
}

// Mappers
const mapProduct = (p: BackendProduct): Product => ({
    id: String(p.Product_ID),
    name: p.Product_Name,
    sku: '', // Not in product level in new schema, but required by type? We might need to adjust type or fetch from variants.
    category: p.Category_Name,
    description: p.Description,
    createdAt: new Date(), // Date not returned by backend list endpoint?
    updatedAt: new Date(),
});

const mapVariant = (v: BackendVariant): ProductVariant => ({
    id: String(v.Product_Variant_ID),
    productId: '', // populated elsewhere
    name: v.SKU, // Variant often known by SKU
    sku: v.SKU,
    price: v.Unit_Price,
    attributes: {
        color: v.Color || '',
        size: v.Size || '',
        material: v.Material || '',
    },
});

export const productService = {
    getAll: async (): Promise<Product[]> => {
        const { data } = await api.get<BackendProduct[]>('/products');
        return data.map(mapProduct);
    },

    getById: async (id: string): Promise<Product & { variants: ProductVariant[] }> => {
        const { data } = await api.get<BackendProduct>(`/products/${id}`);
        const product = mapProduct(data);
        const variants = (data.Variants || []).map(v => ({
            ...mapVariant(v),
            productId: String(data.Product_ID),
            name: `${data.Product_Name} - ${v.SKU}`
        }));

        return { ...product, variants };
    },

    getAllVariants: async (): Promise<ProductVariant[]> => {
        const { data } = await api.get<BackendVariant[]>('/products/variants');
        return data.map(v => ({
            ...mapVariant(v),
            // Backend list_variants returns Product_ID and Product_Name
            // We need to cast or map those if present in BackendVariant interface
            productId: String((v as any).Product_ID || ''),
            name: (v as any).Product_Name ? `${(v as any).Product_Name} - ${v.SKU}` : v.SKU
        }));
    },

    create: async (product: Partial<Product>) => {
        // Implementation for create would need reverse mapping
        return api.post('/products', product);
    }
};
