from db import get_connection
from Utils.validation import *
import pymysql



# # GET FILTERED Suppliers (Also, gets all suppliers if no filters are applied)
# Filters are passed from Controller 
def get_filtered_suppliers(filters):
    conn = get_connection()
    cursor = conn.cursor()

    base_query = """
        SELECT DISTINCT
            s.Supplier_ID,
            s.Supplier_Name,
            s.Email,
            s.Description
        FROM Supplier s
        LEFT JOIN Phone_Supplier p ON s.Supplier_ID = p.Supplier_ID
    """
    
    where_clauses = []
    params = []

    # 1. Search (Name, Email, Description, Phone)
    search_term = filters.get("search")
    if search_term:
        term = f"%{search_term}%"
        where_clauses.append("""
            (s.Supplier_Name LIKE %s 
             OR s.Email LIKE %s 
             OR s.Description LIKE %s 
             OR p.Phone LIKE %s)
        """)
        params.extend([term, term, term, term])

    # 2. Email exact match
    email = filters.get("email")
    if email:
        where_clauses.append("s.Email = %s")
        params.append(email)

    # Construct WHERE
    if where_clauses:
        base_query += " WHERE " + " AND ".join(where_clauses)

    # Sorting
    sort_by = filters.get("sort_by", "name")
    order = filters.get("order")
    if not order:
        order = "ASC"
    order = order.upper()
    if order not in ["ASC", "DESC"]:
        order = "ASC"

    # Map frontend sort keys to DB columns
    sort_mapping = {
        "name": "s.Supplier_Name",
        "email": "s.Email"
    }
    
    db_sort_col = sort_mapping.get(sort_by, "s.Supplier_Name")
    base_query += f" ORDER BY {db_sort_col} {order}"

    cursor.execute(base_query, tuple(params))
    supplier_rows = cursor.fetchall()
    
    # Now fetch phones for these suppliers efficiently
    # We can't easily do it in one query if we want clean JSON without duplicates logic here,
    # but the previous method (fetching all rows and checking duplicates) is fine too.
    # Let's stick to the previous aggregation pattern but for the filtered IDs.
    
    suppliers_map = {}
    if supplier_rows:
        # Get IDs to fetch phones
        supplier_ids = [str(r["Supplier_ID"]) for r in supplier_rows]
        ids_placeholder = ",".join(["%s"] * len(supplier_ids))
        
        # Initialize map with supplier details
        for r in supplier_rows:
            suppliers_map[r["Supplier_ID"]] = {
                "Supplier_ID": r["Supplier_ID"],
                "Supplier_Name": r["Supplier_Name"],
                "Email": r["Email"],
                "Description": r["Description"],
                "Phones": []
            }
            
        # Fetch phones for these IDs
        phone_query = f"""
            SELECT Supplier_ID, Phone 
            FROM Phone_Supplier 
            WHERE Supplier_ID IN ({ids_placeholder})
        """
        cursor.execute(phone_query, tuple(supplier_ids))
        phone_rows = cursor.fetchall()
        
        for p in phone_rows:
            sid = p["Supplier_ID"]
            if sid in suppliers_map:
                suppliers_map[sid]["Phones"].append(p["Phone"])

    cursor.close()
    conn.close()

    # Return list respecting the sort order (which valid for list, dicts are ordered in modern python but safer to re-sort or rely on list)
    # Actually, since we built the map from the sorted query result, 
    # and we iterate through supplier_rows to insert into map, 
    # we should just return the values in that order? 
    # Dict insertion order is preserved in Python 3.7+.
    
    # However, to be extra safe let's reconstruct list from sorted IDs
    sorted_result = []
    for r in supplier_rows:
        if r["Supplier_ID"] in suppliers_map:
            sorted_result.append(suppliers_map[r["Supplier_ID"]])
            
    return sorted_result



def create_supplier(data):
    if not isinstance(data, dict):
        return {"error": "Invalid JSON body"}, 400

    name = clean_string(data.get("name"))
    email = clean_string(data.get("email"))
    description = clean_string(data.get("description"))

    if not name:
        return {"error": "Supplier name is required"}, 400

    phones, error = validate_phones(data.get("phones"))
    if error:
        return {"error": error}, 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Check duplicate Email
        print(f"DEBUG: Checking duplicate email: '{email}'")
        cursor.execute("SELECT Supplier_ID FROM Supplier WHERE Email = %s", (email,))
        existing_email = cursor.fetchone()
        print(f"DEBUG: Existing email found: {existing_email}")
        if existing_email:
            return {"error": "Email already exists"}, 409

        # 2. Check duplicate Phones
        for phone in phones:
            print(f"DEBUG: Checking duplicate phone: '{phone}'")
            cursor.execute("SELECT Supplier_ID FROM Phone_Supplier WHERE Phone = %s", (phone,))
            existing = cursor.fetchone()
            print(f"DEBUG: Existing phone found: {existing}")
            if existing:
                return {"error": f"Phone number {phone} already exists"}, 409

        cursor.execute(
            """
            INSERT INTO Supplier (Supplier_Name, Email, Description)
            VALUES (%s, %s, %s)
            """,
            (name, email, description)
        )

        supplier_id = cursor.lastrowid

        for phone in phones:
            cursor.execute(
                """
                INSERT INTO Phone_Supplier (Supplier_ID, Phone)
                VALUES (%s, %s)
                """,
                (supplier_id, phone)
            )

        conn.commit()

        return {
            "Supplier_ID": supplier_id,
            "Supplier_Name": name,
            "Email": email,
            "Description": description,
            "Phones": phones
        }, 201

    except pymysql.err.IntegrityError as e:
        conn.rollback()
        print(f"DEBUG: IntegrityError caught: {e}, args: {e.args}") # DEBUG log
        if e.args[0] == 1062:
            if "Email" in str(e) or "email" in str(e):
                return {"error": "Email already exists"}, 409
            if "Phone" in str(e) or "phone" in str(e):
                return {"error": "Phone number already exists"}, 409
            return {"error": f"Duplicate entry: {str(e)}"}, 409
        return {"error": str(e)}, 500

    except Exception as e:
        conn.rollback()
        print(f"DEBUG: General Exception caught: {type(e)}, {e}") # DEBUG log
        return {"error": str(e)}, 500

    finally:
        cursor.close()
        conn.close()


def update_supplier(supplier_id, data):
    if not isinstance(data, dict):
        return {"error": "Invalid JSON body"}, 400

    name = clean_string(data.get("name"))
    email = clean_string(data.get("email"))
    description = clean_string(data.get("description"))

    if not name:
        return {"error": "Supplier name is required"}, 400

    phones, error = validate_phones(data.get("phones"))
    if error:
        return {"error": error}, 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT Supplier_ID FROM Supplier WHERE Supplier_ID=%s",
            (supplier_id,)
        )
        if not cursor.fetchone():
            return {"error": "Supplier not found"}, 404

        # 1. Check duplicate Email (excluding current supplier)
        cursor.execute("SELECT Supplier_ID FROM Supplier WHERE Email = %s AND Supplier_ID != %s", (email, supplier_id))
        if cursor.fetchone():
            return {"error": "Email already exists"}, 409

        # 2. Check duplicate Phones (excluding current supplier)
        for phone in phones:
            cursor.execute("SELECT Supplier_ID FROM Phone_Supplier WHERE Phone = %s AND Supplier_ID != %s", (phone, supplier_id))
            if cursor.fetchone():
                return {"error": f"Phone number {phone} already exists"}, 409

        cursor.execute(
            """
            UPDATE Supplier
            SET Supplier_Name=%s, Email=%s, Description=%s
            WHERE Supplier_ID=%s
            """,
            (name, email, description, supplier_id)
        )

        cursor.execute(
            "DELETE FROM Phone_Supplier WHERE Supplier_ID=%s",
            (supplier_id,)
        )

        for phone in phones:
            cursor.execute(
                """
                INSERT INTO Phone_Supplier (Supplier_ID, Phone)
                VALUES (%s, %s)
                """,
                (supplier_id, phone)
            )

        conn.commit()

        return {
            "Supplier_ID": supplier_id,
            "Supplier_Name": name,
            "Email": email,
            "Description": description,
            "Phones": phones
        }, 200

    except pymysql.err.IntegrityError as e:
        conn.rollback()
        if e.args[0] == 1062:
            if "Email" in str(e):
                return {"error": "Email already exists"}, 409
            if "Phone" in str(e):
                return {"error": "Phone number already exists"}, 409
            return {"error": "Duplicate entry"}, 409
        return {"error": str(e)}, 500

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500

    finally:
        cursor.close()
        conn.close()


def delete_supplier(supplier_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT Supplier_ID FROM Supplier WHERE Supplier_ID=%s",
            (supplier_id,)
        )
        if not cursor.fetchone():
            return {"error": "Supplier not found"}, 404

        cursor.execute(
            "DELETE FROM Phone_Supplier WHERE Supplier_ID=%s",
            (supplier_id,)
        )
        cursor.execute(
            "DELETE FROM Supplier WHERE Supplier_ID=%s",
            (supplier_id,)
        )

        conn.commit()
        return {"message": "Supplier deleted"}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500

    finally:
        cursor.close()
        conn.close()
