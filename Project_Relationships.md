
# Detailed Relationship Sets (Derived from DDL)

This document lists all relationship sets identified in the `STORE_DB` schema, derived directly from Foreign Key definitions.

1.  **Address & PostalLookup**: Each **Address** references a **Postal Code** to derive City and State.
2.  **Warehouse & Address**: Each **Warehouse** is located at a specific **Address**.
3.  **Product & Brand**: Each **Product** belongs to exactly one **Brand**.
4.  **Product & Category**: Each **Product** belongs to exactly one **Category**.
5.  **Category Hierarchy**: Each **Category** can optionally belong to a parent **Category** (Recursive).
6.  **ProductVariant & Product**: Each **Product Variant** (SKU) is a specific instance of a parent **Product**.
7.  **Inventory (M:N)**: Links **Warehouse** and **ProductVariant**, defining the quantity on hand for each variant at each location.
8.  **StockMovement**: Each movement record links a **ProductVariant** to a **Warehouse** to track inventory changes.
9.  **Cart & Customer**: Each **Cart** belongs to a registered **Customer**.
10. **CartItem**: Links a **Cart** to specific **ProductVariants** (Many-to-Many logic resolved via bridge table).
11. **Order & Customer**: Each **Order** is placed by one **Customer**.
12. **Order & Address**: Each **Order** is linked to a shipping **Address**.
13. **OrderItem**: Links an **Order** to specific **ProductVariants**, recording the price at the time of purchase.
14. **Bill & Order**: Each **Bill** is generated for exactly one **Order**.
15. **Payment & Order**: Multiple **Payments** can be made against a single **Order**.
16. **Phone_Supplier**: A **Supplier** can have multiple phone numbers (Multivalued attribute normalized).
17. **SupplierProductVariant (M:N)**: Links **Supplier** and **ProductVariant**, allowing a variant to be sourced from multiple suppliers (and vice versa).
18. **PurchaseOrder & Supplier**: Each **Purchase Order** is issued to one **Supplier**.
19. **PurchaseOrder & Admin**: Each **Purchase Order** is created by a specific **Admin**.
20. **PurchaseOrder & Warehouse**: Each **Purchase Order** is destined for a specific **Warehouse**.
21. **PurchaseOrderItem**: Links a **Purchase Order** to specific **ProductVariants**.
22. **GoodsReceipt & PurchaseOrder**: Each **Goods Receipt** corresponds to exactly one **Purchase Order** (1:1 for full receipts).
23. **GoodsReceipt & Admin**: Each **Goods Receipt** is processed/received by an **Admin**.
