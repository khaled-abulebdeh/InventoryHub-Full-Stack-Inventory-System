from db import get_connection

def format_po_number(num):
    return f"PO-{int(num):03d}"

# GET LIST (Filtered)
# =========================
def list_purchase_orders(filters=None):
    conn = get_connection()
    cursor = conn.cursor()

    if filters is None:
        filters = {}

    base_query = """
        SELECT
            po.PO_ID,
            s.Supplier_ID,
            s.Supplier_Name,
            po.Warehouse_ID,
            w.Name as Warehouse_Name,
            po.Status,
            po.Order_Date,
            po.Estimated_Arrival_Date,
            IFNULL(SUM(poi.Quantity_Ordered * poi.Unit_Cost), 0) AS Total_Amount
        FROM PurchaseOrder po
        JOIN Supplier s ON po.Supplier_ID = s.Supplier_ID
        JOIN Warehouse w ON po.Warehouse_ID = w.Warehouse_ID
        LEFT JOIN PurchaseOrderItem poi ON po.PO_ID = poi.PO_ID
    """

    where_clauses = []
    params = []

    # 1. Status Filter
    if filters.get('status') and filters['status'] != 'ALL':
        where_clauses.append("po.Status = %s")
        params.append(filters['status'])

    # 2. General Search (PO ID or Supplier Name)
    if filters.get('search'):
        term = f"%{filters['search']}%"
        where_clauses.append("(CAST(po.PO_ID AS CHAR) LIKE %s OR s.Supplier_Name LIKE %s)")
        params.extend([term, term])

    # 3. Date Range Filter
    if filters.get('start_date'):
        where_clauses.append("po.Order_Date >= %s")
        params.append(filters['start_date'])
    
    if filters.get('end_date'):
        where_clauses.append("po.Order_Date <= %s")
        val = filters['end_date']
        if len(val) == 10:
            val += " 23:59:59"
        params.append(val)

    # 4. Product Variant Search (Using EXISTS to preserve Total_Amount agg)
    if filters.get('product_search'):
        p_term = f"%{filters['product_search']}%"
        # Check if PO has any item matching SKU or Product Name
        subquery = """
            EXISTS (
                SELECT 1 
                FROM PurchaseOrderItem poi_sub
                JOIN ProductVariant pv_sub ON poi_sub.Product_Variant_ID = pv_sub.Product_Variant_ID
                JOIN Product p_sub ON pv_sub.Product_ID = p_sub.Product_ID
                WHERE poi_sub.PO_ID = po.PO_ID
                AND (pv_sub.SKU LIKE %s OR p_sub.Product_Name LIKE %s)
            )
        """
        where_clauses.append(subquery)
        params.extend([p_term, p_term])

    if where_clauses:
        base_query += " WHERE " + " AND ".join(where_clauses)

    base_query += """
        GROUP BY po.PO_ID, s.Supplier_ID, s.Supplier_Name, po.Warehouse_ID, w.Name, po.Status, po.Order_Date, po.Estimated_Arrival_Date
        ORDER BY po.PO_ID DESC
    """

    cursor.execute(base_query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # convert numeric and date fields
    for r in rows:
        r["Total_Amount"] = float(r["Total_Amount"])
        r["Order_Date"] = r["Order_Date"].isoformat() if r["Order_Date"] else None
        r["Estimated_Arrival_Date"] = r["Estimated_Arrival_Date"].isoformat() if r["Estimated_Arrival_Date"] else None

    return rows

# GET ONE
# =========================
def get_purchase_order(po_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            po.PO_ID,
            po.Supplier_ID,
            s.Supplier_Name,
            po.Warehouse_ID,
            w.Name as Warehouse_Name,
            po.Status,
            po.Order_Date,
            po.Estimated_Arrival_Date,
            u.Full_Name as Created_By_Name,
            IFNULL(SUM(poi.Quantity_Ordered * poi.Unit_Cost), 0) as Total_Amount
        FROM PurchaseOrder po
        JOIN Supplier s ON po.Supplier_ID = s.Supplier_ID
        JOIN Warehouse w ON po.Warehouse_ID = w.Warehouse_ID
        LEFT JOIN Admin u ON po.Created_By_Admin_ID = u.Admin_ID
        LEFT JOIN PurchaseOrderItem poi ON po.PO_ID = poi.PO_ID
        WHERE po.PO_ID = %s
        GROUP BY po.PO_ID, s.Supplier_Name, w.Name, po.Status, po.Order_Date, po.Estimated_Arrival_Date, u.Full_Name
    """, (po_id,))

    po = cursor.fetchone()
    if not po:
        cursor.close()
        conn.close()
        return None

    cursor.execute("""
        SELECT
            poi.Product_Variant_ID,
            pv.SKU,
            pv.Unit_Price,
            poi.Quantity_Ordered,
            poi.Unit_Cost,
            sp.Lead_Time_Days
        FROM PurchaseOrderItem poi
        JOIN ProductVariant pv ON poi.Product_Variant_ID = pv.Product_Variant_ID
        LEFT JOIN PurchaseOrder po ON poi.PO_ID = po.PO_ID
        LEFT JOIN SupplierProductVariant sp ON po.Supplier_ID = sp.Supplier_ID AND poi.Product_Variant_ID = sp.Product_Variant_ID
        WHERE poi.PO_ID = %s
    """, (po_id,))

    po["Items"] = cursor.fetchall()
    
    # Format dates
    if po["Order_Date"]:
        po["Order_Date"] = po["Order_Date"].isoformat()
    if po["Estimated_Arrival_Date"]:
        po["Estimated_Arrival_Date"] = po["Estimated_Arrival_Date"].isoformat()

    cursor.close()
    conn.close()
    return po

# CREATE
# =========================
def create_purchase_order(data):
    """
    Expects data with: Supplier_ID, Warehouse_ID, Created_By_Admin_ID, items: []
    """
    supplier_id = data.get("supplierId") or data.get("Supplier_ID")
    warehouse_id = data.get("warehouseId") or data.get("Warehouse_ID")
    created_by = data.get("createdByAdminId") or data.get("Created_By_Admin_ID")
    items = data.get("items") or []

    if not supplier_id:
        return None, "Supplier_ID is required"
    if not warehouse_id:
        return None, "Warehouse_ID is required"
    if not created_by:
        return None, "Created_By_Admin_ID is required"
    if not isinstance(items, list) or len(items) == 0:
        return None, "At least one order item is required"

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # validate supplier
        cursor.execute("SELECT 1 FROM Supplier WHERE Supplier_ID=%s", (supplier_id,))
        if not cursor.fetchone():
            return None, "Supplier not found"

        # validate warehouse
        cursor.execute("SELECT 1 FROM Warehouse WHERE Warehouse_ID=%s", (warehouse_id,))
        if not cursor.fetchone():
            return None, "Warehouse not found"

        # validate admin
        cursor.execute("SELECT 1 FROM Admin WHERE Admin_ID=%s", (created_by,))
        if not cursor.fetchone():
            return None, "Creating admin not found"

        # Validate variants & Calculate Max Lead Time
        max_lead_time = 0
        
        for i, it in enumerate(items):
            pv = it.get("productVariantId") or it.get("Product_Variant_ID")
            qty = it.get("quantity") or it.get("Quantity_Ordered")
            unit_cost = it.get("unitCost") or it.get("Unit_Cost")
            
            if not pv:
                return None, f"Product_Variant_ID is required for item {i+1}"
            
            # Fetch Unit_Price (as backup) and check existence
            cursor.execute("SELECT Unit_Price FROM ProductVariant WHERE Product_Variant_ID=%s", (pv,))
            row = cursor.fetchone()
            if not row:
                return None, f"Product variant not found: {pv}"
            
            if qty is None or int(qty) <= 0:
                return None, f"Invalid quantity for variant {pv}"
            
            if unit_cost is None:
                unit_cost = float(row["Unit_Price"]) if row.get("Unit_Price") is not None else 0
            
            # Helper: fetch lead time from SupplierProductVariant for this link
            cursor.execute("""
                SELECT Lead_Time_Days FROM SupplierProductVariant 
                WHERE Supplier_ID=%s AND Product_Variant_ID=%s
            """, (supplier_id, pv))
            sp_row = cursor.fetchone()
            lead_time = int(sp_row["Lead_Time_Days"]) if sp_row and sp_row["Lead_Time_Days"] else 0
            if lead_time > max_lead_time:
                max_lead_time = lead_time

        # insert PO with PENDING status
        cursor.execute(
            """INSERT INTO PurchaseOrder 
               (Supplier_ID, Warehouse_ID, Created_By_Admin_ID, Status, Order_Date, Estimated_Arrival_Date) 
               VALUES (%s, %s, %s, %s, NOW(), DATE_ADD(NOW(), INTERVAL %s DAY))""",
            (supplier_id, warehouse_id, created_by, 'PENDING', max_lead_time)
        )
        po_id = cursor.lastrowid

        # insert items
        for it in items:
            pv = it.get("productVariantId") or it.get("Product_Variant_ID")
            qty = int(it.get("quantity") or it.get("Quantity_Ordered"))
            unit_cost = float(it.get("unitCost") or it.get("Unit_Cost") or 0)
            cursor.execute(
                "INSERT INTO PurchaseOrderItem (PO_ID, Product_Variant_ID, Quantity_Ordered, Unit_Cost) VALUES (%s,%s,%s,%s)",
                (po_id, pv, qty, unit_cost)
            )

        conn.commit()
        
        # Fetch the estimated arrival date to return
        cursor.execute("SELECT Estimated_Arrival_Date FROM PurchaseOrder WHERE PO_ID = %s", (po_id,))
        po_row = cursor.fetchone()
        estimated_date = po_row["Estimated_Arrival_Date"] if po_row else None
        
        return {
            "PO_ID": po_id, 
            "PO_Number": format_po_number(po_id),
            "Estimated_Arrival_Date": str(estimated_date) if estimated_date else None,
            "Max_Lead_Time_Days": max_lead_time
        }, None

    except Exception as e:
        conn.rollback()
        return None, str(e)

    finally:
        cursor.close()
        conn.close()

# CANCEL
# =========================
def cancel_purchase_order(po_id):
    """
    Cancel a purchase order. Only allowed if status is PENDING (not yet received).
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Check current status
        cursor.execute("SELECT Status FROM PurchaseOrder WHERE PO_ID = %s", (po_id,))
        row = cursor.fetchone()
        
        if not row:
            return {"error": "Purchase Order not found"}, 404
        
        if row["Status"] != "PENDING":
            return {"error": "Cannot cancel a PO that has already been received"}, 400
        
        # Update status to CANCELLED
        cursor.execute("UPDATE PurchaseOrder SET Status = 'CANCELLED' WHERE PO_ID = %s", (po_id,))
        conn.commit()
        
        return {"message": f"PO {po_id} has been cancelled"}, 200
        
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()
