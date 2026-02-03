from db import get_connection

def create_shop_data():
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        print("Creating housewares shop data...")
        
        # ============ BRANDS ============
        brands = ['Riedel', 'Zwilling', 'Le Creuset', 'Pyrex', 'Victorinox']
        brand_ids = {}
        for brand in brands:
            cursor.execute("INSERT IGNORE INTO Brand (Brand_Name) VALUES (%s)", (brand,))
            cursor.execute("SELECT Brand_ID FROM Brand WHERE Brand_Name = %s", (brand,))
            brand_ids[brand] = cursor.fetchone()['Brand_ID']
        print(f"Brands created: {list(brand_ids.keys())}")
        
        # ============ CATEGORIES ============
        categories = ['Glassware', 'Knives', 'Cookware', 'Tableware']
        cat_ids = {}
        for cat in categories:
            cursor.execute("INSERT IGNORE INTO Category (Category_Name) VALUES (%s)", (cat,))
            cursor.execute("SELECT Category_ID FROM Category WHERE Category_Name = %s", (cat,))
            cat_ids[cat] = cursor.fetchone()['Category_ID']
        print(f"Categories created: {list(cat_ids.keys())}")
        
        # ============ PRODUCTS ============
        products = [
            ('Wine Glass Set', 'Riedel', 'Glassware', 'Crystal wine glasses, set of 4', 89.99),
            ('Champagne Flutes', 'Riedel', 'Glassware', 'Elegant champagne glasses, set of 6', 120.00),
            ('Whiskey Tumbler', 'Riedel', 'Glassware', 'Heavy base whiskey glasses, set of 2', 45.00),
            ('Chef Knife 8"', 'Zwilling', 'Knives', 'Professional chef knife, German steel', 149.99),
            ('Knife Block Set', 'Zwilling', 'Knives', 'Complete 7-piece knife set with block', 299.99),
            ('Paring Knife', 'Victorinox', 'Knives', '3.5 inch paring knife, Swiss made', 24.99),
            ('Dutch Oven', 'Le Creuset', 'Cookware', '5.5 qt enameled cast iron, various colors', 349.99),
            ('Casserole Dish', 'Pyrex', 'Cookware', '3 qt glass baking dish with lid', 29.99),
            ('Dinner Plate Set', 'Le Creuset', 'Tableware', 'Stoneware plates, set of 4', 89.99),
            ('Mixing Bowl Set', 'Pyrex', 'Tableware', '3-piece glass mixing bowls', 39.99),
        ]
        
        product_ids = {}
        for name, brand, cat, desc, price in products:
            cursor.execute("""
                INSERT INTO Product (Brand_ID, Category_ID, Product_Name, Description, Visibility)
                SELECT %s, %s, %s, %s, 'ACTIVE'
                WHERE NOT EXISTS (SELECT 1 FROM Product WHERE Product_Name = %s)
            """, (brand_ids[brand], cat_ids[cat], name, desc, name))
            cursor.execute("SELECT Product_ID FROM Product WHERE Product_Name = %s", (name,))
            product_ids[name] = cursor.fetchone()['Product_ID']
        print(f"Products created: {len(product_ids)}")
        
        # ============ VARIANTS ============
        variants = [
            # Glassware
            ('Wine Glass Set', 'WINE-CLR-4', 'Clear', 'Set of 4', 89.99),
            ('Champagne Flutes', 'CHAMP-CLR-6', 'Clear', 'Set of 6', 120.00),
            ('Whiskey Tumbler', 'WHSKY-CLR-2', 'Clear', 'Set of 2', 45.00),
            # Knives
            ('Chef Knife 8"', 'CHEF8-BLK', 'Black Handle', '8 inch', 149.99),
            ('Chef Knife 8"', 'CHEF8-WHT', 'White Handle', '8 inch', 149.99),
            ('Knife Block Set', 'KBLOCK-7PC', 'Natural Wood', '7 Piece', 299.99),
            ('Paring Knife', 'PARING-RED', 'Red Handle', '3.5 inch', 24.99),
            ('Paring Knife', 'PARING-BLK', 'Black Handle', '3.5 inch', 24.99),
            # Cookware
            ('Dutch Oven', 'DUTCH-RED', 'Cherry Red', '5.5 qt', 349.99),
            ('Dutch Oven', 'DUTCH-BLU', 'Marine Blue', '5.5 qt', 349.99),
            ('Dutch Oven', 'DUTCH-WHT', 'White', '5.5 qt', 349.99),
            ('Casserole Dish', 'CASS-3QT', 'Clear', '3 qt', 29.99),
            # Tableware
            ('Dinner Plate Set', 'PLATE-WHT-4', 'White', 'Set of 4', 89.99),
            ('Dinner Plate Set', 'PLATE-BLU-4', 'Caribbean Blue', 'Set of 4', 89.99),
            ('Mixing Bowl Set', 'BOWL-3PC', 'Clear', '3 Piece', 39.99),
        ]
        
        variant_ids = {}
        for prod_name, sku, color, size, price in variants:
            prod_id = product_ids[prod_name]
            cursor.execute("SELECT Product_Variant_ID FROM ProductVariant WHERE SKU = %s", (sku,))
            existing = cursor.fetchone()
            if existing:
                variant_ids[sku] = existing['Product_Variant_ID']
            else:
                cursor.execute("""
                    INSERT INTO ProductVariant (Product_ID, SKU, Color, Size, Unit_Price, Discount_Percent)
                    VALUES (%s, %s, %s, %s, %s, 0)
                """, (prod_id, sku, color, size, price))
                variant_ids[sku] = cursor.lastrowid
        print(f"Variants created: {len(variant_ids)}")
        
        # ============ INVENTORY ============
        cursor.execute("SELECT Warehouse_ID FROM Warehouse LIMIT 1")
        wh = cursor.fetchone()
        wh_id = wh['Warehouse_ID'] if wh else 1
        
        for sku, var_id in variant_ids.items():
            cursor.execute("""
                INSERT INTO Inventory (Warehouse_ID, Product_Variant_ID, On_Hand_Quantity, Reorder_Level)
                VALUES (%s, %s, 25, 5)
                ON DUPLICATE KEY UPDATE On_Hand_Quantity = On_Hand_Quantity + 25
            """, (wh_id, var_id))
        print(f"Inventory updated for {len(variant_ids)} variants")
        
        # ============ NEW CUSTOMER ============
        cursor.execute("SELECT Customer_ID FROM Customer WHERE Email = 'ahmed.restaurant@example.com'")
        cust = cursor.fetchone()
        if not cust:
            cursor.execute("""
                INSERT INTO Customer (Full_Name, Email, Phone, Password, Status)
                VALUES ('Ahmed - Fine Dining', 'ahmed.restaurant@example.com', '555-8888', 'hashedpw', 'ACTIVE')
            """)
            cust_id = cursor.lastrowid
        else:
            cust_id = cust['Customer_ID']
        
        # ============ ADDRESS ============
        cursor.execute("INSERT INTO PostalLookup (Postal_Code, City, State_Region, Country) VALUES ('11183', 'Amman', 'Amman', 'Jordan') ON DUPLICATE KEY UPDATE City=City")
        cursor.execute("SELECT Address_ID FROM Address WHERE Address_Line = '7th Circle, Al-Gardens St' AND Postal_Code = '11183'")
        addr = cursor.fetchone()
        if not addr:
            cursor.execute("INSERT INTO Address (Address_Line, Postal_Code) VALUES ('7th Circle, Al-Gardens St', '11183')")
            addr_id = cursor.lastrowid
        else:
            addr_id = addr['Address_ID']
        
        # ============ COMPLEX ORDER ============
        cursor.execute("""
            INSERT INTO `Order` (Customer_ID, Address_ID, Order_Status, Shipping_Fee, Created_at)
            VALUES (%s, %s, 'PLACED', 15.00, NOW())
        """, (cust_id, addr_id))
        order_id = cursor.lastrowid
        
        # Restaurant order: wines glasses, knives, dutch oven
        order_items = [
            ('WINE-CLR-4', 6, 89.99),    # 6 sets of wine glasses
            ('CHEF8-BLK', 3, 149.99),     # 3 chef knives
            ('PARING-RED', 5, 24.99),     # 5 paring knives
            ('DUTCH-RED', 2, 349.99),     # 2 dutch ovens
            ('PLATE-WHT-4', 10, 89.99),   # 10 plate sets
        ]
        
        for sku, qty, price in order_items:
            cursor.execute("""
                INSERT INTO OrderItem (Order_ID, Product_Variant_ID, Quantity, Unit_Price)
                VALUES (%s, %s, %s, %s)
            """, (order_id, variant_ids[sku], qty, price))
        
        conn.commit()
        
        total = sum(qty * price for sku, qty, price in order_items) + 15.00
        
        print(f"\nOrder #{order_id} created!")
        print(f"Customer: Ahmed - Fine Dining")
        print(f"Items: {len(order_items)} line items")
        print(f"Total: ${total:.2f}")
        print(f"Status: PLACED")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_shop_data()
