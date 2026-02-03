import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,          //  ADD
  Truck,
  ClipboardList,
  PackageCheck,
  Warehouse,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Tag,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Products', href: '/app/products', icon: Package },
  { name: 'Categories', href: '/app/categories', icon: FolderTree },
  { name: 'Brands', href: '/app/brands', icon: Tag },
  { name: 'Suppliers', href: '/app/suppliers', icon: Truck },
  { name: 'Purchase Orders', href: '/app/purchase-orders', icon: ClipboardList },
  { name: 'Customer Orders', href: '/app/orders', icon: PackageCheck }, // Reusing PackageCheck or similar
  { name: 'Goods Receipts', href: '/app/goods-receipts', icon: PackageCheck },
  { name: 'Inventory', href: '/app/inventory', icon: Warehouse },
  { name: 'Stock Movements', href: '/app/stock-movements', icon: ArrowLeftRight },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">InventoryPro</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-md hover:bg-sidebar-accent transition-colors',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + '/');

            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          }}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        {!collapsed && (
          <div className="text-[10px] text-sidebar-muted mt-4 uppercase tracking-wider font-bold opacity-50">
            System v1.0.0
          </div>
        )}
      </div>
    </aside>
  );
}
