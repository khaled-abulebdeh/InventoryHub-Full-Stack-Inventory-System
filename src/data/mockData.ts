import {
  Product,
  ProductVariant,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  Warehouse,
  InventoryItem,
  StockMovement,
} from '@/types/inventory';

// Products
export const products: Product[] = [
  { id: 'P001', name: 'Wireless Mouse', sku: 'WM-001', category: 'Electronics', description: 'Ergonomic wireless mouse with 2.4GHz connectivity', createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-01-15') },
  { id: 'P002', name: 'Mechanical Keyboard', sku: 'MK-001', category: 'Electronics', description: 'RGB mechanical keyboard with Cherry MX switches', createdAt: new Date('2024-01-16'), updatedAt: new Date('2024-01-16') },
  { id: 'P003', name: 'USB-C Hub', sku: 'UH-001', category: 'Accessories', description: '7-in-1 USB-C hub with HDMI and card reader', createdAt: new Date('2024-02-01'), updatedAt: new Date('2024-02-01') },
  { id: 'P004', name: 'Monitor Stand', sku: 'MS-001', category: 'Furniture', description: 'Adjustable aluminum monitor stand', createdAt: new Date('2024-02-10'), updatedAt: new Date('2024-02-10') },
  { id: 'P005', name: 'Webcam HD', sku: 'WC-001', category: 'Electronics', description: '1080p HD webcam with built-in microphone', createdAt: new Date('2024-02-15'), updatedAt: new Date('2024-02-15') },
];

// Product Variants
export const productVariants: ProductVariant[] = [
  { id: 'V001', productId: 'P001', name: 'Black', sku: 'WM-001-BLK', price: 29.99, attributes: { color: 'Black' } },
  { id: 'V002', productId: 'P001', name: 'White', sku: 'WM-001-WHT', price: 29.99, attributes: { color: 'White' } },
  { id: 'V003', productId: 'P002', name: 'Blue Switch', sku: 'MK-001-BLU', price: 149.99, attributes: { switch: 'Blue' } },
  { id: 'V004', productId: 'P002', name: 'Red Switch', sku: 'MK-001-RED', price: 149.99, attributes: { switch: 'Red' } },
  { id: 'V005', productId: 'P003', name: 'Space Gray', sku: 'UH-001-GRY', price: 59.99, attributes: { color: 'Space Gray' } },
  { id: 'V006', productId: 'P004', name: 'Silver', sku: 'MS-001-SLV', price: 79.99, attributes: { color: 'Silver' } },
  { id: 'V007', productId: 'P005', name: 'Standard', sku: 'WC-001-STD', price: 89.99, attributes: {} },
];

// Suppliers
export const suppliers: Supplier[] = [
  { id: 'S001', name: 'TechParts Co.', email: 'orders@techparts.com', phone: '+1 555-0101', address: '123 Industrial Ave, Tech City, TC 12345', contactPerson: 'John Smith', createdAt: new Date('2024-01-01') },
  { id: 'S002', name: 'Global Electronics Ltd.', email: 'supply@globalelec.com', phone: '+1 555-0102', address: '456 Commerce Blvd, Electronics Park, EP 67890', contactPerson: 'Sarah Johnson', createdAt: new Date('2024-01-05') },
  { id: 'S003', name: 'Premium Peripherals Inc.', email: 'b2b@premiumperiph.com', phone: '+1 555-0103', address: '789 Tech Lane, Gadget Town, GT 11223', contactPerson: 'Mike Chen', createdAt: new Date('2024-01-10') },
];

// Warehouses
export const warehouses: Warehouse[] = [
  { id: 'W001', name: 'Main Warehouse', location: 'Building A, Industrial Zone' },
  { id: 'W002', name: 'Secondary Storage', location: 'Building B, Industrial Zone' },
  { id: 'W003', name: 'Returns Center', location: 'Building C, Industrial Zone' },
];

// Purchase Orders
export const purchaseOrders: PurchaseOrder[] = [
  { id: 'PO-001', supplierId: 'S001', supplierName: 'TechParts Co.', status: 'COMPLETED', totalAmount: 1499.90, createdAt: new Date('2024-11-01'), expectedDelivery: new Date('2024-11-10') },
  { id: 'PO-002', supplierId: 'S002', supplierName: 'Global Electronics Ltd.', status: 'PARTIALLY_RECEIVED', totalAmount: 2999.80, createdAt: new Date('2024-11-15'), expectedDelivery: new Date('2024-11-25') },
  { id: 'PO-003', supplierId: 'S003', supplierName: 'Premium Peripherals Inc.', status: 'SENT', totalAmount: 899.85, createdAt: new Date('2024-12-01'), expectedDelivery: new Date('2024-12-15') },
  { id: 'PO-004', supplierId: 'S001', supplierName: 'TechParts Co.', status: 'CREATED', totalAmount: 599.94, createdAt: new Date('2024-12-20') },
  { id: 'PO-005', supplierId: 'S002', supplierName: 'Global Electronics Ltd.', status: 'CANCELLED', totalAmount: 449.97, createdAt: new Date('2024-12-10') },
];

// Purchase Order Items
export const purchaseOrderItems: PurchaseOrderItem[] = [
  { id: 'POI-001', purchaseOrderId: 'PO-001', productVariantId: 'V001', productName: 'Wireless Mouse', variantName: 'Black', quantity: 50, unitPrice: 29.99, receivedQuantity: 50 },
  { id: 'POI-002', purchaseOrderId: 'PO-002', productVariantId: 'V003', productName: 'Mechanical Keyboard', variantName: 'Blue Switch', quantity: 20, unitPrice: 149.99, receivedQuantity: 10 },
  { id: 'POI-003', purchaseOrderId: 'PO-003', productVariantId: 'V005', productName: 'USB-C Hub', variantName: 'Space Gray', quantity: 15, unitPrice: 59.99, receivedQuantity: 0 },
  { id: 'POI-004', purchaseOrderId: 'PO-004', productVariantId: 'V002', productName: 'Wireless Mouse', variantName: 'White', quantity: 20, unitPrice: 29.99, receivedQuantity: 0 },
  { id: 'POI-005', purchaseOrderId: 'PO-002', productVariantId: 'V007', productName: 'Webcam HD', variantName: 'Standard', quantity: 10, unitPrice: 89.99, receivedQuantity: 10 },
];

// Goods Receipts
export const goodsReceipts: GoodsReceipt[] = [
  { id: 'GR-001', purchaseOrderId: 'PO-001', warehouseId: 'W001', warehouseName: 'Main Warehouse', receivedAt: new Date('2024-11-08'), notes: 'All items in good condition' },
  { id: 'GR-002', purchaseOrderId: 'PO-002', warehouseId: 'W001', warehouseName: 'Main Warehouse', receivedAt: new Date('2024-11-22'), notes: 'Partial delivery - keyboards pending' },
  { id: 'GR-003', purchaseOrderId: 'PO-002', warehouseId: 'W002', warehouseName: 'Secondary Storage', receivedAt: new Date('2024-11-24'), notes: 'Webcams received' },
];

// Goods Receipt Items
export const goodsReceiptItems: GoodsReceiptItem[] = [
  { id: 'GRI-001', goodsReceiptId: 'GR-001', purchaseOrderItemId: 'POI-001', productName: 'Wireless Mouse', variantName: 'Black', quantityReceived: 50 },
  { id: 'GRI-002', goodsReceiptId: 'GR-002', purchaseOrderItemId: 'POI-002', productName: 'Mechanical Keyboard', variantName: 'Blue Switch', quantityReceived: 10 },
  { id: 'GRI-003', goodsReceiptId: 'GR-003', purchaseOrderItemId: 'POI-005', productName: 'Webcam HD', variantName: 'Standard', quantityReceived: 10 },
];

// Inventory (derived from stock movements)
export const inventoryItems: InventoryItem[] = [
  { id: 'INV-001', productVariantId: 'V001', productName: 'Wireless Mouse', variantName: 'Black', sku: 'WM-001-BLK', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantity: 48 },
  { id: 'INV-002', productVariantId: 'V002', productName: 'Wireless Mouse', variantName: 'White', sku: 'WM-001-WHT', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantity: 25 },
  { id: 'INV-003', productVariantId: 'V003', productName: 'Mechanical Keyboard', variantName: 'Blue Switch', sku: 'MK-001-BLU', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantity: 8 },
  { id: 'INV-004', productVariantId: 'V004', productName: 'Mechanical Keyboard', variantName: 'Red Switch', sku: 'MK-001-RED', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantity: 15 },
  { id: 'INV-005', productVariantId: 'V005', productName: 'USB-C Hub', variantName: 'Space Gray', sku: 'UH-001-GRY', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantity: 3 },
  { id: 'INV-006', productVariantId: 'V006', productName: 'Monitor Stand', variantName: 'Silver', sku: 'MS-001-SLV', warehouseId: 'W002', warehouseName: 'Secondary Storage', quantity: 12 },
  { id: 'INV-007', productVariantId: 'V007', productName: 'Webcam HD', variantName: 'Standard', sku: 'WC-001-STD', warehouseId: 'W002', warehouseName: 'Secondary Storage', quantity: 10 },
];

// Stock Movements (audit trail)
export const stockMovements: StockMovement[] = [
  { id: 'SM-001', productVariantId: 'V001', productName: 'Wireless Mouse', variantName: 'Black', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantityChange: 50, type: 'GOODS_RECEIPT', referenceId: 'GR-001', createdAt: new Date('2024-11-08 10:30:00'), createdBy: 'Admin' },
  { id: 'SM-002', productVariantId: 'V001', productName: 'Wireless Mouse', variantName: 'Black', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantityChange: -2, type: 'ADJUSTMENT', createdAt: new Date('2024-11-10 14:15:00'), createdBy: 'Admin' },
  { id: 'SM-003', productVariantId: 'V003', productName: 'Mechanical Keyboard', variantName: 'Blue Switch', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantityChange: 10, type: 'GOODS_RECEIPT', referenceId: 'GR-002', createdAt: new Date('2024-11-22 09:45:00'), createdBy: 'Admin' },
  { id: 'SM-004', productVariantId: 'V003', productName: 'Mechanical Keyboard', variantName: 'Blue Switch', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantityChange: -2, type: 'TRANSFER_OUT', createdAt: new Date('2024-11-25 11:20:00'), createdBy: 'Admin' },
  { id: 'SM-005', productVariantId: 'V007', productName: 'Webcam HD', variantName: 'Standard', warehouseId: 'W002', warehouseName: 'Secondary Storage', quantityChange: 10, type: 'GOODS_RECEIPT', referenceId: 'GR-003', createdAt: new Date('2024-11-24 16:00:00'), createdBy: 'Admin' },
  { id: 'SM-006', productVariantId: 'V002', productName: 'Wireless Mouse', variantName: 'White', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantityChange: 25, type: 'GOODS_RECEIPT', createdAt: new Date('2024-12-01 08:30:00'), createdBy: 'Admin' },
  { id: 'SM-007', productVariantId: 'V005', productName: 'USB-C Hub', variantName: 'Space Gray', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantityChange: 5, type: 'GOODS_RECEIPT', createdAt: new Date('2024-12-05 13:45:00'), createdBy: 'Admin' },
  { id: 'SM-008', productVariantId: 'V005', productName: 'USB-C Hub', variantName: 'Space Gray', warehouseId: 'W001', warehouseName: 'Main Warehouse', quantityChange: -2, type: 'ADJUSTMENT', createdAt: new Date('2024-12-08 10:00:00'), createdBy: 'Admin' },
];

// Helper functions
export const getLowStockItems = (threshold: number = 10): InventoryItem[] => {
  return inventoryItems.filter(item => item.quantity <= threshold);
};

export const getPendingPurchaseOrders = (): PurchaseOrder[] => {
  return purchaseOrders.filter(po => po.status === 'CREATED' || po.status === 'SENT');
};

export const getProductWithVariants = (productId: string) => {
  const product = products.find(p => p.id === productId);
  const variants = productVariants.filter(v => v.productId === productId);
  return { product, variants };
};
