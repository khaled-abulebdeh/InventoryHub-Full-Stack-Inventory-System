from db import get_connection

def check_schema():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DESCRIBE `Order`")
        columns = cursor.fetchall()
        print("Columns in Order table:")
        for col in columns:
            print(col)
    except Exception as e:
        print(e)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_schema()
