
CREATE DATABASE STORE_DB;
USE STORE_DB;

DROP TABLE IF EXISTS GoodsReceiptItem;
DROP TABLE IF EXISTS GoodsReceipt;
DROP TABLE IF EXISTS PurchaseOrderItem;
DROP TABLE IF EXISTS PurchaseOrder;
DROP TABLE IF EXISTS Supplier;

DROP TABLE IF EXISTS StockMovement;
DROP TABLE IF EXISTS Inventory;

DROP TABLE IF EXISTS CartItem;
DROP TABLE IF EXISTS Cart;
select * from admin;
DROP TABLE IF EXISTS OrderItem;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Bill;
DROP TABLE IF EXISTS `Order`;

DROP TABLE IF EXISTS ProductVariant;
DROP TABLE IF EXISTS Product;
DROP TABLE IF EXISTS Brand;
DROP TABLE IF EXISTS Category;

DROP TABLE IF EXISTS Warehouse;
DROP TABLE IF EXISTS Address;

DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS Admin;
DROP TABLE IF EXISTS `User`;


/* =========================================================
   Admin and Customer
   ========================================================= */
   
CREATE TABLE `Admin` (
  Admin_ID INT PRIMARY KEY AUTO_INCREMENT,
  Full_Name VARCHAR(120) NOT NULL,
  Email VARCHAR(120) NOT NULL UNIQUE,
  Phone VARCHAR(30),
  Password VARCHAR(255) NOT NULL
);

CREATE TABLE Customer (
  Customer_ID INT PRIMARY KEY AUTO_INCREMENT,
  Full_Name VARCHAR(120) NOT NULL,
  Email VARCHAR(120) NOT NULL UNIQUE,
  Phone VARCHAR(30),
  Password VARCHAR(255) NOT NULL,
  Status VARCHAR(30) CHECK (Status in ("ACTIVE", "INACTIVE"))
);


/* =========================================================
   ADDRESS & WAREHOUSE
   ========================================================= */

DROP TABLE Address;

CREATE TABLE Address (
  Address_ID INT AUTO_INCREMENT PRIMARY KEY,
  Address_Line VARCHAR(100) NOT NULL,
  Postal_Code VARCHAR(20) NOT NULL,
  FOREIGN KEY (Postal_Code) REFERENCES PostalLookup(Postal_Code) ON UPDATE CASCADE
);

CREATE TABLE PostalLookup (
  Postal_Code VARCHAR(20) PRIMARY KEY,
  City VARCHAR(40) NOT NULL,
  State_Region VARCHAR(50),
  Country VARCHAR(40) NOT NULL
  );

SHOW CREATE TABLE Address;
SHOW CREATE TABLE PostalLookup\G


CREATE TABLE Warehouse (
  Warehouse_ID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(120) NOT NULL,
  Address_ID INT NOT NULL,
  Phone VARCHAR(30) UNIQUE NOT NULL,
  Email VARCHAR(120) UNIQUE NOT NULL,
  FOREIGN KEY (Address_ID) REFERENCES Address(Address_ID)
    ON UPDATE CASCADE
);


/* =========================================================
   CATEGORY (RECURSIVE) / BRAND / PRODUCT
   ========================================================= */

CREATE TABLE Category (
  Category_ID INT AUTO_INCREMENT PRIMARY KEY,
  Category_Name VARCHAR(50) NOT NULL,
  Description TEXT
);

CREATE TABLE Brand (
  Brand_ID INT AUTO_INCREMENT PRIMARY KEY,
  Brand_Name VARCHAR(60) UNIQUE NOT NULL,
  Description TEXT
);

CREATE TABLE Product (
  Product_ID INT AUTO_INCREMENT PRIMARY KEY,
  Brand_ID INT NOT NULL,
  Category_ID INT NOT NULL,
  Product_Name VARCHAR(50) NOT NULL,
  Description TEXT,
  Visibility CHAR (8) CHECK ( Visibility in ("ACTIVE", "INACTIVE")),
  FOREIGN KEY (Brand_ID) REFERENCES Brand(Brand_ID)
    ON UPDATE CASCADE, 
  FOREIGN KEY (Category_ID) REFERENCES Category(Category_ID)
    ON UPDATE CASCADE 
);



/* =========================================================
   PRODUCT VARIANT
   ========================================================= */

CREATE TABLE ProductVariant (
  Product_Variant_ID INT AUTO_INCREMENT PRIMARY KEY,
  Product_ID INT NOT NULL,
  SKU VARCHAR(50) NOT NULL UNIQUE,
  Color VARCHAR(40),
  Size VARCHAR(40),
  Material VARCHAR(40),
  Unit_Price real NOT NULL,
  Discount_Percent real default 0 check (Discount_percent>=0 and Discount_percent<=1),
  FOREIGN KEY (Product_ID) REFERENCES Product(Product_ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);


/* =========================================================
   INVENTORY & STOCK MOVEMENT
   ========================================================= */

CREATE TABLE Inventory (
  Warehouse_ID INT NOT NULL,
  Product_Variant_ID INT NOT NULL,
  On_Hand_Quantity INT NOT NULL,
  Reorder_Level INT NOT NULL,
  PRIMARY KEY (Warehouse_ID, Product_Variant_ID),
  FOREIGN KEY (Warehouse_ID) REFERENCES Warehouse(Warehouse_ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  FOREIGN KEY (Product_Variant_ID) REFERENCES ProductVariant(Product_Variant_ID)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE StockMovement (
  Movement_ID INT AUTO_INCREMENT PRIMARY KEY,
  Warehouse_ID INT NOT NULL,
  Product_Variant_ID INT NOT NULL,
  Quantity_Change INT NOT NULL,
  Movement_Type VARCHAR(30) NOT NULL CHECK (Movement_Type IN (
				'INBOUND','SALE','RETURN','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT')),
  Reference_Type VARCHAR(20),
  Reference_ID VARCHAR(50),
  Movement_Date DATETIME NOT NULL,
  FOREIGN KEY (Warehouse_ID) REFERENCES Warehouse(Warehouse_ID),
  FOREIGN KEY (Product_Variant_ID) REFERENCES ProductVariant(Product_Variant_ID)
);

/* =========================================================
   CART
   ========================================================= */

CREATE TABLE Cart (
  Cart_ID INT AUTO_INCREMENT PRIMARY KEY,
  Customer_ID INT NOT NULL,
  Status VARCHAR(30) NOT NULL CHECK (Status in ("ACTIVE", "CHECKOUT", "CONVERTED")),
  Created_at DATETIME,
  Updated_at DATETIME,
  FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID)
    ON DELETE CASCADE
);


CREATE TABLE CartItem (
  Cart_ID INT NOT NULL,
  Product_Variant_ID INT NOT NULL,
  Quantity INT NOT NULL,
  Unit_Price real NOT NULL,
  primary key (Cart_ID, Product_Variant_ID),
  FOREIGN KEY (Cart_ID) REFERENCES Cart(Cart_ID) 
  ON DELETE CASCADE,
  FOREIGN KEY (Product_Variant_ID) REFERENCES ProductVariant(Product_Variant_ID)
);


/* =========================================================
   ORDER / BILL / PAYMENT
   ========================================================= */

CREATE TABLE `Order` (
  Order_ID INT AUTO_INCREMENT PRIMARY KEY,
  Customer_ID INT NOT NULL,
  Address_ID INT NOT NULL,
  Order_Status VARCHAR(30) NOT NULL CHECK (Order_Status IN ('PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', "RETURNED")),
  Shipping_Fee real NOT NULL,
  Created_at DATETIME,
  Updated_at DATETIME,
  FOREIGN KEY (Customer_ID) REFERENCES Customer (Customer_ID),
  FOREIGN KEY (Address_ID) REFERENCES Address(Address_ID)
);
show create table `order`;

	
CREATE TABLE OrderItem (
  Order_Item_ID INT AUTO_INCREMENT PRIMARY KEY,
  Order_ID INT NOT NULL,
  Product_Variant_ID INT NOT NULL,
  Quantity INT NOT NULL,
  Unit_Price real NOT NULL,
  Discount_Percent real default 0 check (Discount_percent>=0 and Discount_percent<=1),
  Tax_Percent real default 0 check (Tax_Percent>=0 and Tax_Percent<=1),
  FOREIGN KEY (Order_ID) REFERENCES `Order`(Order_ID)
    ON DELETE CASCADE,
  FOREIGN KEY (Product_Variant_ID) REFERENCES ProductVariant(Product_Variant_ID)
);

CREATE TABLE Bill (
  Bill_ID INT AUTO_INCREMENT PRIMARY KEY,
  Order_ID INT NOT NULL,
  Bill_Number VARCHAR(60) NOT NULL UNIQUE,
  Issue_Date DATE NOT NULL,
  Due_Date DATE NOT NULL,
  Bill_Status VARCHAR(20) CHECK (Bill_Status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')),
  FOREIGN KEY (Order_ID) REFERENCES `Order`(Order_ID)
);
 

CREATE TABLE Payment (
  Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
  Order_ID INT NOT NULL,
  Amount real NOT NULL,
  Method VARCHAR(30) NOT NULL CHECK (Method in ("CASH", "CARD", "BANK_TRANSFER", "WALLET")),
  Status VARCHAR(30) NOT NULL CHECK (Status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  Transaction_Reference VARCHAR(120),
  Processed_At DATETIME NOT NULL,
  Paid_At DATETIME,
  FOREIGN KEY (Order_ID) REFERENCES `Order`(Order_ID)
    ON DELETE CASCADE
);

/* =========================================================
   SUPPLIERS / PURCHASE ORDERS / RECEIPTS
   ========================================================= */

CREATE TABLE Supplier (
  Supplier_ID INT AUTO_INCREMENT PRIMARY KEY,
  Supplier_Name VARCHAR(60) NOT NULL,
  Email Varchar (120) UNIQUE NOT NULL,
  Description TEXT
);


CREATE TABLE Phone_Supplier(
	Supplier_ID INT,
	Phone VARCHAR(30) UNIQUE,
	FOREIGN KEY (Supplier_ID) REFERENCES Supplier (Supplier_ID),
    Primary Key (Supplier_ID, Phone)
);

CREATE TABLE SupplierProductVariant (
  Supplier_ID INT NOT NULL,
  Product_Variant_ID INT NOT NULL,
  Preferred_Flag BOOLEAN DEFAULT FALSE,
  Unit_Cost REAL,
  Lead_Time_Days INT,
  PRIMARY KEY (Supplier_ID, Product_Variant_ID),
  FOREIGN KEY (Supplier_ID) REFERENCES Supplier(Supplier_ID) ON DELETE CASCADE,
  FOREIGN KEY (Product_Variant_ID) REFERENCES ProductVariant(Product_Variant_ID) ON DELETE CASCADE
);


CREATE TABLE PurchaseOrder (
  PO_ID INT AUTO_INCREMENT PRIMARY KEY,
  Supplier_ID INT NOT NULL,
  Created_By_Admin_ID INT NOT NULL,
  Warehouse_ID INT NOT NULL, 
  STATUS VARCHAR(10) NOT NULL CHECK (Status IN  ('PENDING','RECEIVED', 'CANCELLED')),
  Order_Date DATE NOT NULL,
  Estimated_Arrival_Date DATE,
  FOREIGN KEY (Supplier_ID) REFERENCES Supplier(Supplier_ID),
  FOREIGN KEY (Created_By_Admin_ID) REFERENCES `Admin` (Admin_ID),
  FOREIGN KEY (Warehouse_ID) REFERENCES `Warehouse` (Warehouse_ID)
);




CREATE TABLE PurchaseOrderItem (
  PO_ID INT NOT NULL,
  Product_Variant_ID INT NOT NULL,
  Quantity_Ordered INT NOT NULL,
  Unit_Cost real NOT NULL,
  PRIMARY KEY (PO_ID, Product_Variant_ID),
  FOREIGN KEY (PO_ID) REFERENCES PurchaseOrder(PO_ID)
    ON DELETE CASCADE,
  FOREIGN KEY (Product_Variant_ID) REFERENCES ProductVariant(Product_Variant_ID)
);

CREATE TABLE GoodsReceipt (
  Receipt_ID INT AUTO_INCREMENT PRIMARY KEY,
  PO_ID INT NOT NULL UNIQUE, -- Unique to ensure 1-1 
  Received_By_Admin_ID INT NOT NULL,
  Notes TEXT,
  Receipt_Date DATE NOT NULL,
  FOREIGN KEY (PO_ID) REFERENCES PurchaseOrder(PO_ID),
  FOREIGN KEY (Received_By_Admin_ID) REFERENCES Admin(Admin_ID)
  );
  
  select * from payment;
  delete from payment where 1=1;
  select * from `order`;
  SET SQL_SAFE_UPDATES=1;
  update `order` set order_status = "PLACED" where 1=1;
