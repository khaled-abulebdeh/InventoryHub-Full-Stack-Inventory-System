import pymysql

def get_connection():
    return pymysql.connect(
        host="127.0.0.1",
        user="root",
        password="root",
        database="STORE_DB",
        port=3306,
        connect_timeout=5,
        cursorclass=pymysql.cursors.DictCursor
    )
