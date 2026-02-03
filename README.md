# InventoryHub – Multi-Warehouse Inventory Management System

## Overview
InventoryHub is a **web-based inventory management system** designed to manage products,
suppliers, warehouses, and customer orders in a unified platform.  
It provides real-time visibility into stock levels, supports multi-warehouse operations,
and tracks inventory movement across procurement and sales workflows.

The system is built using a **modern React frontend**, a **Flask REST API backend**, and a
**relational MySQL database**.

---

## Core Capabilities
- Multi-warehouse inventory tracking
- Product and variant management (SKU-based)
- Supplier and procurement workflows
- Customer orders and fulfillment
- Stock movement auditing
- Inventory analytics and dashboards

---

## Technology Stack

### Frontend
- **React 18** (TypeScript)
- **Vite** (build tool)
- **Tailwind CSS** + **shadcn/ui**
- **React Router v6**
- **React Query (@tanstack/react-query)**
- **React Hook Form + Zod**
- **Recharts** (analytics & charts)
- **Axios**
- **Lucide React** (icons)

### Backend
- **Python Flask**
- RESTful API architecture
- MVC-style layering:
  - Controllers
  - Services
  - Repositories
- **Flask Blueprints** for modular routing
- **CORS** enabled for frontend integration

### Database
- **MySQL**
- Normalized schema (3NF)
- Trigger-based stock updates
- Bridge tables for complex relationships

---


---

## Domain Model (High Level)

### Product & Inventory
- Product
- ProductVariant (SKU-level)
- Category (hierarchical)
- Warehouse
- Inventory (variant × warehouse)
- StockMovement (audit trail)

### Procurement
- Supplier
- SupplierProductVariant
- PurchaseOrder
- GoodsReceipt

### Sales
- Customer
- Order
- Bill
- Payment

---

## Key Workflows

### Inventory Management
- Track stock per warehouse and product variant
- Automatic stock updates via receipts, transfers, and sales
- Low-stock monitoring using reorder levels

### Procurement
- Create purchase orders for suppliers
- Receive goods via goods receipts
- Inventory automatically increases on receipt

### Sales & Fulfillment
- Customer order placement
- Stock deduction on shipment
- Supports COD lifecycle (Delivered, Returned, Restocked)

### Supplier Management
- Multiple suppliers per product
- Cost comparison
- Preferred supplier selection

---

## Analytics Dashboard
- Inventory value overview
- Stock distribution across warehouses
- Recent stock movements
- Operational insights via interactive charts

---


---

## Key Concepts Demonstrated
- Full-stack system design
- REST API development
- Relational database modeling
- Inventory consistency & auditability
- Separation of concerns (MVC)
- Scalable frontend architecture

---

## Future Enhancements
- Role-based access control
- Demand forecasting
- Supplier performance analytics
- Barcode / QR integration
- Deployment with Docker

---

