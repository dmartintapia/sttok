-- Tablas base de ejemplo para iniciar el sistema
INSERT INTO inventory_category (name, created_at, updated_at) VALUES ('Electrónica', NOW(), NOW());
INSERT INTO inventory_unit (name, symbol, created_at, updated_at) VALUES ('Unidad', 'u', NOW(), NOW());
INSERT INTO inventory_deposit (name, location, created_at, updated_at) VALUES ('Central', 'Casa matriz', NOW(), NOW());
