from db import get_connection


def authenticate(email, password):
    try:
        print(f"[AUTH DEBUG] Attempting login for email: {email}")
        
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT Admin_ID, Full_Name, Email, Phone, Password FROM Admin WHERE Email=%s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            print(f"[AUTH DEBUG] No user found with email: {email}")
            return None
            
        print(f"[AUTH DEBUG] Found user: {user['Email']}, Admin_ID: {user['Admin_ID']}")
        print(f"[AUTH DEBUG] Stored password: '{user.get('Password')}'")
        print(f"[AUTH DEBUG] Provided password: '{password}'")
        print(f"[AUTH DEBUG] Match: {user.get('Password') == password}")
        
        # plain-text check (current design)
        if user.get("Password") != password:
            print(f"[AUTH DEBUG] Password mismatch!")
            return None

        print(f"[AUTH DEBUG] Password matched! User is admin.")
        
        # Since we queried Admin table directly, this is definitely an admin
        result = {
            "id": user["Admin_ID"],
            "fullName": user["Full_Name"],
            "email": user["Email"],
            "phone": user.get("Phone"),
            "role": "ADMIN",
            "adminId": user["Admin_ID"]  # Admin's ID
        }
        
        print(f"[AUTH DEBUG] Returning result: {result}")
        return result
    except Exception as e:
        print(f"[AUTH DEBUG] Authentication error: {e}")
        return None


def create_user(full_name, email, phone, password, role="USER"):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check email uniqueness in both Admin and Customer tables
        cursor.execute("SELECT 1 FROM Admin WHERE Email=%s", (email,))
        if cursor.fetchone():
            return None, "Email already exists"
        cursor.execute("SELECT 1 FROM Customer WHERE Email=%s", (email,))
        if cursor.fetchone():
            return None, "Email already exists"

        # Insert directly into Admin or Customer table based on role
        if role == "ADMIN":
            cursor.execute(
                "INSERT INTO Admin (Full_Name, Email, Phone, Password) VALUES (%s,%s,%s,%s)",
                (full_name, email, phone, password)
            )
        else:
            cursor.execute(
                "INSERT INTO Customer (Full_Name, Email, Phone, Password, Status) VALUES (%s,%s,%s,%s,%s)",
                (full_name, email, phone, password, "ACTIVE")
            )
        user_id = cursor.lastrowid

        conn.commit()
        return {
            "id": user_id,
            "fullName": full_name,
            "email": email,
            "phone": phone,
            "role": role,
        }, None

    except Exception as e:
        conn.rollback()
        return None, str(e)

    finally:
        cursor.close()
        conn.close()
