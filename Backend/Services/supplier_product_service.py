from db import get_connection

# GET SUPPLIERS FOR VARIANT
# =========================
def get_suppliers_for_variant(variant_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
            # Join with Supplier table to get names
        cursor.execute("""
            SELECT 
                sp.Supplier_ID, 
                s.Supplier_Name, 
                sp.Product_Variant_ID, 
                sp.Preferred_Flag, 
                sp.Unit_Cost, 
                sp.Lead_Time_Days
            FROM SupplierProductVariant sp
            JOIN Supplier s ON sp.Supplier_ID = s.Supplier_ID
            JOIN ProductVariant pv ON sp.Product_Variant_ID = pv.Product_Variant_ID
            WHERE sp.Product_Variant_ID = %s
            ORDER BY sp.Preferred_Flag DESC, s.Supplier_Name ASC
        """, (variant_id,))

        rows = cursor.fetchall()
        
        # Convert to list of dicts
        results = []
        for row in rows:
            results.append({
                "Supplier_ID": row["Supplier_ID"],
                "Supplier_Name": row["Supplier_Name"],
                "Product_Variant_ID": row["Product_Variant_ID"],
                "Preferred_Flag": bool(row["Preferred_Flag"]),
                "Is_Preferred": bool(row["Preferred_Flag"]),
                "Unit_Cost": row["Unit_Cost"],
                "Lead_Time_Days": row["Lead_Time_Days"]
            })
            
        return results, 200
        
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

# LINK SUPPLIER TO VARIANT
# =========================
def add_supplier_to_variant(variant_id, data):
    supplier_id = data.get("supplier_id")
    unit_cost = data.get("unit_cost")
    lead_time = data.get("lead_time_days")
    is_preferred = data.get("is_preferred", False)

    if not supplier_id:
        return {"error": "Supplier ID is required"}, 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if already exists
        cursor.execute("""
            SELECT 1 FROM SupplierProductVariant 
            WHERE Supplier_ID = %s AND Product_Variant_ID = %s
        """, (supplier_id, variant_id))
        
        if cursor.fetchone():
            return {"error": "Supplier already linked to this variant"}, 409

        # If this is preferred, unset other preferred flags for this variant?
        # Requirement: "consistency" -> usually one preferred supplier.
        if is_preferred:
            cursor.execute("""
                UPDATE SupplierProductVariant 
                SET Preferred_Flag = FALSE 
                WHERE Product_Variant_ID = %s
            """, (variant_id,))

        cursor.execute("""
            INSERT INTO SupplierProductVariant 
            (Supplier_ID, Product_Variant_ID, Preferred_Flag, Unit_Cost, Lead_Time_Days)
            VALUES (%s, %s, %s, %s, %s)
        """, (supplier_id, variant_id, is_preferred, unit_cost, lead_time))

        # SYNC ProductVariant - Only Unit Cost -> Unit Price
        # (This is the selling price baseline)
        # Prioritize unit_price if explicitly provided
        pv_fields = []
        pv_values = []
        if unit_cost is not None:
            pv_fields.append("Unit_Price = %s")
            pv_values.append(unit_cost)
            
        if pv_fields:
            pv_values.append(variant_id)
            cursor.execute(f"UPDATE ProductVariant SET {', '.join(pv_fields)} WHERE Product_Variant_ID = %s", tuple(pv_values))

        conn.commit()
        return {"message": "Supplier linked successfully"}, 201

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

# UPDATE LINK
# =========================
def update_supplier_link(variant_id, supplier_id, data):
    unit_cost = data.get("unit_cost")
    lead_time = data.get("lead_time_days")
    is_preferred = data.get("is_preferred")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # If setting to preferred, unset others
        if is_preferred:
            cursor.execute("""
                UPDATE SupplierProductVariant 
                SET Preferred_Flag = FALSE 
                WHERE Product_Variant_ID = %s
            """, (variant_id,))

        # Construct update query dynamically based on provided fields
        fields = []
        values = []
        
        if unit_cost is not None:
            fields.append("Unit_Cost = %s")
            values.append(unit_cost)
            
        if lead_time is not None:
            fields.append("Lead_Time_Days = %s")
            values.append(lead_time)
            
        if is_preferred is not None:
            fields.append("Preferred_Flag = %s")
            values.append(is_preferred)

        if not fields:
            return {"message": "No changes provided"}, 200

        values.append(supplier_id)
        values.append(variant_id)

        query = f"UPDATE SupplierProductVariant SET {', '.join(fields)} WHERE Supplier_ID = %s AND Product_Variant_ID = %s"
        
        cursor.execute(query, tuple(values))
        
        # SYNC ProductVariant
        pv_fields = []
        pv_values = []
        
        if unit_cost is not None:
            pv_fields.append("Unit_Price = %s")
            pv_values.append(unit_cost)
            
        if pv_fields:
            pv_values.append(variant_id)
            cursor.execute(f"""
                UPDATE ProductVariant 
                SET {', '.join(pv_fields)} 
                WHERE Product_Variant_ID = %s
            """, tuple(pv_values))
            
        conn.commit()
        
        return {"message": "Link updated successfully"}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

# REMOVE LINK
# =========================
def remove_supplier_from_variant(variant_id, supplier_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # CHECK FOR PENDING PURCHASE ORDERS
        cursor.execute("""
            SELECT 1 
            FROM PurchaseOrder po
            JOIN PurchaseOrderItem poi ON po.PO_ID = poi.PO_ID
            WHERE po.Supplier_ID = %s 
              AND poi.Product_Variant_ID = %s
              AND po.Status = 'PENDING'
            LIMIT 1
        """, (supplier_id, variant_id))
        
        if cursor.fetchone():
            return {"error": "Cannot unlink: Pending Purchase Orders exist for this item with this supplier"}, 400

        cursor.execute("""
            DELETE FROM SupplierProductVariant 
            WHERE Supplier_ID = %s AND Product_Variant_ID = %s
        """, (supplier_id, variant_id))
        
        if cursor.rowcount == 0:
            return {"error": "Link not found"}, 404
            
        conn.commit()
        return {"message": "Link removed successfully"}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

# REVERSE LINKING (SUPPLIER -> PRODUCTS)
# =========================
def get_supplier_product_map(supplier_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Get all products and variants, and check if linked to this supplier
        cursor.execute("""
            SELECT 
                p.Product_ID,
                p.Product_Name,
                pv.Product_Variant_ID,
                pv.SKU,
                sp.Supplier_ID,
                sp.Preferred_Flag,
                sp.Unit_Cost,
                sp.Lead_Time_Days,
                pv.Unit_Price
            FROM Product p
            JOIN ProductVariant pv ON p.Product_ID = pv.Product_ID
            LEFT JOIN SupplierProductVariant sp ON pv.Product_Variant_ID = sp.Product_Variant_ID AND sp.Supplier_ID = %s
            ORDER BY p.Product_Name, pv.SKU
        """, (supplier_id,))
        
        rows = cursor.fetchall()
        
        # Build hierarchy: Product -> [Variants]
        products_map = {}
        
        for row in rows:
            pid = row["Product_ID"]
            if pid not in products_map:
                products_map[pid] = {
                    "Product_ID": pid,
                    "Product_Name": row["Product_Name"],
                    "Variants": []
                }
            
            products_map[pid]["Variants"].append({
                "Product_Variant_ID": row["Product_Variant_ID"],
                "SKU": row["SKU"],
                "Is_Linked": row["Supplier_ID"] is not None,
                "Is_Preferred": bool(row["Preferred_Flag"]) if row["Preferred_Flag"] is not None else False,
                "Unit_Cost": row["Unit_Cost"],
                "Lead_Time_Days": row["Lead_Time_Days"],
                "Unit_Price": row["Unit_Price"]
            })
            
        return list(products_map.values()), 200

    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


def bulk_update_supplier_links(supplier_id, changes):
    """
    changes: List of { 
        "variant_id": 123, 
        "action": "LINK" | "UNLINK",
        "unit_cost": 10.5,
        "lead_time_days": 5,
        "is_preferred": true
    }
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        for change in changes:
            vid = change.get("variant_id")
            action = change.get("action")
            
            if not vid or not action:
                continue
                
            if action == "LINK":
                unit_cost = change.get("unit_cost")
                lead_time = change.get("lead_time_days")
                is_preferred = change.get("is_preferred", False)

                # If setting as preferred, unset others for this variant first
                if is_preferred:
                    cursor.execute("""
                        UPDATE SupplierProductVariant 
                        SET Preferred_Flag = FALSE 
                        WHERE Product_Variant_ID = %s
                    """, (vid,))

                # Upsert (Insert or Update if exists)
                cursor.execute("""
                    INSERT INTO SupplierProductVariant (Supplier_ID, Product_Variant_ID, Unit_Cost, Lead_Time_Days, Preferred_Flag)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        Unit_Cost = VALUES(Unit_Cost),
                        Lead_Time_Days = VALUES(Lead_Time_Days),
                        Preferred_Flag = VALUES(Preferred_Flag)
                """, (supplier_id, vid, unit_cost, lead_time, is_preferred))
                
                
            elif action == "UNLINK":
                # CHECK FOR PENDING PURCHASE ORDERS
                cursor.execute("""
                    SELECT 1 
                    FROM PurchaseOrder po
                    JOIN PurchaseOrderItem poi ON po.PO_ID = poi.PO_ID
                    WHERE po.Supplier_ID = %s 
                      AND poi.Product_Variant_ID = %s
                      AND po.Status = 'PENDING'
                    LIMIT 1
                """, (supplier_id, vid))
                
                if cursor.fetchone():
                    # Decide on behavior: Stop all or skip?
                    # Generally, transactions should be atomic. If one fails, rollback?
                    # Or maybe just return an error for the whole batch?
                    # Let's error out to be safe.
                    raise Exception(f"Cannot unlink variant ID {vid}: Pending Purchase Orders exist")

                cursor.execute("""
                    DELETE FROM SupplierProductVariant 
                    WHERE Supplier_ID = %s AND Product_Variant_ID = %s
                """, (supplier_id, vid))
                
            # SYNC to ProductVariant (Price Only)
            # If we are linking or updating, we sync the latest values to the ProductVariant
            if action == "LINK":
                # Only update if provided
                cost = change.get("unit_cost")
                
                # We need to construct a dynamic update for ProductVariant too
                # Note: ProductVariant.Unit_Price is what User calls "Price" here
                pv_updates = []
                pv_values = []
                
                if cost is not None:
                    pv_updates.append("Unit_Price = %s")
                    pv_values.append(cost)
                
                if pv_updates:
                    pv_values.append(vid)
                    cursor.execute(f"""
                        UPDATE ProductVariant 
                        SET {', '.join(pv_updates)}
                        WHERE Product_Variant_ID = %s
                    """, tuple(pv_values))

        conn.commit()
        return {"message": "Bulk update completed"}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()
