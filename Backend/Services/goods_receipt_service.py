from db import get_connection
from datetime import datetime

# GET ALL GOODS RECEIPTS (Filtered)
# =========================
def list_goods_receipts(filters=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    if filters is None:
        filters = {}
    
    try:
        base_query = """
            SELECT 
                gr.Receipt_ID,
                gr.PO_ID,
                gr.Notes,
                gr.Receipt_Date,
                po.Warehouse_ID,
                w.Name as Warehouse_Name,
                po.Status as PO_Status,
                s.Supplier_Name
            FROM GoodsReceipt gr
            JOIN PurchaseOrder po ON gr.PO_ID = po.PO_ID
            JOIN Warehouse w ON po.Warehouse_ID = w.Warehouse_ID
            JOIN Supplier s ON po.Supplier_ID = s.Supplier_ID
        """
        
        where_clauses = []
        params = []
        
        # 1. General Search (Receipt ID, PO ID, or Supplier Name)
        if filters.get('search'):
            term = f"%{filters['search']}%"
            where_clauses.append("(CAST(gr.Receipt_ID AS CHAR) LIKE %s OR CAST(gr.PO_ID AS CHAR) LIKE %s OR s.Supplier_Name LIKE %s)")
            params.extend([term, term, term])
        
        # 2. Date Range Filter
        if filters.get('start_date'):
            where_clauses.append("gr.Receipt_Date >= %s")
            params.append(filters['start_date'])
        
        if filters.get('end_date'):
            where_clauses.append("gr.Receipt_Date <= %s")
            val = filters['end_date']
            if len(val) == 10:
                val += " 23:59:59"
            params.append(val)
        
        # 3. Product Search (EXISTS subquery)
        if filters.get('product_search'):
            p_term = f"%{filters['product_search']}%"
            subquery = """
                EXISTS (
                    SELECT 1 
                    FROM PurchaseOrderItem poi_sub
                    JOIN ProductVariant pv_sub ON poi_sub.Product_Variant_ID = pv_sub.Product_Variant_ID
                    JOIN Product p_sub ON pv_sub.Product_ID = p_sub.Product_ID
                    WHERE poi_sub.PO_ID = gr.PO_ID
                    AND (pv_sub.SKU LIKE %s OR p_sub.Product_Name LIKE %s)
                )
            """
            where_clauses.append(subquery)
            params.extend([p_term, p_term])
        
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        base_query += " ORDER BY gr.Receipt_ID DESC"
        
        cursor.execute(base_query, tuple(params))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "Receipt_ID": row["Receipt_ID"],
                "PO_ID": row["PO_ID"],
                "Notes": row["Notes"],
                "Warehouse_ID": row["Warehouse_ID"],
                "Warehouse_Name": row["Warehouse_Name"],
                "Receipt_Date": str(row["Receipt_Date"]) if row["Receipt_Date"] else None,
                "PO_Status": row["PO_Status"],
                "Supplier_Name": row["Supplier_Name"]
            })
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


# GET SINGLE GOODS RECEIPT WITH ITEMS
# =========================
def get_goods_receipt(receipt_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Get receipt header (warehouse comes from PO)
        cursor.execute("""
            SELECT 
                gr.Receipt_ID,
                gr.PO_ID,
                gr.Notes,
                gr.Receipt_Date,
                po.Warehouse_ID,
                po.Order_Date,
                po.Estimated_Arrival_Date,
                w.Name as Warehouse_Name,
                s.Supplier_Name,
                u.Full_Name as Admin_Name
            FROM GoodsReceipt gr
            JOIN PurchaseOrder po ON gr.PO_ID = po.PO_ID
            JOIN Warehouse w ON po.Warehouse_ID = w.Warehouse_ID
            JOIN Supplier s ON po.Supplier_ID = s.Supplier_ID
            LEFT JOIN Admin u ON gr.Received_By_Admin_ID = u.Admin_ID
            WHERE gr.Receipt_ID = %s
        """, (receipt_id,))
        row = cursor.fetchone()
        
        if not row:
            return {"error": "Goods Receipt not found"}, 404
        
        receipt = {
            "Receipt_ID": row["Receipt_ID"],
            "PO_ID": row["PO_ID"],
            "Notes": row["Notes"],
            "Warehouse_ID": row["Warehouse_ID"],
            "Warehouse_Name": row["Warehouse_Name"],
            "Receipt_Date": str(row["Receipt_Date"]) if row["Receipt_Date"] else None,
            "PO_Date": str(row["Order_Date"]) if row["Order_Date"] else None,
            "Expected_Date": str(row["Estimated_Arrival_Date"]) if row["Estimated_Arrival_Date"] else None,
            "Supplier_Name": row["Supplier_Name"],
            "Received_By": row["Admin_Name"],
            "Items": []
        }
        
        # Get items (From PurchaseOrderItem, as 1:1 map)
        cursor.execute("""
            SELECT 
                poi.Product_Variant_ID,
                poi.Quantity_Ordered as Quantity_Received,
                poi.Unit_Cost,
                pv.SKU,
                p.Product_Name
            FROM PurchaseOrderItem poi
            JOIN ProductVariant pv ON poi.Product_Variant_ID = pv.Product_Variant_ID
            JOIN Product p ON pv.Product_ID = p.Product_ID
            WHERE poi.PO_ID = (SELECT PO_ID FROM GoodsReceipt WHERE Receipt_ID = %s)
        """, (receipt_id,))
        items = cursor.fetchall()
        
        for item in items:
            receipt["Items"].append({
                "Product_Variant_ID": item["Product_Variant_ID"],
                "Quantity_Received": item["Quantity_Received"],
                "Unit_Cost": float(item["Unit_Cost"]) if item["Unit_Cost"] else 0,
                "SKU": item["SKU"],
                "Product_Name": item["Product_Name"]
            })
        
        return receipt, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


# CREATE GOODS RECEIPT
# =========================
def create_goods_receipt(data):
    """
    data = {
        "po_id": 1,
        "notes": "Optional notes",
        "received_by_admin_id": 123
    }
    
    This function:
    1. Validates PO doesn't already have a receipt (1:1 relationship)
    2. Creates GoodsReceipt record
    3. Fetches PurchaseOrderItems
    4. Updates Inventory (increases On_Hand_Quantity) based on PO items
    5. Creates StockMovement records
    6. Updates PurchaseOrder status to RECEIVED
    """
    po_id = data.get("po_id")
    notes = data.get("notes", "")
    received_by_admin_id = data.get("received_by_admin_id")
    
    if not po_id or not received_by_admin_id:
        return {"error": "po_id and received_by_admin_id are required"}, 400
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Check if PO already has a receipt (1:1 constraint)
        cursor.execute("SELECT Receipt_ID FROM GoodsReceipt WHERE PO_ID = %s", (po_id,))
        if cursor.fetchone():
            return {"error": "This PO already has a Goods Receipt"}, 400
        
        # Get Warehouse_ID from PO
        cursor.execute("SELECT Warehouse_ID, Status FROM PurchaseOrder WHERE PO_ID = %s", (po_id,))
        po_row = cursor.fetchone()
        if not po_row:
            return {"error": "Purchase Order not found"}, 404
        
        warehouse_id = po_row["Warehouse_ID"]
        
        # 1. Create GoodsReceipt
        receipt_date = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("""
            INSERT INTO GoodsReceipt (PO_ID, Received_By_Admin_ID, Notes, Receipt_Date)
            VALUES (%s, %s, %s, %s)
        """, (po_id, received_by_admin_id, notes, receipt_date))
        receipt_id = cursor.lastrowid
        
        # 2. Fetch items FROM PurchaseOrderItem (Since full receipt enforced)
        cursor.execute("""
            SELECT Product_Variant_ID, Quantity_Ordered, Unit_Cost 
            FROM PurchaseOrderItem 
            WHERE PO_ID = %s
        """, (po_id,))
        po_items = cursor.fetchall()
        
        # 3. Update Inventory and Create Stock Movements
        for item in po_items:
            pv_id = item["Product_Variant_ID"]
            qty = item["Quantity_Ordered"]
            # unit_cost used for valuation context if needed, but not stored in movement
            
            if qty <= 0:
                continue
            
            # Update or insert Inventory
            cursor.execute("""
                INSERT INTO Inventory (Warehouse_ID, Product_Variant_ID, On_Hand_Quantity, Reorder_Level)
                VALUES (%s, %s, %s, 10)
                ON DUPLICATE KEY UPDATE
                    On_Hand_Quantity = On_Hand_Quantity + VALUES(On_Hand_Quantity)
            """, (warehouse_id, pv_id, qty))
            
            # Create StockMovement
            cursor.execute("""
                INSERT INTO StockMovement 
                (Warehouse_ID, Product_Variant_ID, Quantity_Change, Movement_Type, Reference_Type, Reference_ID, Movement_Date)
                VALUES (%s, %s, %s, 'INBOUND', 'GOODS_RECEIPT', %s, %s)
            """, (warehouse_id, pv_id, qty, str(receipt_id), datetime.now()))
        
        # 4. Update PO status to RECEIVED
        cursor.execute("""
            UPDATE PurchaseOrder SET Status = 'RECEIVED' WHERE PO_ID = %s
        """, (po_id,))
        
        conn.commit()
        
        return {
            "message": "Goods Receipt created successfully",
            "Receipt_ID": receipt_id
        }, 201
        
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


# GET RECEIVABLE PO ITEMS
# =========================
def get_receivable_po_items(po_id):
    """
    Get items from a PO that hasn't been received yet
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check if PO already has a receipt
        cursor.execute("SELECT Receipt_ID FROM GoodsReceipt WHERE PO_ID = %s", (po_id,))
        if cursor.fetchone():
            return [], 200  # Already received, no items pending
        
        # Get ordered items
        cursor.execute("""
            SELECT 
                poi.Product_Variant_ID,
                poi.Quantity_Ordered,
                poi.Unit_Cost,
                pv.SKU,
                p.Product_Name
            FROM PurchaseOrderItem poi
            JOIN ProductVariant pv ON poi.Product_Variant_ID = pv.Product_Variant_ID
            JOIN Product p ON pv.Product_ID = p.Product_ID
            WHERE poi.PO_ID = %s
        """, (po_id,))
        ordered = cursor.fetchall()
        
        results = []
        for item in ordered:
            results.append({
                "Product_Variant_ID": item["Product_Variant_ID"],
                "SKU": item["SKU"],
                "Product_Name": item["Product_Name"],
                "Quantity_Ordered": item["Quantity_Ordered"],
                "Quantity_Pending": item["Quantity_Ordered"],  # Full qty since no partial receipts
                "Unit_Cost": float(item["Unit_Cost"]) if item["Unit_Cost"] else 0
            })
        
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()
