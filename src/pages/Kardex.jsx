import { useEffect, useState } from 'react'
import { getKardexPage, searchProductos } from '../services/dataService'

function Kardex() {
  const [kardex, setKardex] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [productOptions, setProductOptions] = useState([])
  const [productSearch, setProductSearch] = useState('')

  const [filters, setFilters] = useState({ productoId: '', tipo: '', desde: '', hasta: '', q: '' })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await getKardexPage({
          page: pagination.page,
          pageSize: pagination.pageSize,
          productoId: filters.productoId,
          tipo: filters.tipo,
          desde: filters.desde,
          hasta: filters.hasta,
          q: filters.q,
        })
        if (cancelled) return
        setKardex(data.items)
        setPagination((prev) => ({
          ...prev,
          total: data.total,
          totalPages: data.totalPages,
          hasNext: data.hasNext,
          hasPrevious: data.hasPrevious,
        }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [pagination.page, pagination.pageSize, filters.productoId, filters.tipo, filters.desde, filters.hasta, filters.q])

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
        const results = await searchProductos(q, 20)
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

  const onChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const onFilter = (event) => {
    event.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  return (
    <div>
      <h1 className="h3 mb-4">Kardex</h1>

      <div className="card mb-4">
        <div className="card-body">
          <form className="row g-2" onSubmit={onFilter}>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Buscar producto por SKU o nombre..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
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
                        setFilters((prev) => ({ ...prev, productoId: String(producto.id) }))
                        setProductSearch(`${producto.sku} - ${producto.nombre}`)
                        setProductOptions([])
                        setPagination((prev) => ({ ...prev, page: 1 }))
                      }}
                    >
                      <span className="fw-semibold">{producto.sku}</span> - {producto.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                name="q"
                value={filters.q}
                onChange={onChange}
                placeholder="Texto libre"
              />
            </div>
            <div className="col-md-2">
              <select className="form-select" name="tipo" value={filters.tipo} onChange={onChange}>
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>
            <div className="col-md-2">
              <input className="form-control" type="date" name="desde" value={filters.desde} onChange={onChange} />
            </div>
            <div className="col-md-2">
              <input className="form-control" type="date" name="hasta" value={filters.hasta} onChange={onChange} />
            </div>
            <div className="col-md-6 d-grid d-md-flex gap-2">
              <button className="btn btn-primary" type="submit">
                Filtrar
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => {
                  setFilters({ productoId: '', tipo: '', desde: '', hasta: '', q: '' })
                  setProductSearch('')
                  setProductOptions([])
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                Limpiar
              </button>
            </div>
            <div className="col-md-2 ms-auto">
              <select
                className="form-select"
                value={pagination.pageSize}
                onChange={(e) => setPagination((prev) => ({ ...prev, page: 1, pageSize: Number(e.target.value) }))}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-responsive">
          {loading ? (
            <div className="text-center text-muted py-4">Cargando kardex...</div>
          ) : (
            <>
              <table className="table table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Saldo</th>
                    <th>Motivo</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {kardex.map((row) => (
                    <tr key={row.id}>
                      <td>{row.fecha}</td>
                      <td>{row.sku} - {row.producto}</td>
                      <td className="text-capitalize">{row.tipo}</td>
                      <td>{row.cantidad}</td>
                      <td>{row.saldo}</td>
                      <td>{row.motivo || '-'}</td>
                      <td>{row.referencia || '-'}</td>
                    </tr>
                  ))}
                  {!kardex.length && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">Sin movimientos para los filtros actuales.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="d-flex justify-content-between align-items-center mt-3">
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
  )
}

export default Kardex
