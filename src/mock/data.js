export const productosMock = [
  { id: 1, sku: 'PRD-001', nombre: 'Teclado Mecánico', categoria: 'Periféricos', stock: 15, stockMinimo: 10, costo: 120, precio: 180 },
  { id: 2, sku: 'PRD-002', nombre: 'Mouse Inalámbrico', categoria: 'Periféricos', stock: 8, stockMinimo: 12, costo: 45, precio: 70 },
  { id: 3, sku: 'PRD-003', nombre: 'Monitor 24"', categoria: 'Monitores', stock: 4, stockMinimo: 3, costo: 550, precio: 750 },
  { id: 4, sku: 'PRD-004', nombre: 'Laptop 14"', categoria: 'Equipos', stock: 2, stockMinimo: 5, costo: 1800, precio: 2200 },
  { id: 5, sku: 'PRD-005', nombre: 'Disco SSD 1TB', categoria: 'Almacenamiento', stock: 0, stockMinimo: 4, costo: 380, precio: 500 },
]

export const alertasMock = [
  { id: 1, tipo: 'warning', mensaje: 'Mouse Inalámbrico por debajo del stock mínimo.' },
  { id: 2, tipo: 'danger', mensaje: 'Disco SSD 1TB sin stock disponible.' },
  { id: 3, tipo: 'warning', mensaje: 'Laptop 14\" por debajo del stock mínimo.' },
]

export const movimientosMock = [
  { id: 1, fecha: '2026-02-10', productoId: 1, producto: 'Teclado Mecánico', tipo: 'entrada', cantidad: 20, referencia: 'COMP-123' },
  { id: 2, fecha: '2026-02-11', productoId: 2, producto: 'Mouse Inalámbrico', tipo: 'salida', cantidad: 10, referencia: 'VENT-456' },
  { id: 3, fecha: '2026-02-12', productoId: 5, producto: 'Disco SSD 1TB', tipo: 'salida', cantidad: 4, referencia: 'VENT-460' },
  { id: 4, fecha: '2026-02-13', productoId: 4, producto: 'Laptop 14"', tipo: 'salida', cantidad: 3, referencia: 'VENT-470' },
]

export const kardexMock = [
  { id: 1, fecha: '2026-02-10', productoId: 1, producto: 'Teclado Mecánico', tipo: 'entrada', cantidad: 20, saldo: 20 },
  { id: 2, fecha: '2026-02-11', productoId: 2, producto: 'Mouse Inalámbrico', tipo: 'salida', cantidad: 10, saldo: 8 },
  { id: 3, fecha: '2026-02-12', productoId: 5, producto: 'Disco SSD 1TB', tipo: 'salida', cantidad: 4, saldo: 0 },
  { id: 4, fecha: '2026-02-13', productoId: 4, producto: 'Laptop 14"', tipo: 'salida', cantidad: 3, saldo: 2 },
  { id: 5, fecha: '2026-02-14', productoId: 3, producto: 'Monitor 24"', tipo: 'entrada', cantidad: 2, saldo: 4 },
]
