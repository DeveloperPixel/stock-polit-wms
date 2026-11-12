-- Demo data. Default password for all users: Admin@123
INSERT INTO users(name,email,password_hash,role) VALUES
 ('System Admin','admin@wms.local',  crypt('Admin@123', gen_salt('bf',10)),'ADMIN'),
 ('Store Manager','manager@wms.local',crypt('Admin@123', gen_salt('bf',10)),'MANAGER'),
 ('Store Keeper','staff@wms.local',   crypt('Admin@123', gen_salt('bf',10)),'STAFF');

INSERT INTO warehouses(code,name,address,city,manager) VALUES
 ('BLR-01','Bengaluru Central WH','Manyata Tech Park','Bengaluru','Ravi'),
 ('BPL-01','Bhopal Hub','Indrapuri Sector C','Bhopal','Pranjal'),
 ('DEL-01','Delhi DC','Okhla Phase II','Delhi','Amit');

INSERT INTO bin_locations(warehouse_id,code,description) VALUES
 (1,'A-01-01','Fast movers'),(1,'B-02-01','Bulk'),(2,'A-01-01','General');

INSERT INTO categories(name) VALUES ('Electronics'),('Batteries'),('Packaging'),('Spares');

INSERT INTO products(sku,name,category_id,uom,cost_price,sale_price,tax_rate,reorder_level,reorder_qty) VALUES
 ('ELE-ESP32','ESP32 Dev Board',1,'PCS',320,450,18,50,200),
 ('BAT-LI-48V','48V 30Ah Li-ion Pack',2,'PCS',14500,18900,18,5,20),
 ('PKG-BOX-M','Corrugated Box Medium',3,'PCS',18,30,12,200,1000),
 ('SPR-CHG-01','EV Charger Connector Type-2',4,'PCS',2100,2950,18,10,40),
 ('ELE-RELAY','5V Relay Module',1,'PCS',45,80,18,100,500);

INSERT INTO vendors(code,name,contact_person,email,phone,gstin,address,payment_terms_days,rating) VALUES
 ('V-001','Robu Components','Sanjay','sales@robu.example','9800000001','27AAAAA0000A1Z5','Pune',30,4.5),
 ('V-002','PowerCell Energy','Meena','orders@powercell.example','9800000002','29BBBBB1111B1Z2','Bengaluru',45,4.0),
 ('V-003','PackRight Industries','Imran','hello@packright.example','9800000003','23CCCCC2222C1Z9','Indore',15,3.8);

INSERT INTO product_vendors(product_id,vendor_id,vendor_sku,unit_price,lead_time_days,preferred) VALUES
 (1,1,'R-ESP32',310,5,true),(5,1,'R-RLY5',42,5,true),
 (2,2,'PC-48-30',14200,14,true),(4,2,'PC-T2',2050,10,true),
 (3,3,'PR-BM',17,3,true);

INSERT INTO customers(name,email,phone,address) VALUES
 ('NIVASHOP Online','orders@nivashop.example','9811111111','Satna'),
 ('GreenRide Fleet','ops@greenride.example','9822222222','Indore');

-- Opening stock via the ledger (trigger fills stock_levels)
INSERT INTO stock_movements(product_id,warehouse_id,movement,qty,unit_cost,ref_type,note,created_by) VALUES
 (1,1,'OPENING',120,320,'OPEN','Opening balance',1),
 (2,1,'OPENING',8,14500,'OPEN','Opening balance',1),
 (3,1,'OPENING',150,18,'OPEN','Opening balance',1),
 (4,2,'OPENING',25,2100,'OPEN','Opening balance',1),
 (5,1,'OPENING',60,45,'OPEN','Opening balance',1);
