from db import get_connection

def get_all_warehouses():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                w.Warehouse_ID,
                w.Name,
                w.Phone,
                w.Email,
                a.Address_Line,
                pl.City,
                pl.State_Region,
                a.Postal_Code,
                pl.Country
            FROM Warehouse w
            JOIN Address a ON w.Address_ID = a.Address_ID
            JOIN PostalLookup pl ON a.Postal_Code = pl.Postal_Code
            ORDER BY w.Name
        """)
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "Warehouse_ID": row["Warehouse_ID"],
                "Name": row["Name"],
                "Phone": row["Phone"],
                "Email": row["Email"],
                "Address_Line": row["Address_Line"],
                "City": row["City"],
                "State_Region": row["State_Region"],
                "Postal_Code": row["Postal_Code"],
                "Country": row["Country"]
            })
        return results, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()


def get_warehouse(warehouse_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                w.Warehouse_ID,
                w.Name,
                w.Phone,
                w.Email,
                a.Address_Line,
                pl.City,
                pl.State_Region,
                a.Postal_Code,
                pl.Country
            FROM Warehouse w
            JOIN Address a ON w.Address_ID = a.Address_ID
            JOIN PostalLookup pl ON a.Postal_Code = pl.Postal_Code
            WHERE w.Warehouse_ID = %s
        """, (warehouse_id,))
        row = cursor.fetchone()
        
        if not row:
            return {"error": "Warehouse not found"}, 404
            
        return {
            "Warehouse_ID": row["Warehouse_ID"],
            "Name": row["Name"],
            "Phone": row["Phone"],
            "Email": row["Email"],
            "Address_Line": row["Address_Line"],
            "City": row["City"],
            "State_Region": row["State_Region"],
            "Postal_Code": row["Postal_Code"],
            "Country": row["Country"]
        }, 200
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()
