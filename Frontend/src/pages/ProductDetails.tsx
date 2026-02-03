import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const API_PRODUCTS = 'http://127.0.0.1:5000/api/products';

type Variant = {
  id: number;
  sku: string;
  color: string;
  size: string;
  material: string;
  price: number;
  discount: number;
};

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_PRODUCTS}/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct({
          name: data.Product_Name,
          brand: data.Brand_Name,
          category: data.Category_Name,
          visibility: data.Visibility,
        });

        setVariants(
          data.Variants.map((v: any) => ({
            id: v.Product_Variant_ID,
            sku: v.SKU,
            color: v.Color,
            size: v.Size,
            material: v.Material,
            price: v.Unit_Price,
            discount: v.Discount_Percent,
          }))
        );

        setLoading(false);
      });
  }, [id]);

  if (loading) return <p>Loading product...</p>;

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`${product.brand} • ${product.category}`}
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Variant
          </Button>
        }
      />

      <div className="bg-card border rounded-lg overflow-hidden mt-6">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">SKU</th>
              <th>Color</th>
              <th>Size</th>
              <th>Material</th>
              <th>Selling Price</th>
              <th>Cust. Discount</th>
            </tr>
          </thead>
          <tbody>
            {variants.map(v => (
              <tr key={v.id} className="border-t">
                <td className="p-3 font-mono">{v.sku}</td>
                <td>{v.color}</td>
                <td>{v.size}</td>
                <td>{v.material}</td>
                <td>${v.price}</td>
                <td>{v.discount}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
