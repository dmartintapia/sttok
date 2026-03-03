import React, { useEffect, useMemo, useState, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { bulkUpdatePreciosPorCategoria, createCategoria, createProducto, despacharReservaProducto, getCategorias, getProductoById, getProductosPage, ajustarStock, liberarReservaProducto, reservarProducto, updateProducto } from '../services/dataService'
import { TableVirtuoso } from 'react-virtuoso'

import { Package, Hash, Tag, Layers, ShieldAlert, DollarSign, List, PlusCircle, X, TrendingUp, Info, MapPin, Activity, ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react'
import { getMovimientosPorProducto, getAlmacenes } from '../services/dataService'

const initialForm = {
  sku: '',
  nombre: '',
  categoria: 'Accesorios',
  stockMinimo: 0,
  costo: 0,
  precio: 0,
}

// Stable components for TableVirtuoso to prevent remounts
const VirtuosoTableComponents = {
  Table: (props) => <table {...props} className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }} />,
  TableHead: forwardRef((props, ref) => <thead {...props} ref={ref} />),
  TableBody: forwardRef((props, ref) => <tbody {...props} ref={ref} />),
  TableRow: (props) => <tr {...props} className="cursor-pointer" />,
}

function ProductDetailDrawer({ product, isOpen, onClose, onStockUpdated, onProductUpdated }) {
  const navigate = useNavigate()
  const [movimientos, setMovimientos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [loadingMov, setLoadingMov] = useState(false)
  const [showAllAlmacenes, setShowAllAlmacenes] = useState(false)
  const [almacenSearch, setAlmacenSearch] = useState('')
  const [visibleAlmacenes, setVisibleAlmacenes] = useState(20)

  // Modal de ajuste
  const [showAjuste, setShowAjuste] = useState(false)
  const [ajusteForm, setAjusteForm] = useState({ cantidad: 1, motivo: 'Robo', almacenId: 'WH-A', observaciones: '' })
  const [ajusteLoading, setAjusteLoading] = useState(false)
  const [ajusteSuccess, setAjusteSuccess] = useState(null)
  const [ajusteError, setAjusteError] = useState('')
  const [editForm, setEditForm] = useState({ costo: 0, precio: 0, stockMinimo: 0 })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [fxForm, setFxForm] = useState({ costoUsd: 0, dolarArs: 1200, margenObjetivo: 35 })
  const [reservaForm, setReservaForm] = useState({ cantidad: 1, motivo: 'Venta pendiente', referencia: '' })
  const [reservaLoading, setReservaLoading] = useState(false)
  const [reservaError, setReservaError] = useState('')

  const diasDeStock = useMemo(() => {
    if (!product) return 'N/D'

    const today = new Date()
    const last30Days = new Date(today)
    last30Days.setDate(today.getDate() - 30)

    const salidaUltimos30 = movimientos
      .filter((m) => m.tipo === 'salida')
      .filter((m) => {
        const fecha = new Date(m.fecha)
        return !Number.isNaN(fecha.getTime()) && fecha >= last30Days && fecha <= today
      })
      .reduce((acc, m) => acc + Number(m.cantidad || 0), 0)

    const consumoDiario = salidaUltimos30 / 30
    const stockActual = Number(product.stock || 0)

    if (consumoDiario <= 0 || stockActual <= 0) return 'N/D'
    return `${Math.round(stockActual / consumoDiario)} Días`
  }, [movimientos, product])

  useEffect(() => {
    if (isOpen && product) {
      setLoadingMov(true)
      setShowAllAlmacenes(false)
      setAlmacenSearch('')
      setVisibleAlmacenes(20)
      setShowAjuste(false)
      setAjusteSuccess(null)
      setAjusteError('')
      setEditError('')
      setEditForm({
        costo: Number(product.costo || 0),
        precio: Number(product.precio || 0),
        stockMinimo: Number(product.stockMinimo || 0),
      })
      setReservaForm({ cantidad: 1, motivo: 'Venta pendiente', referencia: '' })
      setReservaError('')
      Promise.all([
        getMovimientosPorProducto(product.id),
        getAlmacenes()
      ]).then(([movs, alms]) => {
        setMovimientos(movs)
        setAlmacenes(alms)
        setAjusteForm(prev => ({ ...prev, almacenId: alms[0]?.id || 'WH-A' }))
      }).finally(() => setLoadingMov(false))
    }
  }, [isOpen, product])

  const handleAjusteSubmit = async (e) => {
    e.preventDefault()
    setAjusteError('')
    setAjusteLoading(true)
    try {
      const result = await ajustarStock({
        productoId: product.id,
        almacenId: ajusteForm.almacenId,
        cantidad: ajusteForm.cantidad,
        motivo: ajusteForm.motivo,
        observaciones: ajusteForm.observaciones,
        fecha: new Date().toISOString().slice(0, 10),
      })
      setAjusteSuccess(result.stockActual)
      onStockUpdated && onStockUpdated(product.id, result.stockActual)
      // refrescar movimientos
      const movs = await getMovimientosPorProducto(product.id)
      setMovimientos(movs)
    } catch (err) {
      setAjusteError(err?.message || 'No se pudo registrar el ajuste.')
    } finally {
      setAjusteLoading(false)
    }
  }

  const recalculateByDollar = () => {
    const costoUsd = Number(fxForm.costoUsd || 0)
    const dolarArs = Number(fxForm.dolarArs || 0)
    const margenObjetivo = Number(fxForm.margenObjetivo || 0)
    const costoArs = costoUsd * dolarArs
    const precioArs = costoArs * (1 + margenObjetivo / 100)
    setEditForm((prev) => ({
      ...prev,
      costo: Number(costoArs.toFixed(2)),
      precio: Number(precioArs.toFixed(2)),
    }))
  }

  const handleSaveProductParams = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditLoading(true)
    try {
      const updated = await updateProducto(product.id, editForm)
      onProductUpdated && onProductUpdated(updated)
    } catch (err) {
      setEditError(err?.message || 'No se pudo actualizar el producto.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleReservar = async () => {
    setReservaError('')
    setReservaLoading(true)
    try {
      const updated = await reservarProducto({
        productoId: product.id,
        cantidad: reservaForm.cantidad,
        motivo: reservaForm.motivo,
        referencia: reservaForm.referencia,
      })
      onProductUpdated && onProductUpdated(updated)
    } catch (err) {
      setReservaError(err?.message || 'No se pudo reservar stock.')
    } finally {
      setReservaLoading(false)
    }
  }

  const handleLiberarReserva = async () => {
    setReservaError('')
    setReservaLoading(true)
    try {
      const updated = await liberarReservaProducto({
        productoId: product.id,
        cantidad: reservaForm.cantidad,
        motivo: reservaForm.motivo,
        referencia: reservaForm.referencia,
      })
      onProductUpdated && onProductUpdated(updated)
    } catch (err) {
      setReservaError(err?.message || 'No se pudo liberar la reserva.')
    } finally {
      setReservaLoading(false)
    }
  }

  const handleDespacharReserva = async () => {
    setReservaError('')
    setReservaLoading(true)
    try {
      const updated = await despacharReservaProducto({
        productoId: product.id,
        almacenId: ajusteForm.almacenId,
        cantidad: reservaForm.cantidad,
        motivo: reservaForm.motivo,
        referencia: reservaForm.referencia,
      })
      onProductUpdated && onProductUpdated(updated)
      const movs = await getMovimientosPorProducto(product.id)
      setMovimientos(movs)
    } catch (err) {
      setReservaError(err?.message || 'No se pudo despachar reserva.')
    } finally {
      setReservaLoading(false)
    }
  }

  if (!product) return null

  const margen = product.precio > 0 ? (((product.precio - product.costo) / product.precio) * 100).toFixed(1) : 0;
  const almacenesConCantidad = almacenes.map((alm) => ({
    ...alm,
    cantidad: Number(product.distribucion?.[alm.id] ?? 0),
  }))
  const almacenesBase = showAllAlmacenes
    ? almacenesConCantidad
    : almacenesConCantidad.filter((alm) => alm.cantidad > 0)
  const almacenesFiltrados = almacenesBase.filter((alm) =>
    String(alm.nombre || '').toLowerCase().includes(almacenSearch.toLowerCase())
  )
  const almacenesVisibles = almacenesFiltrados.slice(0, visibleAlmacenes)
  const hayMasAlmacenes = almacenesFiltrados.length > visibleAlmacenes

  return (
    <>
      <div className={`ent-drawer-overlay ${isOpen ? 'd-block' : 'd-none'}`} onClick={onClose} />
      <div className={`ent-drawer ${isOpen ? 'open' : ''}`}>
        <div className="ent-drawer-header">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 p-2 rounded">
              <Package className="text-primary" size={24} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold">{product.nombre}</h5>
              <span className="text-muted small">{product.sku}</span>
            </div>
          </div>
          <button className="btn btn-link text-muted p-0" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="ent-drawer-body">
          {/* KPIs Rápido */}
          <div className="ent-drawer-section">
            <div className="ent-drawer-section-title"><Info size={14} /> Métricas de Rendimiento</div>
            <div className="row g-3">
              <div className="col-4">
                <div className="kpi-mini-card">
                  <div className="kpi-mini-label">Stock Fisico</div>
                  <div className="kpi-mini-value">{Number(product.stockFisico || 0)}</div>
                </div>
              </div>
              <div className="col-4">
                <div className="kpi-mini-card" style={{ borderLeftColor: '#f59e0b' }}>
                  <div className="kpi-mini-label">Reservado</div>
                  <div className="kpi-mini-value">{Number(product.stockReservado || 0)}</div>
                </div>
              </div>
              <div className="col-4">
                <div className="kpi-mini-card" style={{ borderLeftColor: '#10b981' }}>
                  <div className="kpi-mini-label">Disponible</div>
                  <div className="kpi-mini-value">{Number(product.stockDisponible || product.stock || 0)}</div>
                </div>
              </div>
            </div>
            <div className="mt-2 small text-muted">
              Margen: <strong className={margen > 30 ? 'text-success' : 'text-warning'}>{margen}%</strong> | Días de stock: <strong>{diasDeStock}</strong>
            </div>
          </div>

          {/* Distribución por Almacén */}
          <div className="ent-drawer-section">
            <div className="ent-drawer-section-title d-flex justify-content-between align-items-center">
              <span><MapPin size={14} /> Distribución Geográfica</span>
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none p-0"
                onClick={() => {
                  setShowAllAlmacenes((prev) => !prev)
                  setVisibleAlmacenes(20)
                }}
              >
                {showAllAlmacenes ? 'Solo con stock' : 'Ver todos'}
              </button>
            </div>
            <input
              className="form-control form-control-sm mb-2"
              placeholder="Buscar almacén..."
              value={almacenSearch}
              onChange={(e) => {
                setAlmacenSearch(e.target.value)
                setVisibleAlmacenes(20)
              }}
            />
            <div className="list-group list-group-flush border rounded overflow-hidden">
              {almacenesVisibles.map(alm => (
                <div key={alm.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                  <span className="small fw-medium text-dark">{alm.nombre} ({alm.id})</span>
                  <span className="badge bg-light text-dark border">{alm.cantidad} un.</span>
                </div>
              ))}
              {almacenesVisibles.length === 0 && <div className="p-3 text-center text-muted small">Sin almacenes para mostrar.</div>}
            </div>
            {hayMasAlmacenes && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-2 w-100"
                onClick={() => setVisibleAlmacenes((prev) => prev + 20)}
              >
                Ver 20 más ({almacenesFiltrados.length - visibleAlmacenes} restantes)
              </button>
            )}
          </div>

          {/* Movimientos Recientes */}
          <div className="ent-drawer-section">
            <div className="ent-drawer-section-title"><Activity size={14} /> Actividad Reciente (Kardex)</div>
            {loadingMov ? (
              <div className="text-center py-4 text-muted small">Cargando movimientos...</div>
            ) : movimientos.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm border-top border-bottom">
                  <thead className="bg-light">
                    <tr>
                      <th className="text-muted small" style={{ fontSize: '10px' }}>FECHA</th>
                      <th className="text-muted small" style={{ fontSize: '10px' }}>ALM</th>
                      <th className="text-muted small" style={{ fontSize: '10px' }}>TIPO</th>
                      <th className="text-muted small text-end" style={{ fontSize: '10px' }}>CANT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.slice(0, 5).map(m => (
                      <tr key={m.id}>
                        <td className="small" style={{ fontSize: '11px' }}>{m.fecha}</td>
                        <td className="small text-muted" style={{ fontSize: '9px' }}>{m.almacen || 'WH-A'}</td>
                        <td>
                          <span className={`badge ${m.tipo === 'entrada' ? 'bg-success' :
                            m.tipo === 'ajuste' ? 'bg-warning' : 'bg-danger'
                            } bg-opacity-10 ${m.tipo === 'entrada' ? 'text-success' :
                              m.tipo === 'ajuste' ? 'text-warning' : 'text-danger'
                            } p-1`} style={{ fontSize: '9px' }}>
                            {m.tipo === 'ajuste' ? `AJUSTE (${m.motivo || ''})` : m.tipo.toUpperCase()}
                          </span>
                        </td>
                        <td className="small text-end fw-bold" style={{ fontSize: '11px' }}>{m.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-light border text-center py-3">
                <TrendingUp size={16} className="text-muted mb-2 d-block mx-auto" />
                <span className="text-muted small">No hay movimientos registrados para este producto.</span>
              </div>
            )}
          </div>

          <div className="ent-drawer-section">
            <div className="ent-drawer-section-title"><Tag size={14} /> Parametros del Producto</div>
            <form onSubmit={handleSaveProductParams} className="d-flex flex-column gap-2">
              <div className="row g-2">
                <div className="col-4">
                  <label className="filter-label">Costo</label>
                  <input className="form-control form-control-sm" type="number" min="0" step="0.01" value={editForm.costo} onChange={(e) => setEditForm((p) => ({ ...p, costo: e.target.value }))} required />
                </div>
                <div className="col-4">
                  <label className="filter-label">Precio Venta</label>
                  <input className="form-control form-control-sm" type="number" min="0" step="0.01" value={editForm.precio} onChange={(e) => setEditForm((p) => ({ ...p, precio: e.target.value }))} required />
                </div>
                <div className="col-4">
                  <label className="filter-label">Stock Min.</label>
                  <input className="form-control form-control-sm" type="number" min="0" step="0.01" value={editForm.stockMinimo} onChange={(e) => setEditForm((p) => ({ ...p, stockMinimo: e.target.value }))} required />
                </div>
              </div>

              <div className="border rounded p-2 mt-1">
                <div className="small fw-semibold mb-2 text-muted">Calculo por dolar (ARS)</div>
                <div className="row g-2">
                  <div className="col-4">
                    <label className="filter-label">Costo USD</label>
                    <input className="form-control form-control-sm" type="number" min="0" step="0.01" value={fxForm.costoUsd} onChange={(e) => setFxForm((p) => ({ ...p, costoUsd: e.target.value }))} placeholder="Costo USD" />
                  </div>
                  <div className="col-4">
                    <label className="filter-label">Dólar ARS</label>
                    <input className="form-control form-control-sm" type="number" min="0" step="0.01" value={fxForm.dolarArs} onChange={(e) => setFxForm((p) => ({ ...p, dolarArs: e.target.value }))} placeholder="Dolar ARS" />
                  </div>
                  <div className="col-4">
                    <label className="filter-label">% Margen</label>
                    <input className="form-control form-control-sm" type="number" min="0" step="0.01" value={fxForm.margenObjetivo} onChange={(e) => setFxForm((p) => ({ ...p, margenObjetivo: e.target.value }))} placeholder="% Margen" />
                  </div>
                </div>
                <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={recalculateByDollar}>Recalcular ARS</button>
              </div>

              {editError && <div className="invalid-feedback d-block" style={{ fontSize: '11px' }}>{editError}</div>}
              <button type="submit" className="btn btn-sm btn-primary mt-1" disabled={editLoading}>{editLoading ? 'Guardando...' : 'Guardar parametros'}</button>
            </form>
          </div>

          <div className="ent-drawer-section">
            <div className="ent-drawer-section-title"><ShoppingCart size={14} /> Reservas Comerciales</div>
            <div className="row g-2">
              <div className="col-4">
                <label className="filter-label">Cantidad</label>
                <input className="form-control form-control-sm" type="number" min="1" value={reservaForm.cantidad} onChange={(e) => setReservaForm((p) => ({ ...p, cantidad: e.target.value }))} />
              </div>
              <div className="col-8">
                <label className="filter-label">Motivo</label>
                <input className="form-control form-control-sm" value={reservaForm.motivo} onChange={(e) => setReservaForm((p) => ({ ...p, motivo: e.target.value }))} placeholder="Ej: Venta pendiente retiro" />
              </div>
            </div>
            <div className="mt-2">
              <label className="filter-label">Referencia</label>
              <input className="form-control form-control-sm" value={reservaForm.referencia} onChange={(e) => setReservaForm((p) => ({ ...p, referencia: e.target.value }))} placeholder="Ej: PED-1024" />
            </div>
            <div className="mt-2">
              <label className="filter-label">Almacén para despacho</label>
              <select className="form-select form-select-sm" value={ajusteForm.almacenId} onChange={(e) => setAjusteForm((p) => ({ ...p, almacenId: e.target.value }))}>
                {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            {reservaError && <div className="invalid-feedback d-block mt-1" style={{ fontSize: '11px' }}>{reservaError}</div>}
            <div className="d-flex gap-2 mt-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleReservar} disabled={reservaLoading}>Reservar</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleLiberarReserva} disabled={reservaLoading}>Liberar</button>
              <button type="button" className="btn btn-sm btn-success" onClick={handleDespacharReserva} disabled={reservaLoading}>Despachar</button>
            </div>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 mt-2"
              onClick={() => { onClose(); navigate(`/movimientos?tab=reservas&productoId=${product.id}`) }}
            >
              Ver reservas activas del producto
            </button>
          </div>

          {/* Acciones Rápidas */}
          <div className="ent-drawer-section">
            <div className="ent-drawer-section-title"><AlertTriangle size={14} /> Acciones de Inventario</div>

            {!showAjuste ? (
              <div className="d-flex flex-column gap-2">
                {/* Botón Registrar Ingreso → Movimientos */}
                <button
                  className="btn btn-sm d-flex align-items-center gap-2 fw-semibold py-2"
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '8px' }}
                  onClick={() => { onClose(); navigate(`/movimientos?productoId=${product.id}&tipo=entrada`) }}
                >
                  <ShoppingCart size={14} />
                  Ir a Movimientos
                  <span className="ms-auto badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '10px' }}>Entrada/Salida</span>
                </button>

                {/* Botón Ajustar Stock */}
                <button
                  className="btn btn-sm d-flex align-items-center gap-2 fw-semibold py-2"
                  style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: '8px' }}
                  onClick={() => setShowAjuste(true)}
                >
                  <AlertTriangle size={14} />
                  Ajustar Stock (Robo / Rotura)
                  <span className="ms-auto badge" style={{ background: '#ffedd5', color: '#c2410c', fontSize: '10px' }}>Deja constancia</span>
                </button>
              </div>
            ) : ajusteSuccess !== null ? (
              <div className="text-center py-3">
                <CheckCircle size={28} className="text-success mb-2" />
                <div className="fw-bold text-success mb-1">Ajuste registrado</div>
                <div className="text-muted small">Nuevo stock: <strong>{ajusteSuccess} un.</strong></div>
                <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => { setShowAjuste(false); setAjusteSuccess(null) }}>Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleAjusteSubmit} className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-warning" />
                  <span className="small fw-semibold text-dark">Registrar pérdida de mercancía</span>
                  <button type="button" className="btn btn-link p-0 ms-auto text-muted" onClick={() => setShowAjuste(false)}><X size={14} /></button>
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <label className="filter-label">Motivo</label>
                    <select className="form-select form-select-sm" value={ajusteForm.motivo} onChange={e => setAjusteForm(p => ({ ...p, motivo: e.target.value }))} required>
                      <option>Robo</option>
                      <option>Rotura</option>
                      <option>Vencimiento</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="filter-label">Almacén</label>
                    <select className="form-select form-select-sm" value={ajusteForm.almacenId} onChange={e => setAjusteForm(p => ({ ...p, almacenId: e.target.value }))} required>
                      {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="filter-label">Cantidad a descontar</label>
                  <input
                    className={`form-control form-control-sm ${ajusteError ? 'is-invalid' : ''}`}
                    type="number"
                    min="1"
                    value={ajusteForm.cantidad}
                    onChange={e => {
                      setAjusteError('')
                      setAjusteForm(p => ({ ...p, cantidad: e.target.value }))
                    }}
                    required
                  />
                  {ajusteError && <div className="invalid-feedback d-block" style={{ fontSize: '11px' }}>{ajusteError}</div>}
                </div>

                <div>
                  <label className="filter-label">Observaciones</label>
                  <input className="form-control form-control-sm" placeholder="Ej: Rotura en traslado WH-A" value={ajusteForm.observaciones} onChange={e => setAjusteForm(p => ({ ...p, observaciones: e.target.value }))} />
                </div>

                <button type="submit" disabled={ajusteLoading} className="btn btn-sm fw-semibold py-2 mt-1"
                  style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c' }}>
                  {ajusteLoading ? 'Registrando...' : 'Confirmar Ajuste'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState(initialForm)
  const [newCategoria, setNewCategoria] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState('')
  const [bulkError, setBulkError] = useState('')
  const [bulkForm, setBulkForm] = useState({ categoria: '', porcentaje: 10 })

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [skuError, setSkuError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)
  const [productFilters, setProductFilters] = useState({ q: '', categoria: '' })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  })

  useEffect(() => {
    getCategorias()
      .then((categoriasData) => {
        const categoriaInicial = categoriasData[0] || ''
        setCategorias(categoriasData)
        setForm((prev) => ({ ...prev, categoria: categoriaInicial }))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const pageData = await getProductosPage({
          page: pagination.page,
          pageSize: pagination.pageSize,
          q: productFilters.q,
          categoria: productFilters.categoria,
        })
        if (cancelled) return
        setProductos(pageData.items)
        setPagination((prev) => ({
          ...prev,
          total: pageData.total,
          totalPages: pageData.totalPages,
          hasNext: pageData.hasNext,
          hasPrevious: pageData.hasPrevious,
        }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [pagination.page, pagination.pageSize, productFilters.q, productFilters.categoria, reloadTick])

  const onChange = (event) => {
    const { name, value } = event.target
    if (name === 'sku') setSkuError('')
    if (name === 'categoria') setCategoryError('')
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onAddCategoria = async () => {
    setCategoryError('')
    setSavingCategory(true)
    try {
      const creada = await createCategoria(newCategoria)
      setCategorias((prev) => {
        if (prev.some((categoria) => categoria.toLowerCase() === creada.toLowerCase())) {
          return prev
        }
        return [...prev, creada].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      })
      setForm((prev) => ({ ...prev, categoria: creada }))
      setNewCategoria('')
    } catch (err) {
      setCategoryError(err.message)
    } finally {
      setSavingCategory(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSkuError('')
    setCategoryError('')
    setSavingProduct(true)
    try {
      let categoriaSeleccionada = form.categoria
      const categoriaPendiente = newCategoria.trim()

      // Si el usuario escribió una categoría nueva pero todavía no la agregó,
      // la creamos automáticamente antes de registrar el producto.
      if (
        categoriaPendiente &&
        !categorias.some((categoria) => categoria.toLowerCase() === categoriaPendiente.toLowerCase())
      ) {
        const creada = await createCategoria(categoriaPendiente)
        categoriaSeleccionada = creada
        setCategorias((prev) => [...prev, creada].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })))
        setNewCategoria('')
      }

      const nuevo = await createProducto({ ...form, categoria: categoriaSeleccionada })
      setPagination((prev) => ({ ...prev, page: 1 }))
      setReloadTick((prev) => prev + 1)
      setForm({ ...initialForm, categoria: categoriaSeleccionada || categorias[0] || '' })
      setSelectedProduct(nuevo)
    } catch (err) {
      const message = (err?.message || 'No se pudo crear el producto.').trim()
      const lower = message.toLowerCase()
      if (lower.includes('sku') || lower.includes('unique') || lower.includes('únic')) {
        setSkuError(message)
      } else if (lower.includes('categor')) {
        setCategoryError(message)
      } else {
        setSkuError(message)
      }
    } finally {
      setSavingProduct(false)
    }
  }

  const onSubmitBulkPrices = async (event) => {
    event.preventDefault()
    setBulkError('')
    setBulkResult('')
    setBulkLoading(true)
    try {
      const result = await bulkUpdatePreciosPorCategoria({
        categoriaNombre: bulkForm.categoria,
        porcentaje: bulkForm.porcentaje,
      })
      const pageData = await getProductosPage({
        page: pagination.page,
        pageSize: pagination.pageSize,
        q: productFilters.q,
        categoria: productFilters.categoria,
      })
      setProductos(pageData.items)
      setPagination((prev) => ({
        ...prev,
        total: pageData.total,
        totalPages: pageData.totalPages,
        hasNext: pageData.hasNext,
        hasPrevious: pageData.hasPrevious,
      }))
      setSelectedProduct((prev) => (!prev ? prev : pageData.items.find((p) => p.id === prev.id) || prev))
      const scope = bulkForm.categoria ? `categoría "${bulkForm.categoria}"` : 'todas las categorías'
      setBulkResult(`Precios actualizados en ${result.updated} productos (${scope}).`)
    } catch (err) {
      setBulkError(err?.message || 'No se pudo actualizar precios masivamente.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleOpenProduct = async (producto) => {
    setSelectedProduct(producto)
    setDrawerOpen(true)
    try {
      const detailed = await getProductoById(producto.id)
      setSelectedProduct((prev) => (prev?.id === detailed.id ? detailed : prev))
    } catch {
      // Si falla el refresh, mantenemos el resumen actual para no cortar UX.
    }
  }

  const fixedHeader = () => (
    <tr className="bg-light shadow-sm">
      <th className="ps-4 border-0 text-muted" style={{ fontSize: '11px', width: '24%', background: '#f8f9fa' }}>PRODUCTO / SKU</th>
      <th className="border-0 text-muted" style={{ fontSize: '11px', width: '14%', background: '#f8f9fa' }}>CATEGORÍA</th>
      <th className="border-0 text-muted text-center" style={{ fontSize: '11px', width: '14%', background: '#f8f9fa' }}>COSTO/PVP</th>
      <th className="border-0 text-muted text-center" style={{ fontSize: '11px', width: '14%', background: '#f8f9fa' }}>FÍSICO / RES. / DISP.</th>
      <th className="border-0 text-muted text-center" style={{ fontSize: '11px', width: '10%', background: '#f8f9fa' }}>MARGEN</th>
      <th className="border-0 text-muted text-center" style={{ fontSize: '11px', width: '12%', background: '#f8f9fa' }}>ÚLT. MOV.</th>
      <th className="pe-4 border-0 text-muted text-end" style={{ fontSize: '11px', width: '12%', background: '#f8f9fa' }}>ESTADO</th>
    </tr>
  )

  const rowContent = (index, producto) => {
    const stockFisico = Number(producto.stockFisico ?? producto.stock ?? 0)
    const stockReservado = Number(producto.stockReservado ?? 0)
    const stockDisponible = Number(producto.stockDisponible ?? producto.stock ?? 0)
    const bajoMinimo = stockDisponible < Number(producto.stockMinimo || 0)
    const margen = producto.precio > 0 ? (((producto.precio - producto.costo) / producto.precio) * 100).toFixed(1) : 0
    const ultimoMovimiento = producto.ultimoMovimiento || 'Sin mov.'

    return (
      <>
        <td className="ps-4" onClick={() => handleOpenProduct(producto)}>
          <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '250px' }}>{producto.nombre}</div>
          <div className="text-secondary" style={{ fontSize: '11px' }}>{producto.sku}</div>
        </td>
        <td onClick={() => handleOpenProduct(producto)}>
          <span className="badge bg-light text-secondary border fw-normal">{producto.categoria}</span>
        </td>
        <td className="text-center" onClick={() => handleOpenProduct(producto)}>
          <div className="text-muted" style={{ fontSize: '11px' }}>${producto.costo} / <span className="text-success fw-bold">${producto.precio}</span></div>
        </td>
        <td className="text-center" onClick={() => handleOpenProduct(producto)}>
          <div style={{ fontSize: '11px' }}>
            <span className="text-primary fw-semibold">{stockFisico}</span>
            <span className="text-muted"> / </span>
            <span className="text-warning fw-semibold">{stockReservado}</span>
            <span className="text-muted"> / </span>
            <span className="text-success fw-semibold">{stockDisponible}</span>
          </div>
        </td>
        <td className="text-center" onClick={() => handleOpenProduct(producto)}>
          <span className={`fw-bold ${margen > 30 ? 'text-success' : 'text-warning'}`}>{margen}%</span>
        </td>
        <td className="text-center" onClick={() => handleOpenProduct(producto)}>
          <span className="text-muted" style={{ fontSize: '11px' }}>{ultimoMovimiento}</span>
        </td>
        <td className="pe-4 text-end" onClick={() => handleOpenProduct(producto)}>
          <div className="d-flex flex-column align-items-end">
            <span className={`fw-bold ${bajoMinimo ? 'text-danger' : 'text-primary'}`} style={{ fontSize: '16px' }}>
              {stockDisponible}
            </span>
            <span className="text-muted" style={{ fontSize: '10px' }}>Mín: {producto.stockMinimo}</span>
            {bajoMinimo && <span className="badge bg-danger bg-opacity-10 text-danger p-1 mt-1" style={{ fontSize: '9px' }}>REPO REQUERIDA</span>}
          </div>
        </td>
      </>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-4">
        <h1 className="display-6 fw-bold text-dark">Gestión de Productos</h1>
        <p className="text-secondary">Administra el catálogo de inventario masivo con scroll ultra-rápido</p>
      </header>

      <div className="row g-4">
        {/* Formulario de Alta */}
        <div className="col-xl-4">
          <div className="ent-card">
            <div className="ent-card-header bg-primary bg-opacity-10">
              <span className="ent-card-title text-primary d-flex align-items-center gap-2">
                <PlusCircle size={16} /> Nuevo producto
              </span>
            </div>
            <div className="ent-card-body">
              <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
                <div className="filter-item w-100">
                  <label className="filter-label d-flex align-items-center gap-2">
                    <Hash size={12} /> SKU / Código
                    <span className="ms-auto text-muted" style={{ fontSize: '10px' }}>Debe ser único</span>
                  </label>
                  <input
                    className={`form-control form-control-sm ${skuError ? 'is-invalid' : ''}`}
                    name="sku"
                    placeholder="Ej: PRD-001"
                    value={form.sku}
                    onChange={onChange}
                    required
                  />
                  {skuError && <div className="invalid-feedback d-block" style={{ fontSize: '11px' }}>{skuError}</div>}
                </div>

                <div className="filter-item w-100">
                  <label className="filter-label d-flex align-items-center gap-2">
                    <Package size={12} /> Nombre del Producto
                  </label>
                  <input className="form-control form-control-sm" name="nombre" placeholder="Ej: Monitor 24&quot;" value={form.nombre} onChange={onChange} required />
                </div>

                <div className="filter-item w-100">
                  <label className="filter-label d-flex align-items-center gap-2">
                    <Layers size={12} /> Categoría
                  </label>
                  <select
                    className={`form-select form-select-sm ${categoryError ? 'is-invalid' : ''}`}
                    name="categoria"
                    value={form.categoria}
                    onChange={onChange}
                    required
                  >
                    <option value="" disabled>Seleccionar categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                  {categoryError && <div className="invalid-feedback d-block" style={{ fontSize: '11px' }}>{categoryError}</div>}
                  <div className="d-flex gap-2 mt-2">
                    <input
                      className="form-control form-control-sm"
                      placeholder="Nueva categoría"
                      value={newCategoria}
                      onChange={(e) => {
                        setCategoryError('')
                        setNewCategoria(e.target.value)
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={onAddCategoria}
                      disabled={savingCategory || !newCategoria.trim()}
                    >
                      {savingCategory ? 'Agregando...' : '+ Agregar'}
                    </button>
                  </div>
                </div>

                <div className="filter-item">
                  <label className="filter-label d-flex align-items-center gap-2 text-warning">
                    <ShieldAlert size={12} /> Stock Mínimo
                  </label>
                  <input className="form-control form-control-sm" type="number" name="stockMinimo" value={form.stockMinimo} onChange={onChange} min="0" required />
                  <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                    El stock inicial se registra luego desde Movimientos, seleccionando almacén.
                  </div>
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <div className="filter-item">
                      <label className="filter-label d-flex align-items-center gap-2">
                        <DollarSign size={12} /> Costo (Unit)
                      </label>
                      <input className="form-control form-control-sm" type="number" name="costo" value={form.costo} onChange={onChange} min="0" required />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="filter-item">
                      <label className="filter-label d-flex align-items-center gap-2 text-success">
                        <Tag size={12} /> Precio Venta
                      </label>
                      <input className="form-control form-control-sm" type="number" name="precio" value={form.precio} onChange={onChange} min="0" required />
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2 mt-2 py-2 fw-semibold"
                  disabled={savingCategory || savingProduct}
                >
                  <PlusCircle size={18} /> {savingProduct ? 'Registrando...' : 'Registrar Producto'}
                </button>
              </form>
            </div>
          </div>

          <div className="ent-card">
            <div className="ent-card-header bg-warning bg-opacity-10">
              <span className="ent-card-title text-warning d-flex align-items-center gap-2">
                <Tag size={16} /> Actualizacion Masiva de Precios
              </span>
            </div>
            <div className="ent-card-body">
              <form onSubmit={onSubmitBulkPrices} className="d-flex flex-column gap-3">
                <div className="filter-item">
                  <label className="filter-label">Categoría</label>
                  <select
                    className="form-select form-select-sm"
                    value={bulkForm.categoria}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, categoria: e.target.value }))}
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-item">
                  <label className="filter-label">% Ajuste</label>
                  <input
                    className="form-control form-control-sm"
                    type="number"
                    step="0.01"
                    value={bulkForm.porcentaje}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, porcentaje: e.target.value }))}
                    required
                  />
                  <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                    Usá positivo para aumentar y negativo para bajar.
                  </div>
                </div>

                {bulkError && <div className="invalid-feedback d-block" style={{ fontSize: '11px' }}>{bulkError}</div>}
                {bulkResult && <div className="text-success small" style={{ fontSize: '11px' }}>{bulkResult}</div>}

                <button className="btn btn-warning d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold" disabled={bulkLoading}>
                  {bulkLoading ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Listado de Productos con Virtual Scrolling */}
        <div className="col-xl-8">
          <div className="ent-card h-100" style={{ minHeight: '650px' }}>
            <div className="ent-card-header">
              <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap w-100">
                <span className="ent-card-title d-flex align-items-center gap-2">
                  <List size={16} /> Inventario Enterprise (Server-Side)
                </span>
                <span className="badge bg-primary bg-opacity-10 text-primary">Scalable Data</span>
              </div>
              <div className="row g-2 mt-2 w-100">
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Buscar por SKU o nombre..."
                    value={productFilters.q}
                    onChange={(e) => {
                      const value = e.target.value
                      setProductFilters((prev) => ({ ...prev, q: value }))
                      setPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select form-select-sm"
                    value={productFilters.categoria}
                    onChange={(e) => {
                      const value = e.target.value
                      setProductFilters((prev) => ({ ...prev, categoria: value }))
                      setPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select form-select-sm"
                    value={pagination.pageSize}
                    onChange={(e) => setPagination((prev) => ({ ...prev, page: 1, pageSize: Number(e.target.value) }))}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ent-card-body p-0">
              {loading ? (
                <div className="p-4 text-center text-muted">Cargando registros...</div>
              ) : (
                <>
                  <TableVirtuoso
                    style={{ height: '560px' }}
                    data={productos}
                    fixedHeaderContent={fixedHeader}
                    itemContent={rowContent}
                    components={VirtuosoTableComponents}
                  />
                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                    <small className="text-muted">
                      Página {pagination.page} de {pagination.totalPages} | Total: {pagination.total}
                    </small>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled={!pagination.hasPrevious}
                        onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <ProductDetailDrawer
        product={selectedProduct}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStockUpdated={(productoId, nuevoStock) => {
          setProductos(prev => prev.map(p => p.id === productoId ? { ...p, stock: nuevoStock } : p))
          setSelectedProduct(prev => prev?.id === productoId ? { ...prev, stock: nuevoStock } : prev)
        }}
        onProductUpdated={(updated) => {
          setProductos(prev => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
          setSelectedProduct((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
        }}
      />
    </div>
  )
}

export default Productos
