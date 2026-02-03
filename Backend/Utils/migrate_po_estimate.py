import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db import get_connection

def migrate():
    print("Migrating PurchaseOrder table...")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check if column exists
        cursor.execute("SHOW COLUMNS FROM PurchaseOrder LIKE 'Estimated_Arrival_Date'")
        if not cursor.fetchone():
            print("Adding Estimated_Arrival_Date column...")
            cursor.execute("ALTER TABLE PurchaseOrder ADD COLUMN Estimated_Arrival_Date DATE")
            conn.commit()
            print("Column added.")
        else:
            print("Column already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
