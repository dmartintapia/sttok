import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createMovimiento, getMovimientos, getAlmacenes, getReservasActivas, getProductoById, searchProductos } from '../services/dataService'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Package,
  ClipboardList,
  TrendingUp,
  Activity,
  FileText,
  MapPin
} from 'lucide-react'

const initialForm = {
  fecha: new Date().toISOString().slice(0, 10),
  productoId: '',
  tipo: 'entrada',
  almacen: 'WH-A',
  cantidad: 1,
  motivo: 'Reposición proveedor',
  referencia: '',
}

const MOTIVOS_POR_TIPO = {
  entrada: ['Reposición proveedor', 'Devolución cliente', 'Ajuste positivo'],
  salida: ['Venta entregada', 'Consumo interno', 'Ajuste por rotura'],
}

function Movimientos() {
  const [searchParams] = useSearchParams()
  const productoIdFromUrl = searchParams.get('productoId')
  const tipoFromUrl = searchParams.get('tipo')
  const tabFromUrl = searchParams.get('tab')

  const [productSearch, setProductSearch] = useState('')
  const [productOptions, setProductOptions] = useState([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [movimientos, setMovimientos] = useState([])
  const [reservas, setReservas] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    Promise.all([getMovimientos(), getAlmacenes(), getReservasActivas()]).then(([movimientosData, almacenesData, reservasData]) => {
      setMovimientos(movimientosData)
      setAlmacenes(almacenesData)
      setReservas(reservasData)
      const tipoInicial = tipoFromUrl === 'salida' ? 'salida' : 'entrada'
      setForm((prev) => ({
        ...prev,
        tipo: tipoInicial,
        motivo: MOTIVOS_POR_TIPO[tipoInicial]?.[0] || '',
      }))
      if (almacenesData[0]) {
        setForm((prev) => ({ ...prev, almacen: almacenesData[0].id }))
      }
      setLoading(false)
    })
  }, [productoIdFromUrl, tipoFromUrl])

  useEffect(() => {
    let cancelled = false
    const q = productSearch.trim()
    if (q.length < 2) {
      setProductOptions([])
      return
    }

    setSearchingProducts(true)
    const timer = setTimeout(async () => {
      try {
        const results = await searchProductos(q, 25)
        if (!cancelled) setProductOptions(results)
      } finally {
        if (!cancelled) setSearchingProducts(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [productSearch])

  useEffect(() => {
    let cancelled = false
    if (!productoIdFromUrl) return

    const loadPreselected = async () => {
      try {
        const product = await getProductoById(productoIdFromUrl)
        if (cancelled) return
        setForm((prev) => ({ ...prev, productoId: product.id }))
        setProductSearch(`${product.sku} - ${product.nombre}`)
        setProductOptions([product])
      } catch {
        // no-op
      }
    }
    loadPreselected()
    return () => {
      cancelled = true
    }
  }, [productoIdFromUrl])

  useEffect(() => {
    if (tabFromUrl === 'reservas' && !loading) {
      const target = document.getElementById('reservas-activas')
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [tabFromUrl, loading])

  const onChange = (event) => {
    const { name, value } = event.target
    if (name === 'tipo') {
      const motivoDefault = MOTIVOS_POR_TIPO[value]?.[0] || ''
      setForm((prev) => ({ ...prev, [name]: value, motivo: motivoDefault }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    try {
      if (!form.productoId) {
        alert('Seleccioná un producto desde la búsqueda.')
        return
      }
      const nuevo = await createMovimiento(form)
      setMovimientos((prev) => [nuevo, ...prev])
      setForm((prev) => ({
        ...initialForm,
        productoId: prev.productoId,
        almacen: prev.almacen,
        tipo: prev.tipo,
        motivo: MOTIVOS_POR_TIPO[prev.tipo]?.[0] || '',
      }))
      const reservasData = await getReservasActivas()
      setReservas(reservasData)
    } catch (err) {
      alert(err.message)
    }
  }

  // Métricas del día
  const entradasHoy = movimientos.filter(m => m.tipo === 'entrada' && m.fecha === initialForm.fecha).length
  const salidasHoy = movimientos.filter(m => m.tipo === 'salida' && m.fecha === initialForm.fecha).length
  const totalItemsHoy = movimientos
    .filter(m => m.fecha === initialForm.fecha)
    .reduce((acc, curr) => acc + Number(curr.cantidad), 0)

  const filteredMovimientos = movimientos.filter(m =>
    String(m.producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(m.referencia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(m.almacen || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const reservasFiltradas = reservas.filter((r) => (
    productoIdFromUrl ? r.product_id === Number(productoIdFromUrl) : true
  ))

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="display-6 fw-bold text-dark">Centro de Control Logístico</h1>
          <p className="text-secondary">Gestión integral de entradas, salidas y trazabilidad de almacén</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2">
            <Calendar size={14} /> Hoy
          </button>
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-2">
            <ClipboardList size={14} /> Reporte Kardex
          </button>
        </div>
      </header>

      {/* KPI Cards Logísticas */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="ent-card border-start border-4 border-success p-3">
            <div className="d-flex justify-content-between">
              <div>
                <div className="text-muted small fw-bold">ENTRADAS (HOY)</div>
                <div className="h4 fw-bold mb-0">{entradasHoy} ops.</div>
              </div>
              <div className="bg-success bg-opacity-10 p-2 rounded">
                <ArrowUpCircle className="text-success" size={24} />
              </div>
            </div>
            <div className="mt-2 small text-success">
              <TrendingUp size={12} /> +12% vs ayer
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="ent-card border-start border-4 border-danger p-3">
            <div className="d-flex justify-content-between">
              <div>
                <div className="text-muted small fw-bold">SALIDAS (HOY)</div>
                <div className="h4 fw-bold mb-0">{salidasHoy} ops.</div>
              </div>
              <div className="bg-danger bg-opacity-10 p-2 rounded">
                <ArrowDownCircle className="text-danger" size={24} />
              </div>
            </div>
            <div className="mt-2 small text-danger">
              <TrendingUp size={12} /> +5% vs ayer
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="ent-card border-start border-4 border-primary p-3">
            <div className="d-flex justify-content-between">
              <div>
                <div className="text-muted small fw-bold">ITEMS MOVILIZADOS</div>
                <div className="h4 fw-bold mb-0">{totalItemsHoy} un.</div>
              </div>
              <div className="bg-primary bg-opacity-10 p-2 rounded">
                <Activity className="text-primary" size={24} />
              </div>
            </div>
            <div className="mt-2 small text-primary text-opacity-75">
              Flujo operativo activo
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Registro de Movimiento */}
        <div className="col-xl-4">
          <div className="ent-card h-100">
            <div className="ent-card-header bg-primary bg-opacity-10">
              <span className="ent-card-title text-primary d-flex align-items-center gap-2">
                <PlusCircle size={16} /> Registro de Operación
              </span>
            </div>
            <div className="ent-card-body">
              <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
                <div className="filter-item">
                  <label className="filter-label"><Calendar size={12} className="me-1" /> Fecha de Operación</label>
                  <input className="form-control form-control-sm" type="date" name="fecha" value={form.fecha} onChange={onChange} required />
                </div>

                <div className="filter-item">
                  <label className="filter-label"><Package size={12} className="me-1" /> Seleccionar Producto</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Buscar por SKU o nombre (mín. 2 letras)"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                    }}
                    required
                  />
                  <div className="small text-muted mt-1">
                    {searchingProducts ? 'Buscando productos...' : `Resultados: ${productOptions.length}`}
                  </div>
                  {productOptions.length > 0 && (
                    <div className="border rounded mt-1 bg-white" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      {productOptions.map((producto) => (
                        <button
                          key={producto.id}
                          type="button"
                          className="btn btn-link w-100 text-start text-decoration-none px-2 py-1"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, productoId: producto.id }))
                            setProductSearch(`${producto.sku} - ${producto.nombre}`)
                            setProductOptions([])
                          }}
                        >
                          <span className="fw-semibold">{producto.sku}</span> - {producto.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="filter-item">
                  <label className="filter-label"><MapPin size={12} className="me-1" /> Almacén Destino/Origen</label>
                  <select className="form-select form-select-sm" name="almacen" value={form.almacen} onChange={onChange} required>
                    {almacenes.map(alm => (
                      <option key={alm.id} value={alm.id}>{alm.nombre} ({alm.id})</option>
                    ))}
                  </select>
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <div className="filter-item">
                      <label className="filter-label">Tipo de Flujo</label>
                      <div className="btn-group w-100" role="group">
                        <input type="radio" className="btn-check" name="tipo" id="tipoEntrada" value="entrada" checked={form.tipo === 'entrada'} onChange={onChange} />
                        <label className="btn btn-outline-success btn-sm" htmlFor="tipoEntrada">Entrada</label>

                        <input type="radio" className="btn-check" name="tipo" id="tipoSalida" value="salida" checked={form.tipo === 'salida'} onChange={onChange} />
                        <label className="btn btn-outline-danger btn-sm" htmlFor="tipoSalida">Salida</label>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="filter-item">
                      <label className="filter-label">Cantidad</label>
                      <input className="form-control form-control-sm" type="number" name="cantidad" value={form.cantidad} onChange={onChange} min="1" required />
                    </div>
                  </div>
                </div>

                <div className="filter-item">
                  <label className="filter-label">Motivo</label>
                  <select className="form-select form-select-sm" name="motivo" value={form.motivo} onChange={onChange} required>
                    {(MOTIVOS_POR_TIPO[form.tipo] || []).map((motivo) => (
                      <option key={motivo} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-item">
                  <label className="filter-label"><FileText size={12} className="me-1" /> Referencia / Documento</label>
                  <input className="form-control form-control-sm" name="referencia" placeholder="Ej: Factura #1234 o Guía" value={form.referencia} onChange={onChange} required />
                </div>

                <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 mt-2 py-2 fw-semibold">
                  Procesar Operación
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Historial de Movimientos */}
        <div className="col-xl-8">
          <div className="ent-card h-100">
            <div className="ent-card-header d-flex justify-content-between align-items-center">
              <span className="ent-card-title d-flex align-items-center gap-2">
                <History size={16} /> Historial de Movimientos (Kardex)
              </span>
              <div className="d-flex gap-2">
                <div className="position-relative">
                  <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" />
                  <input
                    type="text"
                    className="form-control window-search-input ps-4"
                    placeholder="Buscar producto o ref..."
                    style={{ width: '200px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="btn btn-light btn-sm border">
                  <Filter size={14} />
                </button>
              </div>
            </div>
            <div className="ent-card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '480px' }}>
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                  <thead className="bg-light sticky-top">
                    <tr>
                      <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>FECHA</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>PRODUCTO</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>ALMACÉN</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>TIPO</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>MOTIVO</th>
                      <th className="text-muted small text-center" style={{ fontSize: '11px' }}>CANTIDAD</th>
                      <th className="pe-4 text-muted small" style={{ fontSize: '11px' }}>REFERENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="7" className="text-center py-5 text-muted">Cargando movimientos...</td></tr>
                    ) : filteredMovimientos.length > 0 ? (
                      filteredMovimientos.map((item) => (
                        <tr key={item.id}>
                          <td className="ps-4 text-secondary">{item.fecha}</td>
                          <td>
                            <div className="fw-semibold text-dark">{item.producto}</div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '10px' }}>{item.almacen || 'WH-A'}</span>
                          </td>
                          <td>
                            <span className={`badge ${item.tipo === 'entrada' ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${item.tipo === 'entrada' ? 'text-success' : 'text-danger'} p-2 rounded-pill`} style={{ fontSize: '10px', minWidth: '70px', textAlign: 'center' }}>
                              {item.tipo.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-muted small">{item.motivo || '-'}</td>
                          <td className="text-center fw-bold text-dark">{item.cantidad}</td>
                          <td className="pe-4 text-secondary italic small">{item.referencia}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" className="text-center py-5 text-muted italic">No se encontraron movimientos.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1" id="reservas-activas">
        <div className="col-12">
          <div className="ent-card">
            <div className="ent-card-header d-flex justify-content-between align-items-center">
              <span className="ent-card-title d-flex align-items-center gap-2">
                <History size={16} /> Reservas Activas
              </span>
              {productoIdFromUrl && (
                <span className="badge bg-primary bg-opacity-10 text-primary">
                  Producto #{productoIdFromUrl}
                </span>
              )}
            </div>
            <div className="ent-card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>PRODUCTO</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>SKU</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>REFERENCIA</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>MOTIVO</th>
                      <th className="pe-4 text-muted small text-end" style={{ fontSize: '11px' }}>RESERVADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.length > 0 ? (
                      reservasFiltradas.map((r) => (
                        <tr key={`${r.product_id}-${r.reference}`}>
                          <td className="ps-4 fw-semibold">{r.product_name}</td>
                          <td>{r.sku}</td>
                          <td>{r.reference}</td>
                          <td className="text-muted">{r.reason || '-'}</td>
                          <td className="pe-4 text-end fw-bold text-warning">{r.reserved_quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="text-center py-4 text-muted">No hay reservas activas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Movimientos
