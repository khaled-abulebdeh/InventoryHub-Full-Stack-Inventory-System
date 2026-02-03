from db import get_connection

def check():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT Count(*) as cnt FROM Warehouse")
    row = c.fetchone()
    print(f"Warehouses found: {row['cnt']}")
    
    if row['cnt'] == 0:
        print("Inserting default warehouse...")
        c.execute("INSERT INTO Address (Address_Line, City, Country) VALUES ('123 Main St', 'New York', 'USA')")
        aid = c.lastrowid
        c.execute("INSERT INTO Warehouse (Name, Address_ID, Phone, Email) VALUES ('Main Warehouse', %s, '555-0101', 'warehouse@example.com')", (aid,))
        conn.commit()
        print("Inserted 'Main Warehouse'.")
    else:
        c.execute("SELECT * FROM Warehouse")
        print(c.fetchall())

    conn.close()

if __name__ == "__main__":
    check()
