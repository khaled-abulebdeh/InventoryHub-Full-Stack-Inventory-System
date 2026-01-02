import { useState } from 'react';
import { Package, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { products, productVariants } from '@/data/mockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Products() {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleProduct = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const getVariantsForProduct = (productId: string) => {
    return productVariants.filter((v) => v.productId === productId);
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="View and manage products and their variants"
      />

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Variants</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const variants = getVariantsForProduct(product.id);
              const isExpanded = expandedProducts.has(product.id);

              return (
                <>
                  <tr
                    key={product.id}
                    className="cursor-pointer"
                    onClick={() => toggleProduct(product.id)}
                  >
                    <td>
                      <button className="p-1 hover:bg-muted rounded">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{product.sku}</code>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {product.category}
                      </span>
                    </td>
                    <td>{variants.length}</td>
                    <td className="text-muted-foreground">
                      {format(product.createdAt, 'MMM d, yyyy')}
                    </td>
                  </tr>
                  {isExpanded &&
                    variants.map((variant, index) => (
                      <tr
                        key={variant.id}
                        className={cn(
                          'bg-muted/30',
                          index === variants.length - 1 && 'border-b-2 border-border'
                        )}
                      >
                        <td></td>
                        <td className="pl-16">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                            <span className="text-foreground">{variant.name}</span>
                          </div>
                        </td>
                        <td>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {variant.sku}
                          </code>
                        </td>
                        <td>
                          {Object.entries(variant.attributes).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-accent text-accent-foreground mr-1"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </td>
                        <td className="font-medium text-foreground">
                          ${variant.price.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
