// Core domain types based on the ERD

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  attributes: Record<string, string>;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  createdAt: Date;
}

export type PurchaseOrderStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  createdAt: Date;
  estimatedArrivalDate?: string;
  createdByName?: string;
  warehouseId?: number;
  warehouseName?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  leadTime?: number;
}

export interface GoodsReceipt {
  id: string;
  purchaseOrderId: string;
  warehouseId: string;
  warehouseName: string;
  receivedAt: Date;
  notes?: string;
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId: string;
  productName: string;
  variantName: string;
  quantityReceived: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface InventoryItem {
  id: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number; // Derived from StockMovement
}

export type StockMovementType = 'GOODS_RECEIPT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN';

export interface StockMovement {
  id: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  warehouseId: string;
  warehouseName: string;
  quantityChange: number; // Positive for increase, negative for decrease
  type: StockMovementType;
  referenceId?: string; // e.g., GoodsReceipt ID
  createdAt: Date;
  createdBy: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  purchaseOrderId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
}
