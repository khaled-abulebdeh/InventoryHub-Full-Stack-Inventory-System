from db import get_connection
import random
from datetime import datetime, timedelta

def create_orders():
    conn = get_connection()
    cursor = conn.cursor()
    
    customers = [1, 2, 3, 5]
    addresses = [1, 2, 4, 5, 6] # Valid Address IDs from check
    products = [
        {'id': 1, 'price': 89.99},
        {'id': 2, 'price': 120.00},
        {'id': 3, 'price': 45.00},
        {'id': 4, 'price': 3.00}
    ]
    
    statuses = ['PLACED', 'PAID', 'SHIPPED', 'DELIVERED']
    
    try:
        print("Inserting orders...")
        
        for i in range(4):
            cust_id = customers[i % len(customers)]
            addr_id = addresses[i % len(addresses)]
            status = statuses[i % len(statuses)]
            
            # Create Order
            # payment_status/method removed as they are not in schema
            sql = """
                INSERT INTO `Order` 
                (Customer_ID, Address_ID, Order_Status, Shipping_Fee, Created_at, Updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """
            
            shipping_fee = 10.00
            created_at = datetime.now() - timedelta(days=i)
            
            cursor.execute(sql, (
                cust_id, addr_id, status, shipping_fee, created_at
            ))
            
            order_id = cursor.lastrowid
            print(f"Created Order {order_id} for Customer {cust_id} ({status})")
            
            # Create Items
            num_items = random.randint(1, 3)
            
            for _ in range(num_items):
                prod = random.choice(products)
                qty = random.randint(1, 5)
                
                cursor.execute("""
                    INSERT INTO OrderItem
                    (Order_ID, Product_Variant_ID, Quantity, Unit_Price, Tax_Percent, Discount_Percent)
                    VALUES (%s, %s, %s, %s, 0, 0)
                """, (order_id, prod['id'], qty, prod['price']))
                
        conn.commit()
        print("Successfully created 4 orders.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_orders()
