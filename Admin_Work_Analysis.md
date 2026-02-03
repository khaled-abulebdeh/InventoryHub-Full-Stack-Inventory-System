
# Admin Side Analysis (Your Work)

This document details the functionality implemented for the **Admin** role, which serves as the central control hub for the Inventory-Hub system.

## 1. Admin Role Overview

The **Admin** is the primary operator of the system, responsible for maintaining the integrity of the supply chain and ensuring efficient order fulfillment. Your work on the Admin Side focuses on three critical pillars:

1.  **Inventory Control**: Monitoring stock levels across warehouses, adjusting discrepancies, and transferring stock to meet demand.
2.  **Procurement (Supply)**: Managing relationships with suppliers, creating purchase orders to replenish stock, and processing incoming goods receipts.
3.  **Order Fulfillment (Demand)**: Overseeing customer orders from placement to delivery, ensuring stock is allocated and deducted correctly.

---

## 2. Standard Operational Queries (Functionality)

These are the core data retrieval actions and operations the Admin performs day-to-day.

### Inventory & Products
*   **View Inventory**: Retrieve a comprehensive list of all product variants across all warehouses, showing SKU, Name, Quantity, and calculated value.
*   **Search**: Filter inventory by specific keywords (Product Name, SKU, or Brand).
*   **Filter by Location**: View stock levels for a specific Warehouse.
*   **Adjust Stock**: Manually increase or decrease the on-hand quantity of an item (e.g., for corrections after a physical count or damaged goods).
*   **Transfer Stock**: Move a specific quantity of an item from one warehouse to another.

### Procurement (Suppliers)
*   **Manage Suppliers**: View a list of all supplier partners.
*   **Link Suppliers**: Associate specific Product Variants with Suppliers, defining the **Unit Cost** and **Lead Time** for that specific relationship.
*   **Create Purchase Order**: Generate a new PO for a specific Supplier, selecting the destination Warehouse and items to order.
*   **Receive Goods**: Process a "Goods Receipt" against a PO, which automatically increments the inventory in the destination warehouse.

### Order Management
*   **Monitor Orders**: View a list of all Customer Orders with their current status (Placed, Paid, Shipped, etc.).
*   **Process Orders**: Update the status of an order (e.g., mark as "Shipped"), which triggers the automatic deduction of stock from the warehouse.
*   **Handle Returns**: Mark an order as "Returned" to trigger the automatic restoration of stock to the inventory.

---

## 3. Advanced Query Analysis

Your system implements several complex, "Advanced" queries to provide deeper intelligence and data integrity.

### A. Dynamic Inventory Valuation (The "Smart Cost" Query)
*   **Goal**: Calculate the total value of inventory even when cost data is fragmented.
*   **Logic**:
    1.  Join Inventory, Product, Variant, and Category tables.
    2.  Execute a **Subquery** to find the `Unit_Cost` from the **Preferred Supplier** (or the most expensive one if no preferred exists).
    3.  If no Supplier Cost is found, fallback to `Unit_Price` (Selling Price) to ensure the value isn't zero.
    4.  Multiply `Quantity * Derived_Cost` for total value.

### B. Stock Movement Audit Trail
*   **Goal**: Provide a full forensic history of every single unit of stock.
*   **Logic**:
    1.  Query the `StockMovement` table.
    2.  Join with `ProductVariant` and `Warehouse` for context.
    3.  Apply **Dynamic Filters**: Filter simultaneously by Date Range (e.g., "Last 7 Days"), Movement Type (e.g., "INBOUND", "ADJUSTMENT"), and Warehouse.
    4.  Sort by Date Descending to show the latest actions first.

### C. Low Stock Alerts
*   **Goal**: Identify items that need immediate replenishment.
*   **Logic**:
    1.  Compare `On_Hand_Quantity` against `Reorder_Level`.
    2.  Use `COALESCE` logic: If a Reorder Level isn't set (NULL), default to a threshold (e.g., 10 units).
    3.  Return only items where `Quantity <= Threshold`.

### D. Returned Order Stock Restoration
*   **Goal**: Accurately restore stock when a customer returns an item, even without a clear history.
*   **Logic**:
    1.  Check `StockMovement` history to see which Warehouse fulfilled the original order.
    2.  **Fallback Logic**: If no history exists (e.g., older data), query `Inventory` to find *any* warehouse that stocks this item.
    3.  Prioritize warehouses that already have stock to avoid fragmentation.
    4.  Update the inventory and log a specific `RETURN` movement type.
