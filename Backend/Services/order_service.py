from db import get_connection

def list_orders(filters=None):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        where_clauses = []
        params = []

        if filters is None:
            filters = {}

        # 1. Status Filter
        if filters.get('status') and filters['status'] != 'ALL':
            where_clauses.append("o.Order_Status = %s")
            params.append(filters['status'])

        # 2. General Search (Order ID or Customer Name)
        if filters.get('search'):
            term = f"%{filters['search']}%"
            where_clauses.append("(CAST(o.Order_ID AS CHAR) LIKE %s OR c.Full_Name LIKE %s)")
            params.extend([term, term])

        # 3. Date Range Filter
        if filters.get('start_date'):
            where_clauses.append("o.Created_at >= %s")
            params.append(filters['start_date'])
        
        if filters.get('end_date'):
            where_clauses.append("o.Created_at <= %s")
            val = filters['end_date']
            if len(val) == 10:
                val += " 23:59:59"
            params.append(val)

        # 4. Product Search (EXISTS Subquery)
        if filters.get('product_search'):
            p_term = f"%{filters['product_search']}%"
            subquery = """
                EXISTS (
                    SELECT 1 
                    FROM OrderItem oi_sub
                    JOIN ProductVariant pv_sub ON oi_sub.Product_Variant_ID = pv_sub.Product_Variant_ID
                    JOIN Product p_sub ON pv_sub.Product_ID = p_sub.Product_ID
                    WHERE oi_sub.Order_ID = o.Order_ID
                    AND (p_sub.Product_Name LIKE %s OR pv_sub.SKU LIKE %s)
                )
            """
            where_clauses.append(subquery)
            params.extend([p_term, p_term])

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Calculate total dynamically
        query = f"""
            SELECT 
                o.Order_ID,
                o.Order_Status,
                o.Shipping_Fee,
                o.Created_at,
                c.Full_Name as Customer_Name,
                c.Email as Customer_Email,
                (SELECT COALESCE(SUM(oi.Quantity * oi.Unit_Price), 0) FROM OrderItem oi WHERE oi.Order_ID = o.Order_ID) as Subtotal
            FROM `Order` o
            JOIN Customer c ON o.Customer_ID = c.Customer_ID
            {where_sql}
            ORDER BY o.Order_ID DESC
        """
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            subtotal = float(row["Subtotal"])
            shipping = float(row["Shipping_Fee"] or 0)
            total = subtotal + shipping
            
            results.append({
                "Order_ID": row["Order_ID"],
                "Customer_Name": row["Customer_Name"],
                "Customer_Email": row["Customer_Email"],
                "Status": row["Order_Status"],
                "Total_Amount": total,
                "Created_at": row["Created_at"].isoformat() if row["Created_at"] else None
            })
        return results, 200
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def get_order_details(order_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # 1. Fetch Order Header (without non-existent calc columns)
        query_header = """
            SELECT 
                o.Order_ID,
                o.Order_Status,
                o.Shipping_Fee,
                o.Created_at,
                c.Full_Name,
                c.Email,
                c.Phone,
                a.Address_Line,
                a.Postal_Code,
                pl.City,
                pl.State_Region,
                pl.Country,
                pmt.Method as Payment_Method,
                pmt.Status as Payment_Status
            FROM `Order` o
            JOIN Customer c ON o.Customer_ID = c.Customer_ID
            JOIN Address a ON o.Address_ID = a.Address_ID
            JOIN PostalLookup pl ON a.Postal_Code = pl.Postal_Code
            LEFT JOIN Payment pmt ON o.Order_ID = pmt.Order_ID
            WHERE o.Order_ID = %s
        """
        cursor.execute(query_header, (order_id,))
        header = cursor.fetchone()
        
        if not header:
            return {"error": "Order not found"}, 404

        # 2. Fetch Order Items
        query_items = """
            SELECT 
                oi.Quantity,
                oi.Unit_Price,
                p.Product_Name,
                v.SKU,
                v.Color,
                v.Size
            FROM OrderItem oi
            JOIN ProductVariant v ON oi.Product_Variant_ID = v.Product_Variant_ID
            JOIN Product p ON v.Product_ID = p.Product_ID
            WHERE oi.Order_ID = %s
        """
        cursor.execute(query_items, (order_id,))
        items_rows = cursor.fetchall()
        
        items = []
        subtotal = 0.0
        
        for item in items_rows:
            qty = item["Quantity"]
            price = float(item["Unit_Price"])
            line_total = qty * price
            subtotal += line_total
            
            items.append({
                "Product_Name": item["Product_Name"],
                "SKU": item["SKU"],
                "Variant": f"{item['Color'] or ''} {item['Size'] or ''}".strip(),
                "Quantity": qty,
                "Unit_Price": price
            })

        shipping = float(header["Shipping_Fee"] or 0)
        # Assuming simple tax handling or none since no Tax column in Order.
        # Ideally tax is in OrderItem or Order, but DDL has Tax_Percent in OrderItem.
        # Let's ignore detailed tax calc for now unless requested, or sum it up from items.
        # DDL says OrderItem has Tax_Percent.
        
        total = subtotal + shipping

        result = {
            "Order_ID": header["Order_ID"],
            "Status": header["Order_Status"],
            "Customer": {
                "Name": header["Full_Name"],
                "Email": header["Email"],
                "Phone": header["Phone"]
            },
            "Shipping_Address": {
                "Line": header["Address_Line"],
                "City": header["City"],
                "State": header["State_Region"],
                "Country": header["Country"],
                "Postal_Code": header["Postal_Code"]
            },
            "Payment": {
                "Method": header["Payment_Method"],
                "Status": header["Payment_Status"]
            },
            "Financials": {
                "Subtotal": subtotal,
                "Tax": 0, # Placeholder
                "Shipping": shipping,
                "Total": total
            },
            "Created_at": header["Created_at"].isoformat() if header["Created_at"] else None,
            "Items": items
        }

        return result, 200

    except Exception as e:
        print(f"Error fetching order detail: {e}")
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def update_order_status(order_id, new_status):
    allowed_statuses = ['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']
    if new_status not in allowed_statuses:
        return {"error": "Invalid status"}, 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Verify order exists
        cursor.execute("SELECT Order_Status FROM `Order` WHERE Order_ID = %s", (order_id,))
        current = cursor.fetchone()
        if not current:
            return {"error": "Order not found"}, 404
            
        current_status = current["Order_Status"]
        
        if current_status in ("CANCELLED", "RETURNED"):
            return {"error": "Cannot change status of a cancelled/returned order"}, 400

        # Perform update
        cursor.execute("UPDATE `Order` SET Order_Status = %s, Updated_at = NOW() WHERE Order_ID = %s", (new_status, order_id))
        
        # =====================================================
        # STOCK DEDUCTION ON SHIPPED
        # =====================================================
        if new_status == 'SHIPPED' and current_status not in ('SHIPPED', 'DELIVERED', 'CANCELLED'):
            # Fetch order items
            cursor.execute("""
                SELECT oi.Product_Variant_ID, oi.Quantity
                FROM OrderItem oi
                WHERE oi.Order_ID = %s
            """, (order_id,))
            items = cursor.fetchall()
            
            for item in items:
                variant_id = item['Product_Variant_ID']
                qty = item['Quantity']
                
                # Find a warehouse with enough stock
                cursor.execute("""
                    SELECT Warehouse_ID, On_Hand_Quantity
                    FROM Inventory
                    WHERE Product_Variant_ID = %s AND On_Hand_Quantity >= %s
                    LIMIT 1
                """, (variant_id, qty))
                inv = cursor.fetchone()
                
                if not inv:
                    conn.rollback()
                    return {"error": f"Insufficient stock for variant {variant_id}"}, 400
                
                warehouse_id = inv['Warehouse_ID']
                
                # Deduct stock
                cursor.execute("""
                    UPDATE Inventory
                    SET On_Hand_Quantity = On_Hand_Quantity - %s
                    WHERE Warehouse_ID = %s AND Product_Variant_ID = %s
                """, (qty, warehouse_id, variant_id))
                
                # Log StockMovement
                cursor.execute("""
                    INSERT INTO StockMovement (Warehouse_ID, Product_Variant_ID, Quantity_Change, Movement_Type, Reference_Type, Reference_ID, Movement_Date)
                    VALUES (%s, %s, %s, 'SALE', 'ORDER', %s, NOW())
                """, (warehouse_id, variant_id, -qty, str(order_id)))

        # =====================================================
        # STOCK RESTORATION ON CANCELLED OR RETURNED (if already shipped)
        # =====================================================
        if new_status in ('CANCELLED', 'RETURNED') and current_status in ('SHIPPED', 'DELIVERED'):
            # Fetch order items
            cursor.execute("""
                SELECT oi.Product_Variant_ID, oi.Quantity
                FROM OrderItem oi
                WHERE oi.Order_ID = %s
            """, (order_id,))
            items = cursor.fetchall()
            
            for item in items:
                variant_id = item['Product_Variant_ID']
                qty = item['Quantity']
                
                # Find the warehouse where it was deducted (from StockMovement)
                cursor.execute("""
                    SELECT Warehouse_ID
                    FROM StockMovement
                    WHERE Reference_Type = 'ORDER' AND Reference_ID = %s AND Product_Variant_ID = %s AND Quantity_Change < 0
                    LIMIT 1
                """, (str(order_id), variant_id))
                mov = cursor.fetchone()
                
                warehouse_id = None
                if mov:
                    warehouse_id = mov['Warehouse_ID']
                else:
                     # Fallback: If no deduction record found (e.g. manual data insert),
                     # find any warehouse that carries this product to restore to.
                    cursor.execute("""
                        SELECT Warehouse_ID FROM Inventory 
                        WHERE Product_Variant_ID = %s 
                        ORDER BY On_Hand_Quantity DESC 
                        LIMIT 1
                    """, (variant_id,))
                    inv_row = cursor.fetchone()
                    if inv_row:
                        warehouse_id = inv_row['Warehouse_ID']
                
                if warehouse_id:
                    # Restore stock
                    cursor.execute("""
                        UPDATE Inventory
                        SET On_Hand_Quantity = On_Hand_Quantity + %s
                        WHERE Warehouse_ID = %s AND Product_Variant_ID = %s
                    """, (qty, warehouse_id, variant_id))
                    
                    # Log StockMovement (reversal)
                    cursor.execute("""
                        INSERT INTO StockMovement (Warehouse_ID, Product_Variant_ID, Quantity_Change, Movement_Type, Reference_Type, Reference_ID, Movement_Date)
                        VALUES (%s, %s, %s, 'RETURN', 'ORDER', %s, NOW())
                    """, (warehouse_id, variant_id, qty, str(order_id)))

        # =====================================================
        # AUTOMATIC CASH PAYMENT RECORDING
        # =====================================================
        if new_status == 'PAID' and current_status != 'PAID':
            # Calculate total
            cursor.execute("""
                SELECT 
                    (SELECT COALESCE(SUM(Quantity * Unit_Price), 0) FROM OrderItem WHERE Order_ID = %s) as item_total,
                    Shipping_Fee
                FROM `Order` WHERE Order_ID = %s
            """, (order_id, order_id))
            row = cursor.fetchone()
            if row:
                item_total = float(row['item_total'] or 0)
                shipping = float(row['Shipping_Fee'] or 0)
                total_amount = item_total + shipping
            else:
                total_amount = 0
            
            cursor.execute("SELECT Payment_ID FROM Payment WHERE Order_ID = %s", (order_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO Payment (Order_ID, Amount, Method, Status, Processed_At)
                    VALUES (%s, %s, 'CASH', 'SUCCESS', NOW())
                """, (order_id, total_amount))

        conn.commit()
        
        return {"message": "Status updated", "new_status": new_status}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()
