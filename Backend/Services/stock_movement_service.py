from db import get_connection

def list_stock_movements(filters=None):
    """
    List stock movements with SQL-based filtering.
    
    Filters:
        - warehouse_id: Filter by warehouse
        - movement_type: Filter by type (GOODS_RECEIPT, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, RETURN, SALE)
        - date_from: Start date for date range
        - date_to: End date for date range
        - search: Search product name, SKU, or movement ID
        - sort_by: Sort column (date, product, quantity)
        - sort_order: Sort direction (asc, desc)
    """
    if filters is None:
        filters = {}
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                sm.Movement_ID,
                sm.Warehouse_ID,
                sm.Product_Variant_ID,
                sm.Movement_Type,
                sm.Quantity_Change,
                sm.Movement_Date,
                sm.Reference_Type,
                sm.Reference_ID,
                p.Product_Name,
                pv.SKU,
                pv.Color,
                pv.Size,
                pv.Material,
                pv.Unit_Price,
                w.Name as Warehouse_Name
            FROM StockMovement sm
            JOIN ProductVariant pv ON sm.Product_Variant_ID = pv.Product_Variant_ID
            JOIN Product p ON pv.Product_ID = p.Product_ID
            JOIN Warehouse w ON sm.Warehouse_ID = w.Warehouse_ID
            WHERE 1=1
        """
        params = []
        
        # Warehouse Filter
        if filters.get("warehouse_id"):
            query += " AND sm.Warehouse_ID = %s"
            params.append(filters["warehouse_id"])
        
        # Movement Type Filter
        if filters.get("movement_type"):
            query += " AND sm.Movement_Type = %s"
            params.append(filters["movement_type"])
        
        # Date Range Filter
        if filters.get("date_from"):
            query += " AND sm.Movement_Date >= %s"
            params.append(filters["date_from"])
        
        if filters.get("date_to"):
            query += " AND sm.Movement_Date <= %s"
            # Append end of day time if only date is provided
            val = filters["date_to"]
            if len(val) == 10: 
                val += " 23:59:59"
            params.append(val)
        
        # Search Filter (Product Name, SKU, Movement ID)
        if filters.get("search"):
            search_term = f"%{filters['search']}%"
            query += """ AND (
                p.Product_Name LIKE %s OR 
                pv.SKU LIKE %s OR
                pv.Color LIKE %s OR
                pv.Size LIKE %s OR
                pv.Material LIKE %s OR
                CAST(sm.Movement_ID AS CHAR) LIKE %s
            )"""
            params.extend([search_term] * 6)
        
        # Sorting
        sort_by = filters.get("sort_by") or "date"
        sort_order = (filters.get("sort_order") or "desc").upper()
        if sort_order not in ["ASC", "DESC"]:
            sort_order = "DESC"
        
        if sort_by == "product":
            query += f" ORDER BY p.Product_Name {sort_order}"
        elif sort_by == "quantity":
            query += f" ORDER BY ABS(sm.Quantity_Change) {sort_order}"
        else:  # default to date
            query += f" ORDER BY sm.Movement_Date {sort_order}"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            # Build variant name from attributes
            attrs = [row[k] for k in ["Color", "Size", "Material"] if row.get(k)]
            variant_name = " / ".join(attrs) if attrs else "Standard"
            
            results.append({
                "id": str(row["Movement_ID"]),
                "warehouseId": row["Warehouse_ID"],
                "productVariantId": row["Product_Variant_ID"],
                "type": row["Movement_Type"],
                "quantityChange": row["Quantity_Change"],
                "date": row["Movement_Date"].isoformat() if row["Movement_Date"] else None,
                "productName": row["Product_Name"],
                "variantName": variant_name,
                "sku": row["SKU"],
                "warehouseName": row["Warehouse_Name"],
                "unitPrice": float(row["Unit_Price"] or 0),
                "totalValue": float(abs(row["Quantity_Change"] or 0) * (row["Unit_Price"] or 0)),
                "referenceType": row["Reference_Type"],
                "referenceId": row["Reference_ID"],
                "createdBy": "Admin"
            })
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


def get_movement_by_id(movement_id):
    """Get a single stock movement by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                sm.Movement_ID,
                sm.Warehouse_ID,
                sm.Product_Variant_ID,
                sm.Movement_Type,
                sm.Quantity_Change,
                sm.Movement_Date,
                sm.Reference_Type,
                sm.Reference_ID,
                p.Product_Name,
                pv.SKU,
                pv.Color,
                pv.Size,
                pv.Material,
                pv.Unit_Price,
                w.Name as Warehouse_Name
            FROM StockMovement sm
            JOIN ProductVariant pv ON sm.Product_Variant_ID = pv.Product_Variant_ID
            JOIN Product p ON pv.Product_ID = p.Product_ID
            JOIN Warehouse w ON sm.Warehouse_ID = w.Warehouse_ID
            WHERE sm.Movement_ID = %s
        """, (movement_id,))
        
        row = cursor.fetchone()
        if not row:
            return {"error": "Movement not found"}, 404
        
        attrs = [row[k] for k in ["Color", "Size", "Material"] if row.get(k)]
        variant_name = " / ".join(attrs) if attrs else "Standard"
        
        return {
            "id": str(row["Movement_ID"]),
            "warehouseId": row["Warehouse_ID"],
            "productVariantId": row["Product_Variant_ID"],
            "type": row["Movement_Type"],
            "quantityChange": row["Quantity_Change"],
            "date": row["Movement_Date"].isoformat() if row["Movement_Date"] else None,
            "productName": row["Product_Name"],
            "variantName": variant_name,
            "sku": row["SKU"],
            "warehouseName": row["Warehouse_Name"],
            "unitPrice": float(row["Unit_Price"] or 0),
            "totalValue": float(abs(row["Quantity_Change"] or 0) * (row["Unit_Price"] or 0)),
            "referenceType": row["Reference_Type"],
            "referenceId": row["Reference_ID"]
        }, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


def get_movements_by_variant(product_variant_id, warehouse_id=None):
    """Get stock movement history for a specific product variant."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                sm.Movement_ID,
                sm.Warehouse_ID,
                sm.Movement_Type,
                sm.Quantity_Change,
                sm.Movement_Date,
                sm.Reference_Type,
                sm.Reference_ID,
                w.Name as Warehouse_Name
            FROM StockMovement sm
            JOIN Warehouse w ON sm.Warehouse_ID = w.Warehouse_ID
            WHERE sm.Product_Variant_ID = %s
        """
        params = [product_variant_id]
        
        if warehouse_id:
            query += " AND sm.Warehouse_ID = %s"
            params.append(warehouse_id)
        
        query += " ORDER BY sm.Movement_Date DESC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "id": str(row["Movement_ID"]),
                "warehouseId": row["Warehouse_ID"],
                "warehouseName": row["Warehouse_Name"],
                "type": row["Movement_Type"],
                "quantityChange": row["Quantity_Change"],
                "date": row["Movement_Date"].isoformat() if row["Movement_Date"] else None,
                "referenceType": row["Reference_Type"],
                "referenceId": row["Reference_ID"]
            })
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


def get_movement_summary(filters=None):
    """Get summary statistics for stock movements (inbound/outbound totals)."""
    if filters is None:
        filters = {}
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                SUM(CASE WHEN sm.Quantity_Change > 0 THEN sm.Quantity_Change ELSE 0 END) as inbound_total,
                SUM(CASE WHEN sm.Quantity_Change < 0 THEN ABS(sm.Quantity_Change) ELSE 0 END) as outbound_total,
                COUNT(*) as total_movements
            FROM StockMovement sm
            JOIN ProductVariant pv ON sm.Product_Variant_ID = pv.Product_Variant_ID
            JOIN Product p ON pv.Product_ID = p.Product_ID
            WHERE 1=1
        """
        params = []
        
        if filters.get("warehouse_id"):
            query += " AND sm.Warehouse_ID = %s"
            params.append(filters["warehouse_id"])
        
        if filters.get("movement_type"):
            query += " AND sm.Movement_Type = %s"
            params.append(filters["movement_type"])
        
        if filters.get("date_from"):
            query += " AND sm.Movement_Date >= %s"
            params.append(filters["date_from"])
        
        if filters.get("date_to"):
            query += " AND sm.Movement_Date <= %s"
            params.append(filters["date_to"])
        
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        
        return {
            "inboundTotal": int(row["inbound_total"] or 0),
            "outboundTotal": int(row["outbound_total"] or 0),
            "totalMovements": int(row["total_movements"] or 0)
        }, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()
