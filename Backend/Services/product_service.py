from db import get_connection
import logging



# GET FILTERED PRODUCTS (Also, gets all products if no filters are applied)
# Filters are passed from Controller 
# ==========================================
def get_filtered_products(filters):
    """
    Advanced product filtering using SQL queries.
    Supports filters:
    - brand_id: Filter by specific brand
    - category_id: Filter by specific category
    - visibility: Filter by ACTIVE/INACTIVE
    - min_price: Minimum price for variants
    - max_price: Maximum price for variants
    - min_stock: Minimum total stock across all warehouses
    - max_stock: Maximum total stock across all warehouses
    - has_discount: Filter products with discounted variants (True/False)
    - search: Text search in product name and description
    - sku_search: Search by SKU
    - sort_by: Sort field (name, price, stock, variant_count)
    - sort_order: ASC or DESC
    """
    logging.warning("ENTERING get_filtered_products")
    conn = get_connection()
    cursor = conn.cursor()

    # Base query with stock information
    query = """
        SELECT DISTINCT
            p.Product_ID,
            p.Product_Name,
            p.Description,
            p.Visibility,
            b.Brand_Name,
            b.Brand_ID,
            c.Category_Name,
            c.Category_ID,
            COUNT(DISTINCT pv.Product_Variant_ID) AS Variant_Count,
            MIN(pv.Unit_Price * (1 - pv.Discount_Percent)) AS Min_Price,
            MAX(pv.Unit_Price * (1 - pv.Discount_Percent)) AS Max_Price,
            COALESCE(SUM(inv.On_Hand_Quantity), 0) AS Total_Stock
        FROM Product p
        JOIN Brand b ON p.Brand_ID = b.Brand_ID
        JOIN Category c ON p.Category_ID = c.Category_ID
        LEFT JOIN ProductVariant pv ON p.Product_ID = pv.Product_ID
        LEFT JOIN Inventory inv ON pv.Product_Variant_ID = inv.Product_Variant_ID
    """

    # Build WHERE clause dynamically
    where_conditions = []
    params = []

    # Brand filter
    if filters.get('brand_id'):
        where_conditions.append("p.Brand_ID = %s")
        params.append(filters['brand_id'])

    # Category filter
    if filters.get('category_id'):
        where_conditions.append("p.Category_ID = %s")
        params.append(filters['category_id'])

    # Visibility filter
    if filters.get('visibility'):
        where_conditions.append("p.Visibility = %s")
        params.append(filters['visibility'])

    # Text search filter (searches in product name and description)
    if filters.get('search'):
        search_term = f"%{filters['search']}%"
        where_conditions.append("(p.Product_Name LIKE %s OR p.Description LIKE %s)")
        params.extend([search_term, search_term])

    # SKU search filter
    if filters.get('sku_search'):
        sku_term = f"%{filters['sku_search']}%"
        where_conditions.append("pv.SKU LIKE %s")
        params.append(sku_term)

    # Has discount filter
    if filters.get('has_discount') is not None:
        if filters['has_discount']:
            where_conditions.append("pv.Discount_Percent > 0")
        else:
            where_conditions.append("(pv.Discount_Percent = 0 OR pv.Discount_Percent IS NULL)")

    # Add WHERE clause if conditions exist
    if where_conditions:
        query += " WHERE " + " AND ".join(where_conditions)

    # GROUP BY clause
    query += """
        GROUP BY
            p.Product_ID,
            p.Product_Name,
            p.Description,
            p.Visibility,
            b.Brand_Name,
            b.Brand_ID,
            c.Category_Name,
            c.Category_ID
    """

    # HAVING clause for price and stock filters (applied after aggregation)
    having_conditions = []

    # Price range filters
    if filters.get('min_price') is not None:
        having_conditions.append("MIN(pv.Unit_Price * (1 - pv.Discount_Percent / 100.0)) >= %s")
        params.append(filters['min_price'])

    if filters.get('max_price') is not None:
        having_conditions.append("MAX(pv.Unit_Price * (1 - pv.Discount_Percent / 100.0)) <= %s")
        params.append(filters['max_price'])

    # Stock range filters
    if filters.get('min_stock') is not None:
        having_conditions.append("COALESCE(SUM(inv.On_Hand_Quantity), 0) >= %s")
        params.append(filters['min_stock'])

    if filters.get('max_stock') is not None:
        having_conditions.append("COALESCE(SUM(inv.On_Hand_Quantity), 0) <= %s")
        params.append(filters['max_stock'])

    # Add HAVING clause if conditions exist
    if having_conditions:
        query += " HAVING " + " AND ".join(having_conditions)

    # ORDER BY clause
    sort_by = filters.get('sort_by', 'name')
    sort_order = filters.get('sort_order', 'ASC').upper()

    # Validate sort order
    if sort_order not in ['ASC', 'DESC']:
        sort_order = 'ASC'

    # Map sort fields
    sort_mapping = {
        'name': 'p.Product_Name',
        'price': 'Min_Price',
        'stock': 'Total_Stock',
        'variant_count': 'Variant_Count',
        'brand': 'b.Brand_Name',
        'category': 'c.Category_Name'
    }

    sort_field = sort_mapping.get(sort_by, 'p.Product_Name')
    query += f" ORDER BY {sort_field} {sort_order}"

    logging.warning(f"DEBUG QUERY: {query}")
    # Execute query
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Normalize numeric values
    for r in rows:
        r["Variant_Count"] = int(r["Variant_Count"]) if r.get("Variant_Count") else 0
        r["Total_Stock"] = int(r["Total_Stock"]) if r.get("Total_Stock") else 0
        r["Min_Price"] = float(r["Min_Price"]) if r.get("Min_Price") is not None else 0.0
        r["Max_Price"] = float(r["Max_Price"]) if r.get("Max_Price") is not None else 0.0

    return rows


# GET ALL PRODUCTS (Unused, but kept for reference)
# =========================
def get_all_products():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            p.Product_ID,
            p.Product_Name,
            p.Description,
            p.Visibility,
            b.Brand_Name,
            c.Category_Name,
            COUNT(pv.Product_Variant_ID) AS Variant_Count
        FROM Product p
        JOIN Brand b ON p.Brand_ID = b.Brand_ID
        JOIN Category c ON p.Category_ID = c.Category_ID
        LEFT JOIN ProductVariant pv ON p.Product_ID = pv.Product_ID
        GROUP BY
            p.Product_ID,
            p.Product_Name,
            p.Description,
            p.Visibility,
            b.Brand_Name,
            c.Category_Name
        ORDER BY p.Product_Name
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    #  IMPORTANT: MySQL COUNT may return Decimal
    for r in rows:
        r["Variant_Count"] = int(r["Variant_Count"])

    return rows


# GET ONE PRODUCT
# =========================
def get_product(product_id):
    conn = get_connection()
    cursor = conn.cursor()

# Get product info
    cursor.execute("""
        SELECT 
            p.Product_ID,
            p.Product_Name,
            p.Description,
            p.Visibility,
            b.Brand_Name,
            c.Category_Name
        FROM Product p
        JOIN Brand b ON p.Brand_ID = b.Brand_ID
        JOIN Category c ON p.Category_ID = c.Category_ID
        WHERE p.Product_ID = %s
    """, (product_id,))

    product = cursor.fetchone()
    if not product:
        cursor.close()
        conn.close()
        return None

    # Get product variants
    cursor.execute("""
        SELECT 
            Product_Variant_ID,
            SKU,
            Color,
            Size,
            Material,
            Unit_Price,
            Discount_Percent
        FROM ProductVariant
        WHERE Product_ID = %s
        ORDER BY Product_Variant_ID
    """, (product_id,))

    product["Variants"] = cursor.fetchall()

    cursor.close()
    conn.close()
    return product


# CREATE PRODUCT
# =========================
def create_product(data):
    name = (data.get("name") or "").strip()
    brand_id = data.get("brand_id")
    category_id = data.get("category_id")
    description = data.get("description")
    visibility = data.get("visibility", "ACTIVE")
    variants = data.get("variants", [])

    if not name:
        return {"error": "Product name is required"}

    if not brand_id or not category_id:
        return {"error": "Brand and category are required"}

    if not variants:
        return {"error": "At least one variant is required"}

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO Product
            (Brand_ID, Category_ID, Product_Name, Description, Visibility)
            VALUES (%s, %s, %s, %s, %s)
        """, (brand_id, category_id, name, description, visibility))

        product_id = cursor.lastrowid

        # Create product variants
        for v in variants:
            sku = (v.get("sku") or "").strip().upper()
            price = v.get("price")  # This is the Base Selling Price for customers
            discount = v.get("discount_percent", 0) # This is the Customer Discount percentage

            if not sku:
                return {"error": "SKU is required"}

            if price is None or float(price) <= 0:
                return {"error": f"Invalid price for SKU {sku}"}

            if discount < 0 or discount > 100:
                return {"error": f"Invalid discount for SKU {sku}"}

            #  SKU DUPLICATE CHECK (CLEAR MESSAGE)
            cursor.execute(
                "SELECT 1 FROM ProductVariant WHERE SKU = %s",
                (sku,)
            )
            if cursor.fetchone():
                return {
                    "error": f"SKU already exists: {sku}"
                }

            cursor.execute("""
                INSERT INTO ProductVariant
                (Product_ID, SKU, Color, Size, Material, Unit_Price, Discount_Percent)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (
                product_id,
                sku,
                v.get("color"),
                v.get("size"),
                v.get("material"),
                price,
                discount
            ))


        conn.commit()
        return {"Product_ID": product_id}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# UPDATE PRODUCT
# =========================
def update_product(product_id, data):
    name = (data.get("name") or "").strip()
    description = data.get("description")
    visibility = data.get("visibility")

    if not name:
        return {"error": "Product name required"}

    if visibility not in ("ACTIVE", "INACTIVE"):
        return {"error": "Invalid visibility"}

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE Product
        SET Product_Name=%s,
            Description=%s,
            Visibility=%s
        WHERE Product_ID=%s
    """, (name, description, visibility, product_id))

    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Product updated"}


# DELETE PRODUCT (Hardcoded safety checks)
# =========================
def delete_product(product_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Check Stock Movement
        cursor.execute("""
            SELECT 1 FROM StockMovement sm
            JOIN ProductVariant pv ON sm.Product_Variant_ID = pv.Product_Variant_ID
            WHERE pv.Product_ID = %s LIMIT 1
        """, (product_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Product has variants in Stock Movements"}

        # 2. Check Purchase Orders
        cursor.execute("""
            SELECT 1 FROM PurchaseOrderItem poi
            JOIN ProductVariant pv ON poi.Product_Variant_ID = pv.Product_Variant_ID
            WHERE pv.Product_ID = %s LIMIT 1
        """, (product_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Product has variants in Purchase Orders"}

        # 3. Check Order Items (Customer)
        cursor.execute("""
            SELECT 1 FROM OrderItem oi
            JOIN ProductVariant pv ON oi.Product_Variant_ID = pv.Product_Variant_ID
            WHERE pv.Product_ID = %s LIMIT 1
        """, (product_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Product has variants in Customer Orders"}

        # 4. Check Cart Items
        cursor.execute("""
            SELECT 1 FROM CartItem ci
            JOIN ProductVariant pv ON ci.Product_Variant_ID = pv.Product_Variant_ID
            WHERE pv.Product_ID = %s LIMIT 1
        """, (product_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Product has variants in Carts"}

        # 5. Check Supplier Links
        cursor.execute("""
            SELECT 1 FROM SupplierProductVariant sp
            JOIN ProductVariant pv ON sp.Product_Variant_ID = pv.Product_Variant_ID
            WHERE pv.Product_ID = %s LIMIT 1
        """, (product_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Product has variants linked to Suppliers"}

        # 6. Check Inventory Records
        cursor.execute("""
            SELECT 1 FROM Inventory i
            JOIN ProductVariant pv ON i.Product_Variant_ID = pv.Product_Variant_ID
            WHERE pv.Product_ID = %s LIMIT 1
        """, (product_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Product has variants in Inventory"}

        # If all clear, hard delete
        cursor.execute("DELETE FROM ProductVariant WHERE Product_ID=%s", (product_id,))
        cursor.execute("DELETE FROM Product WHERE Product_ID=%s", (product_id,))
        conn.commit()
        return {"message": "Product and variants deleted successfully"}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()

# ADD PRODUCT VARIANT (Hardcoded safety checks)
# =========================
def add_product_variant(product_id, data):
    sku = (data.get("sku") or "").strip().upper()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT 1 FROM ProductVariant WHERE SKU=%s", (sku,))
    if cursor.fetchone():
        return {"error": f"SKU already exists: {sku}"}

    cursor.execute("""
        INSERT INTO ProductVariant
        (Product_ID, SKU, Color, Size, Material, Unit_Price, Discount_Percent)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (
        product_id,
        sku,
        data.get("color"),
        data.get("size"),
        data.get("material"),
        data.get("price"),          # Customer Selling Price
        data.get("discount_percent", 0), # Customer Discount
    ))

    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Variant added"}

# UPDATE PRODUCT VARIANT (Hardcoded safety checks)
# =========================
def update_product_variant(product_id, variant_id, data):
    sku = (data.get("sku") or "").strip().upper()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 1 FROM ProductVariant
        WHERE SKU=%s AND Product_Variant_ID!=%s
    """, (sku, variant_id))

    if cursor.fetchone():
        return {"error": f"SKU already exists: {sku}"}

    cursor.execute("""
        UPDATE ProductVariant
        SET SKU=%s, Color=%s, Size=%s, Material=%s,
            Unit_Price=%s, Discount_Percent=%s
        WHERE Product_Variant_ID=%s AND Product_ID=%s
    """, (
        sku,
        data.get("color"),
        data.get("size"),
        data.get("material"),
        data.get("price"),          # Customer Selling Price
        data.get("discount_percent", 0), # Customer Discount
        variant_id,
        product_id
    ))

    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Variant updated"}

# DELETE PRODUCT VARIANT (Hardcoded safety checks)
# =========================
def delete_product_variant(product_id, variant_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # 1. Check Stock Movement
        cursor.execute("SELECT 1 FROM StockMovement WHERE Product_Variant_ID = %s LIMIT 1", (variant_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Variant exists in Stock Movements"}

        # 2. Check Purchase Orders
        cursor.execute("SELECT 1 FROM PurchaseOrderItem WHERE Product_Variant_ID = %s LIMIT 1", (variant_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Variant exists in Purchase Orders"}

        # 3. Check Customer Orders
        cursor.execute("SELECT 1 FROM OrderItem WHERE Product_Variant_ID = %s LIMIT 1", (variant_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Variant exists in Customer Orders"}

        # 4. Check Carts
        cursor.execute("SELECT 1 FROM CartItem WHERE Product_Variant_ID = %s LIMIT 1", (variant_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Variant exists in Carts"}

        # 5. Check Supplier Links
        cursor.execute("SELECT 1 FROM SupplierProductVariant WHERE Product_Variant_ID = %s LIMIT 1", (variant_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Variant is linked to Suppliers"}

        # 6. Check Inventory
        cursor.execute("SELECT 1 FROM Inventory WHERE Product_Variant_ID = %s LIMIT 1", (variant_id,))
        if cursor.fetchone():
            return {"error": "Cannot delete: Variant exists in Inventory"}

        # If all clear, delete
        cursor.execute("""
            DELETE FROM ProductVariant
            WHERE Product_Variant_ID=%s AND Product_ID=%s
        """, (variant_id, product_id))

        conn.commit()
        return {"message": "Variant deleted successfully"}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()

# Not used yet
def get_all_product_variants():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            pv.Product_Variant_ID,
            pv.SKU,
            pv.Unit_Price,
            pv.Discount_Percent,
            pv.Product_ID,
            p.Product_Name
        FROM ProductVariant pv
        JOIN Product p ON pv.Product_ID = p.Product_ID
        ORDER BY pv.Product_Variant_ID
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # normalize numeric
    for r in rows:
        r["Unit_Price"] = float(r["Unit_Price"]) if r.get("Unit_Price") is not None else 0

    return rows
