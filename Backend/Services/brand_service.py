from db import get_connection

# GET ALL BRANDS
# =========================
def get_all_brands():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT Brand_ID, Brand_Name, Description
        FROM Brand
        ORDER BY Brand_Name
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return rows


# CREATE BRAND
# =========================
def create_brand(data):
    name = data.get("name")
    description = data.get("description")

    if not name or not name.strip():
        return {"error": "Brand name is required"}, 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO Brand (Brand_Name, Description)
            VALUES (%s, %s)
            """,
            (name.strip(), description)
        )
        conn.commit()

        return {
            "Brand_ID": cursor.lastrowid,
            "Brand_Name": name.strip(),
            "Description": description
        }, 201

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500

    finally:
        cursor.close()
        conn.close()


# UPDATE BRAND
# =========================
def update_brand(brand_id, data):
    name = data.get("name")
    description = data.get("description")

    if not name or not name.strip():
        return {"error": "Brand name is required"}, 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE Brand
        SET Brand_Name=%s, Description=%s
        WHERE Brand_ID=%s
        """,
        (name.strip(), description, brand_id)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "Brand_ID": brand_id,
        "Brand_Name": name.strip(),
        "Description": description
    }, 200
