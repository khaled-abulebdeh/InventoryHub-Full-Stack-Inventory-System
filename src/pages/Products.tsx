// VERIFICATION: I AM EDITING THIS FILE
import { useState, useEffect, useCallback } from 'react';
import { Package, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductFilters } from '@/components/ProductFilters';
import {
  fetchFilteredProducts,
  fetchBrands,
  fetchCategories,
  ProductFilters as Filters,
  FilteredProduct,
  Brand,
  Category,
} from '@/lib/api';

export default function Products() {
  const [products, setProducts] = useState<FilteredProduct[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  // Fetch brands and categories on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [brandsData, categoriesData] = await Promise.all([
          fetchBrands(),
          fetchCategories(),
        ]);
        setBrands(brandsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFilteredProducts(filters);
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div>
      <PageHeader
        title="Products"
        description="View and manage products with advanced filtering"
      />

      <ProductFilters
        onFilterChange={handleFilterChange}
        brands={brands}
        categories={categories}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-card border border-border rounded-lg">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center py-12 bg-card border border-border rounded-lg">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium mb-1">Failed to load products</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your filters
                </p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price Range</th>
                  <th>Stock</th>
                  <th>Variants</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.Product_ID}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{product.Product_Name}</p>
                          {product.Description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {product.Description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {product.Brand_Name}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {product.Category_Name}
                      </span>
                    </td>
                    <td className="font-medium text-foreground">
                      {product.Min_Price === product.Max_Price ? (
                        <span>${product.Min_Price.toFixed(2)}</span>
                      ) : (
                        <span>
                          ${product.Min_Price.toFixed(2)} - ${product.Max_Price.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${product.Total_Stock > 50
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : product.Total_Stock > 20
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                      >
                        {product.Total_Stock} units
                      </span>
                    </td>
                    <td className="text-muted-foreground">{product.Variant_Count}</td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${product.Visibility === 'ACTIVE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                      >
                        {product.Visibility}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && products.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
