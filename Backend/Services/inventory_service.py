from db import get_connection

def list_inventory(filters=None):
    if filters is None:
        filters = {}

    conn = get_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                i.Warehouse_ID,
                w.Name as Warehouse_Name,
                i.Product_Variant_ID,
                p.Product_Name,
                pv.SKU,
                pv.Color,
                pv.Size,
                pv.Material,
                pv.Unit_Price,
                (
                    SELECT spv.Unit_Cost 
                    FROM SupplierProductVariant spv 
                    WHERE spv.Product_Variant_ID = i.Product_Variant_ID 
                    ORDER BY spv.Preferred_Flag DESC, spv.Unit_Cost DESC 
                    LIMIT 1
                ) as Unit_Cost,
                c.Category_Name as Category,
                b.Brand_Name as Brand,
                i.On_Hand_Quantity,
                i.Reorder_Level
            FROM Inventory i
            JOIN Warehouse w ON i.Warehouse_ID = w.Warehouse_ID
            JOIN ProductVariant pv ON i.Product_Variant_ID = pv.Product_Variant_ID
            JOIN Product p ON pv.Product_ID = p.Product_ID
            JOIN Category c ON p.Category_ID = c.Category_ID
            JOIN Brand b ON p.Brand_ID = b.Brand_ID
            WHERE 1=1
        """
        params = []

        # Warehouse Filter
        if filters.get("warehouse_id"):
            query += " AND i.Warehouse_ID = %s"
            params.append(filters["warehouse_id"])

        # Search (Product Name, SKU, Brand)
        if filters.get("search"):
            search_term = f"%{filters['search']}%"
            query += """ AND (
                p.Product_Name LIKE %s OR 
                pv.SKU LIKE %s OR 
                b.Brand_Name LIKE %s
            )"""
            params.extend([search_term, search_term, search_term])

        # Brand Filter
        if filters.get("brand_id"):
            query += " AND p.Brand_ID = %s"
            params.append(filters["brand_id"])

        # Category Filter
        if filters.get("category_id"):
            query += " AND p.Category_ID = %s"
            params.append(filters["category_id"])

        # Stock Status Filter
        if filters.get("stock_status"):
            status = filters["stock_status"].upper()
            if status == "LOW":
                # Match frontend logic: If Reorder_Level is 0/NULL, use default 10
                query += " AND i.On_Hand_Quantity <= COALESCE(NULLIF(i.Reorder_Level, 0), 10)"
            elif status == "NORMAL":
                query += " AND i.On_Hand_Quantity > COALESCE(NULLIF(i.Reorder_Level, 0), 10)"

        # Sorting
        sort_by = filters.get("sort_by") or "name"
        sort_order = (filters.get("sort_order") or "asc").upper()
        if sort_order not in ["ASC", "DESC"]:
            sort_order = "ASC"

        if sort_by == "quantity":
            query += f" ORDER BY i.On_Hand_Quantity {sort_order}"
        elif sort_by == "value":
            query += f" ORDER BY (i.On_Hand_Quantity * pv.Unit_Price) {sort_order}"
        elif sort_by == "sku":
            query += f" ORDER BY pv.SKU {sort_order}"
        else:  # default to name
            query += f" ORDER BY p.Product_Name {sort_order}, pv.SKU {sort_order}"


        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            # Construct a variant name from attributes
            attrs = [row[k] for k in ["Color", "Size", "Material"] if row[k]]
            variant_name = " / ".join(attrs) if attrs else "Standard"
            
            # Use composite key as the ID for the frontend
            item_id = f"{row['Warehouse_ID']}-{row['Product_Variant_ID']}"
            
            results.append({
                "id": item_id,
                "warehouseId": row["Warehouse_ID"],
                "warehouseName": row["Warehouse_Name"],
                "productVariantId": row["Product_Variant_ID"],
                "productName": row["Product_Name"],
                "variantName": variant_name,
                "sku": row["SKU"],
                "category": row["Category"],
                "brand": row["Brand"],
                "quantity": row["On_Hand_Quantity"],
                "reorderLevel": row["Reorder_Level"],
                "unitPrice": float(row["Unit_Price"] or 0),
                "unitCost": float(row["Unit_Cost"] or 0),
                "totalValue": float((row["On_Hand_Quantity"] or 0) * (float(row["Unit_Cost"] or 0) if float(row["Unit_Cost"] or 0) > 0 else float(row["Unit_Price"] or 0)))
            })
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # 1. Core Summary
        cursor.execute("SELECT SUM(On_Hand_Quantity) as total_units FROM Inventory")
        row_units = cursor.fetchone()
        total_units = row_units["total_units"] if row_units and row_units["total_units"] else 0
        
        cursor.execute("SELECT COUNT(*) as low_stock FROM Inventory WHERE On_Hand_Quantity <= Reorder_Level")
        row_low = cursor.fetchone()
        low_stock = row_low["low_stock"] if row_low else 0
        
        cursor.execute("SELECT COUNT(*) as total_skus FROM ProductVariant")
        row_skus = cursor.fetchone()
        total_skus = row_skus["total_skus"] if row_skus else 0
        
        cursor.execute("""
            SELECT SUM(i.On_Hand_Quantity * pv.Unit_Price) as total_value
            FROM Inventory i
            JOIN ProductVariant pv ON i.Product_Variant_ID = pv.Product_Variant_ID
        """)
        row_val = cursor.fetchone()
        total_value = row_val["total_value"] if row_val and row_val["total_value"] else 0

        # 2. Warehouse Distribution
        cursor.execute("""
            SELECT w.Name, SUM(i.On_Hand_Quantity) as Units
            FROM Inventory i
            JOIN Warehouse w ON i.Warehouse_ID = w.Warehouse_ID
            GROUP BY w.Warehouse_ID
        """)
        distribution = cursor.fetchall()

        return {
            "summary": {
                "totalUnits": int(total_units),
                "lowStockCount": int(low_stock),
                "totalSKUs": int(total_skus),
                "totalValue": float(total_value)
            },
            "distribution": [{"name": d["Name"], "value": int(d["Units"])} for d in distribution]
        }, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def get_recent_movements(filters=None):
    if filters is None:
        filters = {}
    
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
            params.append(filters["date_to"])
        
        # Search Filter (Product Name, Variant attributes, Movement ID)
        if filters.get("search"):
            search_term = f"%{filters['search']}%"
            query += """ AND (
                p.Product_Name LIKE %s OR 
                pv.SKU LIKE %s OR
                pv.Color LIKE %s OR
                pv.Size LIKE %s OR
                pv.Material LIKE %s OR
                sm.Movement_ID LIKE %s
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
            attrs = [row[k] for k in ["Color", "Size", "Material"] if row[k]]
            variant_name = " / ".join(attrs) if attrs else "Standard"
            
            results.append({
                "id": str(row["Movement_ID"]),
                "warehouseId": row["Warehouse_ID"],
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
                "createdBy": "Admin"  # TODO: Get from actual admin table when available
            })
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def get_inventory_history(pv_id, warehouse_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT 
                sm.Movement_ID,
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
        params = [pv_id]
        if warehouse_id:
            query += " AND sm.Warehouse_ID = %s"
            params.append(warehouse_id)
        
        query += " ORDER BY sm.Movement_Date DESC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "id": row["Movement_ID"],
                "type": row["Movement_Type"],
                "quantityChange": row["Quantity_Change"],
                "date": row["Movement_Date"].isoformat() if row["Movement_Date"] else None,
                "warehouseName": row["Warehouse_Name"],
                "referenceType": row["Reference_Type"],
                "referenceId": row["Reference_ID"]
            })
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def update_reorder_level(warehouse_id, variant_id, new_level):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Inventory 
            SET Reorder_Level = %s 
            WHERE Warehouse_ID = %s AND Product_Variant_ID = %s
        """, (new_level, warehouse_id, variant_id))
        
            
        conn.commit()
        return {"message": "Reorder level updated successfully"}, 200
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def adjust_inventory(data):
    """
    Manual stock adjustment (e.g., Found, Damaged, Theft)
    data = {
        "warehouse_id": 1,
        "product_variant_id": 10,
        "quantity_change": -2, (Negative for remove, Positive for add)
        "reason": "Damaged",
        "notes": "Optional notes"
    }
    """
    warehouse_id = data.get("warehouse_id")
    variant_id = data.get("product_variant_id")
    qty_change = data.get("quantity_change")
    reason = data.get("reason", "Manual Adjustment")
    notes = data.get("notes", "")

    if not warehouse_id or not variant_id or qty_change is None:
        return {"error": "Missing required fields"}, 400
    
    try:
        qty_change = int(qty_change)
        if qty_change == 0:
            return {"message": "No change requested"}, 200
    except ValueError:
        return {"error": "Invalid quantity"}, 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check if record exists
        cursor.execute("SELECT On_Hand_Quantity FROM Inventory WHERE Warehouse_ID=%s AND Product_Variant_ID=%s", (warehouse_id, variant_id))
        row = cursor.fetchone()
        
        current_qty = row["On_Hand_Quantity"] if row else 0
        new_qty = current_qty + qty_change
        
        if new_qty < 0:
            return {"error": f"Insufficient stock. Current: {current_qty}, Adjustment: {qty_change}"}, 400

        # Update Inventory
        cursor.execute("""
            INSERT INTO Inventory (Warehouse_ID, Product_Variant_ID, On_Hand_Quantity, Reorder_Level)
            VALUES (%s, %s, %s, 10)
            ON DUPLICATE KEY UPDATE On_Hand_Quantity = On_Hand_Quantity + VALUES(On_Hand_Quantity)
        """, (warehouse_id, variant_id, qty_change))

        # Log Movement
        cursor.execute("""
            INSERT INTO StockMovement 
            (Warehouse_ID, Product_Variant_ID, Quantity_Change, Movement_Type, Reference_Type, Reference_ID, Movement_Date)
            VALUES (%s, %s, %s, 'ADJUSTMENT', %s, '0', NOW())
        """, (warehouse_id, variant_id, qty_change, reason)) # using Reference_Type to store Reason (e.g. 'Damaged')

        conn.commit()
        return {"message": "Inventory adjusted successfully", "new_quantity": new_qty}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def transfer_inventory(data):
    """
    Transfer stock between warehouses
    data = {
        "source_warehouse_id": 1,
        "target_warehouse_id": 2,
        "product_variant_id": 10,
        "quantity": 5,
        "notes": "Restocking"
    }
    """
    source_id = data.get("source_warehouse_id")
    target_id = data.get("target_warehouse_id")
    variant_id = data.get("product_variant_id")
    qty = data.get("quantity")
    notes = data.get("notes", "")

    if not source_id or not target_id or not variant_id or not qty:
        return {"error": "Missing required fields"}, 400
    
    if source_id == target_id:
        return {"error": "Source and Target warehouses must be different"}, 400

    try:
        qty = int(qty)
        if qty <= 0:
            return {"error": "Quantity must be positive"}, 400
    except ValueError:
        return {"error": "Invalid quantity"}, 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check Source Stock
        cursor.execute("SELECT On_Hand_Quantity FROM Inventory WHERE Warehouse_ID=%s AND Product_Variant_ID=%s", (source_id, variant_id))
        row = cursor.fetchone()
        current_source_qty = row["On_Hand_Quantity"] if row else 0
        
        if current_source_qty < qty:
            return {"error": f"Insufficient stock in source warehouse. Available: {current_source_qty}"}, 400

        # 1. Deduct from Source
        cursor.execute("""
            UPDATE Inventory SET On_Hand_Quantity = On_Hand_Quantity - %s 
            WHERE Warehouse_ID = %s AND Product_Variant_ID = %s
        """, (qty, source_id, variant_id))

        # 2. Add to Target
        cursor.execute("""
            INSERT INTO Inventory (Warehouse_ID, Product_Variant_ID, On_Hand_Quantity, Reorder_Level)
            VALUES (%s, %s, %s, 10)
            ON DUPLICATE KEY UPDATE On_Hand_Quantity = On_Hand_Quantity + VALUES(On_Hand_Quantity)
        """, (target_id, variant_id, qty))

        # 3. Log Movements
        # Outbound
        cursor.execute("""
            INSERT INTO StockMovement 
            (Warehouse_ID, Product_Variant_ID, Quantity_Change, Movement_Type, Reference_Type, Reference_ID, Movement_Date)
            VALUES (%s, %s, %s, 'TRANSFER_OUT', 'WAREHOUSE', %s, NOW())
        """, (source_id, variant_id, -qty, str(target_id)))

        # Inbound
        cursor.execute("""
            INSERT INTO StockMovement 
            (Warehouse_ID, Product_Variant_ID, Quantity_Change, Movement_Type, Reference_Type, Reference_ID, Movement_Date)
            VALUES (%s, %s, %s, 'TRANSFER_IN', 'WAREHOUSE', %s, NOW())
        """, (target_id, variant_id, qty, str(source_id)))

        conn.commit()
        return {"message": "Stock transferred successfully"}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()
