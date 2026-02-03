from db import get_connection
import create_shop_data

def reset_db():
    conn = get_connection()
    cursor = conn.cursor()
    print("Resetting database...")
    try:
        # Disable foreign key checks to allow truncation/deletion
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        tables = [
            'OrderItem', 'Payment', 'StockMovement', '`Order`', 
            'Inventory', 'ProductVariant', 'Product', 
            'Brand', 'Category', 'CartItem', 'Cart'
        ]
        
        for table in tables:
            print(f"Clearing {table}...")
            cursor.execute(f"TRUNCATE TABLE {table}")
            
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        print("Database cleared.")
        
    except Exception as e:
        print(f"Error clearing DB: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    reset_db()
    print("\nRe-seeding with Shop Data...")
    create_shop_data.create_shop_data()
