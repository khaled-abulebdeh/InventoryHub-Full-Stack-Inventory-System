from db import get_connection

# GET ALL
# =========================
def get_all_categories():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT Category_ID, Category_Name, Description
        FROM Category
        ORDER BY Category_Name
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return rows


# CREATE
# =========================
def create_category(data):
    name = data.get("name")
    description = data.get("description")

    if not name or not name.strip():
        return {"error": "Category name is required"}, 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO Category (Category_Name, Description)
            VALUES (%s, %s)
            """,
            (name.strip(), description)
        )
        conn.commit()

        return {
            "Category_ID": cursor.lastrowid,
            "Category_Name": name.strip(),
            "Description": description
        }, 201

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500

    finally:
        cursor.close()
        conn.close()


# UPDATE
# =========================
def update_category(category_id, data):
    name = data.get("name")
    description = data.get("description")

    if not name or not name.strip():
        return {"error": "Category name is required"}, 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE Category
        SET Category_Name=%s, Description=%s
        WHERE Category_ID=%s
        """,
        (name.strip(), description, category_id)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "Category_ID": category_id,
        "Category_Name": name.strip(),
        "Description": description
    }, 200
