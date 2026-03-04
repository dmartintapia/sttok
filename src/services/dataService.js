const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')
const AUTH_STORAGE_KEY = 'sttok_auth_session'

const unwrapList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toDateOnly = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

const extractApiErrorMessage = (data) => {
  if (!data) return null
  if (typeof data === 'string') return data
  if (Array.isArray(data) && data.length) return String(data[0])
  if (typeof data !== 'object') return null

  if (data.detail) return String(data.detail)
  if (data.error) return String(data.error)

  const priorityKeys = ['non_field_errors', 'message', 'notes', 'quantity', 'product', 'deposit']
  for (const key of priorityKeys) {
    if (key in data) {
      const value = data[key]
      if (Array.isArray(value) && value.length) return String(value[0])
      if (value !== null && value !== undefined && value !== '') return String(value)
    }
  }

  for (const value of Object.values(data)) {
    const nested = extractApiErrorMessage(value)
    if (nested) return nested
  }
  return null
}

async function apiFetch(path, options = {}) {
  const session = getAuthSession()
  const authHeaders = session?.access ? { Authorization: `Bearer ${session.access}` } : {}
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    if (response.status === 401 && session?.access) {
      clearAuthSession()
      window.dispatchEvent(new CustomEvent('auth:expired'))
      throw new Error('Sesion expirada. Inicia sesion nuevamente.')
    }
    const detail = extractApiErrorMessage(data) || 'Error de API'
    throw new Error(detail)
  }

  return data
}

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function hasAuthSession() {
  return Boolean(getAuthSession()?.access)
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('auth:changed'))
}

export async function login({ company, username, password }) {
  const data = await apiFetch('/auth/login/', {
    method: 'POST',
    body: { company, username, password },
    headers: {},
  })
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new CustomEvent('auth:changed'))
  return data
}

export async function signup({ companyName, companyCode, email, username, password, captchaToken = '' }) {
  const data = await apiFetch('/auth/signup/', {
    method: 'POST',
    body: {
      company_name: companyName,
      company_code: companyCode,
      email,
      username,
      password,
      captcha_token: captchaToken,
    },
    headers: {},
  })
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new CustomEvent('auth:changed'))
  return data
}

export async function getCurrentSessionProfile() {
  const me = await apiFetch('/auth/me/')
  const session = getAuthSession()
  const merged = { ...(session || {}), ...me }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged))
  return merged
}

export async function getCompanyUsers() {
  const rows = unwrapList(await apiFetch('/auth/users/'))
  return rows.map((row) => ({
    id: Number(row.id),
    username: row.username,
    role: row.role,
    companyCode: row.company_code,
  }))
}

export async function createCompanyUser({ username, password, role }) {
  const created = await apiFetch('/auth/users/', {
    method: 'POST',
    body: { username, password, role },
  })
  return {
    id: Number(created.id),
    username: created.username,
    role: created.role,
    companyCode: created.company_code,
  }
}

async function getCategoriesMap() {
  const categories = unwrapList(await apiFetch('/categories/'))
  return Object.fromEntries(categories.map((c) => [c.id, c.name]))
}

async function getDepositsMap() {
  const deposits = unwrapList(await apiFetch('/deposits/'))
  return {
    map: Object.fromEntries(deposits.map((d) => [d.id, d.name])),
    rows: deposits,
  }
}

async function getStockByProduct() {
  const summary = unwrapList(await apiFetch('/dashboard/summary/'))
  const byProduct = {}

  summary.forEach((row) => {
    const productId = Number(row.product_id)
    const depositId = String(row.deposit_id)
    const qty = toNumber(row.current_stock)

    if (!byProduct[productId]) {
      byProduct[productId] = { total: 0, distribucion: {} }
    }

    byProduct[productId].total += qty
    byProduct[productId].distribucion[depositId] = qty
  })

  return byProduct
}

async function ensureDefaultUnit() {
  const units = unwrapList(await apiFetch('/units/'))
  const existing = units.find((u) => u.symbol?.toLowerCase() === 'u') || units[0]
  if (existing) return existing.id

  const created = await apiFetch('/units/', {
    method: 'POST',
    body: { name: 'Unidad', symbol: 'u' },
  })
  return created.id
}

async function ensureDefaultDeposit() {
  const deposits = unwrapList(await apiFetch('/deposits/'))
  const existing = deposits[0]
  if (existing) return existing.id

  const created = await apiFetch('/deposits/', {
    method: 'POST',
    body: { name: 'Central', location: 'Principal' },
  })
  return created.id
}

async function resolveDepositId(rawId) {
  const parsed = Number(rawId)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return ensureDefaultDeposit()
}

async function ensureCategoryId(categoryName) {
  const cleanName = (categoryName || '').trim()
  if (!cleanName) throw new Error('Debes seleccionar una categoría.')

  const categories = unwrapList(await apiFetch('/categories/'))
  const existing = categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase())
  if (existing) return existing.id

  const created = await apiFetch('/categories/', {
    method: 'POST',
    body: { name: cleanName },
  })
  return created.id
}

function apiTypeToUiType(movementType, notes = '') {
  if (movementType === 'PURCHASE') return 'entrada'
  if (movementType === 'ADJUSTMENT') return 'ajuste'
  if (movementType === 'SALE') {
    const normalizedNotes = String(notes || '').toLowerCase()
    if (
      normalizedNotes.includes('robo') ||
      normalizedNotes.includes('rotura') ||
      normalizedNotes.includes('vencimiento') ||
      normalizedNotes.includes('ajuste')
    ) {
      return 'ajuste'
    }
    return 'salida'
  }
  return 'entrada'
}

function uiTypeToApiType(type) {
  if (type === 'entrada') return 'PURCHASE'
  if (type === 'salida') return 'SALE'
  return 'PURCHASE'
}

function buildMovementNotes({ motivo, referencia }) {
  const m = String(motivo || '').trim()
  const r = String(referencia || '').trim()
  if (!m && !r) return ''
  return `MOTIVO::${m}||REF::${r}`
}

function parseMovementNotes(notes) {
  const raw = String(notes || '')
  if (!raw.includes('MOTIVO::') && !raw.includes('REF::')) {
    return { motivo: raw, referencia: '' }
  }

  const parts = raw.split('||')
  let motivo = ''
  let referencia = ''
  parts.forEach((part) => {
    if (part.startsWith('MOTIVO::')) motivo = part.replace('MOTIVO::', '').trim()
    if (part.startsWith('REF::')) referencia = part.replace('REF::', '').trim()
  })
  return { motivo, referencia }
}

function mapApiProduct(p, categoriesMap = null, stockByProduct = null) {
  const stockData = stockByProduct?.[Number(p.id)] || { total: toNumber(p.current_stock), distribucion: {} }
  const costo = toNumber(p.average_cost)
  const precio = toNumber(p.sale_price)
  return {
    id: Number(p.id),
    sku: p.sku,
    nombre: p.name,
    categoria: p.category_name || categoriesMap?.[p.category] || 'Sin categoría',
    stock: toNumber(p.available_stock, stockData.total),
    stockFisico: stockData.total,
    stockReservado: toNumber(p.reserved_stock, 0),
    stockDisponible: toNumber(p.available_stock, stockData.total),
    ultimoMovimiento: p.last_movement_at ? String(p.last_movement_at).slice(0, 10) : '',
    stockMinimo: toNumber(p.stock_minimum),
    costo,
    precio,
    distribucion: stockData.distribucion,
    abc: 'B',
    xyz: 'Y',
    rotation: '0.00',
    consumption: '0',
    market: 'ES',
  }
}

export async function getAlmacenes() {
  const deposits = unwrapList(await apiFetch('/deposits/'))
  return deposits.map((d) => ({
    id: String(d.id),
    nombre: d.name,
    ubicacion: d.location || '-',
    capacidad: '-',
  }))
}

export async function createAlmacen(payload) {
  const created = await apiFetch('/deposits/', {
    method: 'POST',
    body: {
      name: payload.nombre,
      location: payload.ubicacion || '',
    },
  })

  return {
    id: String(created.id),
    nombre: created.name,
    ubicacion: created.location || '-',
    capacidad: '-',
  }
}

const proveedores = [
  { id: 1, nombre: 'Logitech Spain', contacto: 'ventas@logitech.es', categoria: 'Periféricos' },
  { id: 2, nombre: 'Dell Enterprise', contacto: 'support@dell.com', categoria: 'Hardware' },
  { id: 3, nombre: 'Global Tech Dist', contacto: 'info@globaltech.com', categoria: 'General' },
]

const clientes = [
  { id: 1, nombre: 'Universidad de Valencia', email: 'compras@uv.es', tipo: 'Corporativo' },
  { id: 2, nombre: 'MediaMarket SL', email: 'stocks@mediamarket.es', tipo: 'Retail' },
  { id: 3, nombre: 'Cliente Particular', email: 'juan@gmail.com', tipo: 'Final' },
]

export async function getProveedores() {
  return [...proveedores]
}

export async function getClientes() {
  return [...clientes]
}

export async function getDashboardData() {
  const [productos, alertsApi, summaryApi, reservationsApi] = await Promise.all([
    getProductos(),
    apiFetch('/dashboard/alerts/').catch(() => []),
    apiFetch('/dashboard/summary/').catch(() => []),
    apiFetch('/dashboard/reservations/').catch(() => []),
  ])

  const totalProductos = productos.length
  const stockTotal = productos.reduce((acc, p) => acc + p.stock, 0)
  const bajoMinimo = productos.filter((p) => p.stock > 0 && p.stock < p.stockMinimo).length
  const sinStock = productos.filter((p) => p.stock === 0).length

  const stockPorDepositoMap = {}
  unwrapList(summaryApi).forEach((row) => {
    const key = row.deposit_id
    if (!stockPorDepositoMap[key]) {
      stockPorDepositoMap[key] = {
        deposit_id: row.deposit_id,
        deposit_name: row.deposit_name,
        current_stock: 0,
      }
    }
    stockPorDepositoMap[key].current_stock += toNumber(row.current_stock)
  })
  const stockPorDeposito = Object.values(stockPorDepositoMap).sort((a, b) => b.current_stock - a.current_stock)

  const alertas = unwrapList(alertsApi).map((alerta, index) => ({
    id: alerta.product_id || index + 1,
    mensaje: `${alerta.sku} - ${alerta.name}: stock ${toNumber(alerta.current_stock)} (mínimo ${toNumber(alerta.stock_minimum)})`,
  }))

  return {
    resumen: {
      totalProductos,
      stockTotal,
      bajoMinimo,
      sinStock,
    },
    stockPorDeposito,
    activeReservations: unwrapList(reservationsApi).map((item) => ({
      ...item,
      reserved_quantity: toNumber(item.reserved_quantity),
      deposit_name: item.deposit_name || 'N/D',
      last_update: item.last_update ? String(item.last_update).slice(0, 10) : '',
    })),
    alertas,
  }
}

export async function getReservasActivas() {
  const reservations = unwrapList(await apiFetch('/dashboard/reservations/'))
  return reservations.map((item) => ({
    product_id: Number(item.product_id),
    sku: item.sku,
    product_name: item.product_name,
    deposit_name: item.deposit_name || 'N/D',
    reference: item.reference,
    reason: item.reason || '',
    reserved_quantity: toNumber(item.reserved_quantity),
    last_update: item.last_update ? String(item.last_update).slice(0, 10) : '',
  }))
}

export async function getProductos() {
  const [products, categoriesMap, stockByProduct] = await Promise.all([
    unwrapList(await apiFetch('/products/')),
    getCategoriesMap(),
    getStockByProduct(),
  ])

  return products.map((p) => mapApiProduct(p, categoriesMap, stockByProduct))
}

export async function getProductosPage({ page = 1, pageSize = 50, q = '', categoria = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (String(q || '').trim()) params.set('q', String(q).trim())
  if (String(categoria || '').trim()) params.set('category', String(categoria).trim())

  const data = await apiFetch(`/products/catalog/?${params.toString()}`)
  const results = unwrapList(data).map((p) => mapApiProduct(p))
  const total = toNumber(data?.count, results.length)
  const totalPages = Math.max(1, Math.ceil(total / Number(pageSize || 1)))

  return {
    items: results,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages,
    hasNext: Boolean(data?.next),
    hasPrevious: Boolean(data?.previous),
  }
}

export async function getProductoById(productoId) {
  const [product, categoriesMap, stockByProduct] = await Promise.all([
    apiFetch(`/products/${productoId}/`),
    getCategoriesMap(),
    getStockByProduct(),
  ])

  const stockData = stockByProduct[Number(product.id)] || { total: toNumber(product.current_stock), distribucion: {} }
  const costo = toNumber(product.average_cost)
  const precio = toNumber(product.sale_price)
  return {
    id: Number(product.id),
    sku: product.sku,
    nombre: product.name,
    categoria: categoriesMap[product.category] || 'Sin categoría',
    stock: toNumber(product.available_stock, stockData.total),
    stockFisico: stockData.total,
    stockReservado: toNumber(product.reserved_stock, 0),
    stockDisponible: toNumber(product.available_stock, stockData.total),
    ultimoMovimiento: product.last_movement_at ? String(product.last_movement_at).slice(0, 10) : '',
    stockMinimo: toNumber(product.stock_minimum),
    costo,
    precio,
    distribucion: stockData.distribucion,
    abc: 'B',
    xyz: 'Y',
    rotation: '0.00',
    consumption: '0',
    market: 'ES',
  }
}

export async function searchProductos(query, limit = 25) {
  const q = String(query || '').trim()
  if (q.length < 2) return []

  const [rows, categoriesMap, stockByProduct] = await Promise.all([
    unwrapList(await apiFetch(`/products/quick-search/?q=${encodeURIComponent(q)}&limit=${limit}`)),
    getCategoriesMap(),
    getStockByProduct(),
  ])

  return rows.map((p) => mapApiProduct(p, categoriesMap, stockByProduct))
}

export async function getCategorias() {
  const categories = unwrapList(await apiFetch('/categories/'))
  return categories
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

export async function createCategoria(nombre) {
  const cleanName = (nombre || '').trim()
  if (!cleanName) throw new Error('La categoría no puede estar vacía.')

  const categories = unwrapList(await apiFetch('/categories/'))
  const existing = categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase())
  if (existing) return existing.name

  const created = await apiFetch('/categories/', {
    method: 'POST',
    body: { name: cleanName },
  })
  return created.name
}

export async function createProducto(payload) {
  const sku = (payload.sku || '').trim()
  if (!sku) throw new Error('El SKU es obligatorio.')

  const name = (payload.nombre || '').trim()
  if (!name) throw new Error('El nombre es obligatorio.')

  const categoryId = await ensureCategoryId(payload.categoria)
  const unitId = await ensureDefaultUnit()

  const product = await apiFetch('/products/', {
    method: 'POST',
    body: {
      sku,
      name,
      category: categoryId,
      unit: unitId,
      stock_minimum: toNumber(payload.stockMinimo),
      average_cost: toNumber(payload.costo),
      sale_price: toNumber(payload.precio),
    },
  })

  const productos = await getProductos()
  return productos.find((p) => p.id === Number(product.id))
}

export async function updateProducto(productoId, payload) {
  const data = {}
  if (payload.stockMinimo !== undefined) data.stock_minimum = toNumber(payload.stockMinimo)
  if (payload.costo !== undefined) data.average_cost = toNumber(payload.costo)
  if (payload.precio !== undefined) data.sale_price = toNumber(payload.precio)

  const updated = await apiFetch(`/products/${productoId}/`, {
    method: 'PATCH',
    body: data,
  })

  const [categoriesMap, stockByProduct] = await Promise.all([
    getCategoriesMap(),
    getStockByProduct(),
  ])

  const stockData = stockByProduct[Number(updated.id)] || { total: toNumber(updated.current_stock), distribucion: {} }
  return {
    id: Number(updated.id),
    sku: updated.sku,
    nombre: updated.name,
    categoria: categoriesMap[updated.category] || 'Sin categoría',
    stock: toNumber(updated.available_stock, stockData.total),
    stockFisico: stockData.total,
    stockReservado: toNumber(updated.reserved_stock, 0),
    stockDisponible: toNumber(updated.available_stock, stockData.total),
    ultimoMovimiento: updated.last_movement_at ? String(updated.last_movement_at).slice(0, 10) : '',
    stockMinimo: toNumber(updated.stock_minimum),
    costo: toNumber(updated.average_cost),
    precio: toNumber(updated.sale_price),
    distribucion: stockData.distribucion,
    abc: 'B',
    xyz: 'Y',
    rotation: '0.00',
    consumption: '0',
    market: 'ES',
  }
}

export async function reservarProducto({ productoId, cantidad, motivo, referencia }) {
  const updated = await apiFetch(`/products/${productoId}/reserve/`, {
    method: 'POST',
    body: {
      quantity: toNumber(cantidad),
      reason: motivo,
      reference: referencia || '',
    },
  })
  const productos = await getProductos()
  return productos.find((p) => p.id === Number(updated.id))
}

export async function liberarReservaProducto({ productoId, cantidad, motivo, referencia }) {
  const updated = await apiFetch(`/products/${productoId}/release-reservation/`, {
    method: 'POST',
    body: {
      quantity: toNumber(cantidad),
      reason: motivo,
      reference: referencia || '',
    },
  })
  const productos = await getProductos()
  return productos.find((p) => p.id === Number(updated.id))
}

export async function despacharReservaProducto({ productoId, almacenId, cantidad, motivo, referencia }) {
  const updated = await apiFetch(`/products/${productoId}/dispatch-reservation/`, {
    method: 'POST',
    body: {
      deposit: Number(almacenId),
      quantity: toNumber(cantidad),
      reason: motivo,
      reference: referencia || '',
    },
  })
  const productos = await getProductos()
  return productos.find((p) => p.id === Number(updated.id))
}

export async function bulkUpdatePreciosPorCategoria({ categoriaNombre, porcentaje }) {
  const categories = unwrapList(await apiFetch('/categories/'))
  const cleanName = String(categoriaNombre || '').trim()
  const matchedCategory = cleanName
    ? categories.find((c) => c.name.toLowerCase() === cleanName.toLowerCase())
    : null

  const payload = {
    percentage: toNumber(porcentaje),
  }
  if (matchedCategory) {
    payload.category_id = matchedCategory.id
  }

  return apiFetch('/products/bulk-price-update/', {
    method: 'POST',
    body: payload,
  })
}

export async function getMovimientos() {
  const [movements, products, deposits] = await Promise.all([
    unwrapList(await apiFetch('/movements/')),
    unwrapList(await apiFetch('/products/')),
    getDepositsMap(),
  ])

  const productNameById = Object.fromEntries(products.map((p) => [p.id, p.name]))

  return movements.map((m) => {
    const parsedNotes = parseMovementNotes(m.notes)
    return {
      id: Number(m.id),
      fecha: toDateOnly(m.created_at),
      productoId: Number(m.product),
      producto: productNameById[m.product] || `Producto ${m.product}`,
      almacen: String(m.deposit),
      almacenNombre: deposits.map[m.deposit] || `Depósito ${m.deposit}`,
      tipo: apiTypeToUiType(m.movement_type, m.notes),
      cantidad: toNumber(m.quantity),
      referencia: parsedNotes.referencia || `MOV-${m.id}`,
      motivo: parsedNotes.motivo || '',
    }
  })
}

export async function getMovimientosPorProducto(productoId) {
  const [movements, products, deposits] = await Promise.all([
    unwrapList(await apiFetch(`/movements/?product=${productoId}`)),
    unwrapList(await apiFetch('/products/')),
    getDepositsMap(),
  ])

  const productNameById = Object.fromEntries(products.map((p) => [p.id, p.name]))

  return movements.map((m) => {
    const parsedNotes = parseMovementNotes(m.notes)
    return {
      id: Number(m.id),
      fecha: toDateOnly(m.created_at),
      productoId: Number(m.product),
      producto: productNameById[m.product] || `Producto ${m.product}`,
      almacen: deposits.map[m.deposit] || `Depósito ${m.deposit}`,
      tipo: apiTypeToUiType(m.movement_type, m.notes),
      cantidad: toNumber(m.quantity),
      referencia: parsedNotes.referencia || `MOV-${m.id}`,
      motivo: parsedNotes.motivo || '',
    }
  })
}

export async function createMovimiento(payload) {
  const movimientoTipo = uiTypeToApiType(payload.tipo)
  const depositId = await resolveDepositId(payload.almacen)
  const quantity = toNumber(payload.cantidad)
  const isEntrada = payload.tipo === 'entrada'
  let movementCost = 0

  if (isEntrada) {
    const costoUnit = toNumber(payload.costoUnit, NaN)
    if (Number.isFinite(costoUnit) && costoUnit >= 0) {
      movementCost = costoUnit
    } else {
      const products = unwrapList(await apiFetch('/products/'))
      const selected = products.find((p) => Number(p.id) === Number(payload.productoId))
      movementCost = toNumber(selected?.average_cost, 0)
    }
  }

  const created = await apiFetch('/movements/', {
    method: 'POST',
    body: {
      product: Number(payload.productoId),
      deposit: depositId,
      movement_type: movimientoTipo,
      quantity,
      cost: movementCost,
      notes: buildMovementNotes({ motivo: payload.motivo, referencia: payload.referencia }),
    },
  })

  const [products, deposits] = await Promise.all([
    unwrapList(await apiFetch('/products/')),
    getDepositsMap(),
  ])
  const productNameById = Object.fromEntries(products.map((p) => [Number(p.id), p.name]))

  return {
    id: Number(created.id),
    fecha: toDateOnly(created.created_at),
    productoId: Number(created.product),
    producto: productNameById[Number(created.product)] || `Producto ${created.product}`,
    almacen: String(created.deposit),
    almacenNombre: deposits.map[created.deposit] || `Depósito ${created.deposit}`,
    tipo: payload.tipo,
    cantidad: quantity,
    referencia: payload.referencia || `MOV-${created.id}`,
    motivo: payload.motivo || '',
  }
}

export async function ajustarStock({ productoId, almacenId, cantidad, motivo, observaciones, fecha }) {
  const depositId = await resolveDepositId(almacenId)
  const created = await apiFetch('/movements/', {
    method: 'POST',
    body: {
      product: Number(productoId),
      deposit: depositId,
      movement_type: 'SALE',
      quantity: toNumber(cantidad),
      cost: 0,
      notes: `${motivo || 'Ajuste'}${observaciones ? ` | ${observaciones}` : ''}`,
    },
  })

  const productos = await getProductos()
  const producto = productos.find((p) => p.id === Number(productoId))

  return {
    movimiento: {
      id: Number(created.id),
      fecha: fecha || toDateOnly(created.created_at),
      productoId: Number(productoId),
      almacen: String(depositId),
      tipo: 'ajuste',
      cantidad: toNumber(cantidad),
      motivo,
      observaciones,
    },
    stockActual: producto?.stock ?? 0,
  }
}

export async function getKardex(filters = {}) {
  const movimientos = await getMovimientos()
  const sorted = [...movimientos].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))

  const balances = {}
  const rows = sorted.map((m) => {
    const key = m.productoId
    const current = balances[key] || 0
    const sign = m.tipo === 'salida' || m.tipo === 'ajuste' ? -1 : 1
    const saldo = current + sign * toNumber(m.cantidad)
    balances[key] = saldo

    return {
      id: m.id,
      fecha: m.fecha,
      productoId: m.productoId,
      producto: m.producto,
      tipo: m.tipo,
      cantidad: m.cantidad,
      saldo,
    }
  })

  const { productoId, tipo, desde, hasta } = filters
  return rows
    .filter((item) => {
      const sameProducto = productoId ? item.productoId === Number(productoId) : true
      const sameTipo = tipo ? item.tipo === tipo : true
      const inDesde = desde ? item.fecha >= desde : true
      const inHasta = hasta ? item.fecha <= hasta : true
      return sameProducto && sameTipo && inDesde && inHasta
    })
    .reverse()
}

export async function getKardexPage({ page = 1, pageSize = 100, productoId = '', tipo = '', desde = '', hasta = '', q = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  if (String(productoId || '').trim()) params.set('product', String(productoId).trim())
  if (String(tipo || '').trim()) params.set('tipo', String(tipo).trim())
  if (String(desde || '').trim()) params.set('desde', String(desde).trim())
  if (String(hasta || '').trim()) params.set('hasta', String(hasta).trim())
  if (String(q || '').trim()) params.set('q', String(q).trim())

  const data = await apiFetch(`/movements/kardex/?${params.toString()}`)
  const items = unwrapList(data).map((row) => ({
    id: Number(row.id),
    fecha: row.fecha,
    productoId: Number(row.producto_id),
    producto: row.producto,
    sku: row.sku,
    tipo: row.tipo,
    cantidad: toNumber(row.cantidad),
    saldo: toNumber(row.saldo),
    almacen: row.deposito,
    motivo: row.motivo || '',
    referencia: row.referencia || `MOV-${row.id}`,
  }))

  const total = toNumber(data?.count, items.length)
  const totalPages = Math.max(1, Math.ceil(total / Number(pageSize || 1)))
  return {
    items,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages,
    hasNext: Boolean(data?.next),
    hasPrevious: Boolean(data?.previous),
  }
}
