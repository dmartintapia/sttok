-- Datos de prueba (requiere que existan categorías, unidades y depósitos)
INSERT INTO inventory_product (sku, name, category_id, unit_id, stock_minimum, average_cost, created_at, updated_at)
VALUES ('SKU-001', 'Mouse inalámbrico', 1, 1, 5, 0, NOW(), NOW());

INSERT INTO inventory_client (name, email, phone, created_at, updated_at)
VALUES ('Cliente Demo', 'cliente@example.com', '1111-2222', NOW(), NOW());

INSERT INTO inventory_supplier (name, email, phone, created_at, updated_at)
VALUES ('Proveedor Demo', 'proveedor@example.com', '3333-4444', NOW(), NOW());
