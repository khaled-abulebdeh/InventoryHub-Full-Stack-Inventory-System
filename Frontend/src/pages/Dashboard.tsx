import { useState, useEffect, useCallback } from 'react';
import { Package, Truck, AlertTriangle, ClipboardList, TrendingUp, ArrowUpRight, ArrowDownRight, ShoppingCart, DollarSign, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { format } from 'date-fns';

const API_BASE = 'http://127.0.0.1:5000/api';

interface DashboardStats {
  totalProducts: number;
  totalVariants: number;
  totalSuppliers: number;
  lowStockCount: number;
  pendingPOs: number;
  totalOrders: number;
  totalInventoryValue: number;
}

interface Movement {
  id: string;
  productName: string;
  variantName: string;
  warehouseName: string;
  quantityChange: number;
  type: string;
  date: string;
}

interface MovementSummary {
  inboundTotal: number;
  outboundTotal: number;
  totalMovements: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalVariants: 0,
    totalSuppliers: 0,
    lowStockCount: 0,
    pendingPOs: 0,
    totalOrders: 0,
    totalInventoryValue: 0,
  });
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [movementSummary, setMovementSummary] = useState<MovementSummary>({ inboundTotal: 0, outboundTotal: 0, totalMovements: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<{ name: string, value: number }[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch multiple endpoints in parallel
      const [productsRes, suppliersRes, inventoryRes, movementsRes, movementSummaryRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/suppliers`),
        fetch(`${API_BASE}/inventory`),
        fetch(`${API_BASE}/stock-movements?sort_by=date&sort_order=desc`),
        fetch(`${API_BASE}/stock-movements/summary`),
      ]);

      // Parse products
      if (productsRes.ok) {
        const products = await productsRes.json();
        // Check for Variant_Count (API) or variants array
        const variantCount = products.reduce((sum: number, p: any) => sum + (p.Variant_Count || p.variants?.length || 0), 0);
        setStats(prev => ({ ...prev, totalProducts: products.length, totalVariants: variantCount }));
      }

      // Parse suppliers
      if (suppliersRes.ok) {
        const suppliers = await suppliersRes.json();
        setStats(prev => ({ ...prev, totalSuppliers: suppliers.length }));
      }

      // Parse inventory for low stock, total value, and category distribution
      let categoryStats: Record<string, number> = {};
      if (inventoryRes.ok) {
        const inventory = await inventoryRes.json();
        // Use <= to match Inventory page logic
        const lowStock = inventory.filter((item: any) => item.quantity <= (item.reorderLevel || 10));

        const totalValue = inventory.reduce((sum: number, item: any) => {
          const qty = Number(item.quantity) || 0;
          // Use Cost if available (and > 0), otherwise fallback to Selling Price (Unit_Price)
          // to avoid showing near-zero value for items without supplier cost data.
          let valPerUnit = Number(item.unitCost) || 0;
          if (valPerUnit === 0) {
            valPerUnit = Number(item.unitPrice) || 0;
          }

          const itemValue = qty * valPerUnit;

          // Aggregate by category
          const cat = item.category || 'Uncategorized';
          categoryStats[cat] = (categoryStats[cat] || 0) + itemValue;

          return sum + itemValue;
        }, 0);

        setStats(prev => ({
          ...prev,
          lowStockCount: lowStock.length,
          totalInventoryValue: totalValue
        }));
      }

      // Parse recent movements
      if (movementsRes.ok) {
        const movements = await movementsRes.json();
        setRecentMovements(movements.slice(0, 5));
      }

      // Parse movement summary
      if (movementSummaryRes.ok) {
        const summary = await movementSummaryRes.json();
        setMovementSummary(summary);
      }

      // Set category data for chart
      // (This would be in state if we needed it elsewhere, but we can compute derived state if we put inventory in state)
      // For now, let's just store top 5 categories in a new state or just re-calculate in render?
      // Better to add to state. Let's add TopCategories to stats or new state.
      // Modifying fetch to set a simple state for categories.
      const topCategories = Object.entries(categoryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

      setCategoryData(topCategories);

    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate inbound/outbound percentages for visualization
  const totalFlow = movementSummary.inboundTotal + movementSummary.outboundTotal;
  const inboundPercent = totalFlow > 0 ? (movementSummary.inboundTotal / totalFlow) * 100 : 50;
  const outboundPercent = totalFlow > 0 ? (movementSummary.outboundTotal / totalFlow) * 100 : 50;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your inventory and purchasing operations"
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              title="Total Products"
              value={stats.totalProducts}
              subtitle={`${stats.totalVariants} variants`}
              icon={<Package className="w-6 h-6" />}
              iconColor="primary"
            />
            <SummaryCard
              title="Suppliers"
              value={stats.totalSuppliers}
              subtitle="Active partners"
              icon={<Truck className="w-6 h-6" />}
              iconColor="success"
            />
            <SummaryCard
              title="Low Stock Items"
              value={stats.lowStockCount}
              subtitle="Below reorder level"
              icon={<AlertTriangle className="w-6 h-6" />}
              iconColor="warning"
            />
            <SummaryCard
              title="Inventory Value"
              value={`$${stats.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Total stock value"
              icon={<DollarSign className="w-6 h-6" />}
              iconColor="primary"
            />
          </div>

          {/* Charts & Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Inventory Distribution Chart (Replaces Stock Flow) */}
            <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Inventory Value by Category
              </h2>
              <div className="space-y-4">
                {categoryData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No inventory data available</p>
                ) : (
                  categoryData.map((cat, index) => {
                    const maxVal = Math.max(...categoryData.map(c => c.value));
                    const percent = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-foreground">{cat.name}</span>
                          <span className="text-muted-foreground">${cat.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${percent}%`, opacity: 1 - (index * 0.15) }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Movement Stats */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Movement Stats
              </h2>
              <div className="space-y-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <span className="text-4xl font-bold text-primary">{movementSummary.totalMovements}</span>
                  <p className="text-sm text-muted-foreground mt-1">Total Movements</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-status-success/10 rounded-lg">
                    <ArrowUpRight className="w-5 h-5 text-status-success mx-auto mb-1" />
                    <span className="text-lg font-semibold text-status-success">{movementSummary.inboundTotal}</span>
                    <p className="text-xs text-muted-foreground">Inbound</p>
                  </div>
                  <div className="text-center p-3 bg-status-error/10 rounded-lg">
                    <ArrowDownRight className="w-5 h-5 text-status-error mx-auto mb-1" />
                    <span className="text-lg font-semibold text-status-error">{movementSummary.outboundTotal}</span>
                    <p className="text-xs text-muted-foreground">Outbound</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Recent Stock Movements
              </h2>
            </div>
            <div className="p-4">
              {recentMovements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent movements</p>
              ) : (
                <div className="space-y-3">
                  {recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {movement.quantityChange > 0 ? (
                          <div className="w-8 h-8 rounded-full bg-status-success/10 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-status-success" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-status-error/10 flex items-center justify-center">
                            <ArrowDownRight className="w-4 h-4 text-status-error" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{movement.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {movement.date ? format(new Date(movement.date), 'MMM d, yyyy') : 'N/A'} • {movement.warehouseName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-semibold ${movement.quantityChange > 0 ? 'text-status-success' : 'text-status-error'
                            }`}
                        >
                          {movement.quantityChange > 0 ? '+' : ''}
                          {movement.quantityChange}
                        </p>
                        <span className="text-xs text-muted-foreground uppercase">{movement.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
