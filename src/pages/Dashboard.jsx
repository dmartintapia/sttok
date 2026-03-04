import { useEffect, useState } from 'react'
import { AlertCircle, Archive, Boxes, PackageMinus, PackageSearch } from 'lucide-react'
import { getDashboardData, getProductos } from '../services/dataService'

function Dashboard() {
  const [data, setData] = useState(null)
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getDashboardData(), getProductos()])
      .then(([dashboardData, productosData]) => {
        setData(dashboardData)
        setProductos(productosData)
      })
      .catch((err) => {
        setError(err?.message || 'No se pudo cargar el dashboard.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="ent-card p-4">
        <h2 className="h5 mb-2">No se pudo cargar el dashboard</h2>
        <p className="text-muted mb-0">{error || 'Error desconocido.'}</p>
      </div>
    )
  }

  const bajoMinimoRows = productos
    .filter((p) => p.stock < p.stockMinimo)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8)

  const kpis = [
    { label: 'Productos', value: data.resumen.totalProductos, icon: <Boxes size={18} className="text-primary" /> },
    { label: 'Stock Total', value: data.resumen.stockTotal, icon: <Archive size={18} className="text-primary" /> },
    { label: 'Bajo Mínimo', value: data.resumen.bajoMinimo, icon: <PackageMinus size={18} className="text-warning" /> },
    { label: 'Sin Stock', value: data.resumen.sinStock, icon: <PackageSearch size={18} className="text-danger" /> },
  ]

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-4">
        <h1 className="display-6 fw-bold text-dark">Dashboard de Inventario</h1>
        <p className="text-secondary">Vista operativa del estado de stock y alertas críticas</p>
      </header>

      <div className="row g-3 mb-4">
        {kpis.map((kpi) => (
          <div className="col-md-3" key={kpi.label}>
            <div className="ent-card p-3 h-100">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small fw-bold text-uppercase">{kpi.label}</span>
                {kpi.icon}
              </div>
              <div className="h3 fw-bold mt-2 mb-0">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="ent-card h-100">
            <div className="ent-card-header">
              <span className="ent-card-title">Stock por Almacén</span>
            </div>
            <div className="ent-card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>ALMACÉN</th>
                      <th className="pe-4 text-muted small text-end" style={{ fontSize: '11px' }}>STOCK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stockPorDeposito.length > 0 ? (
                      data.stockPorDeposito.map((row) => (
                        <tr key={row.deposit_id}>
                          <td className="ps-4 fw-semibold">{row.deposit_name}</td>
                          <td className="pe-4 text-end fw-bold">{row.current_stock}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-muted">Sin datos de stock por almacén.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="ent-card h-100">
            <div className="ent-card-header">
              <span className="ent-card-title">Alertas Críticas</span>
              <AlertCircle size={14} className="text-danger" />
            </div>
            <div className="ent-card-body">
              <div className="d-flex flex-column gap-2">
                {data.alertas.length > 0 ? (
                  data.alertas.map((alerta) => (
                    <div key={alerta.id} className="p-2 border-start border-3 border-warning bg-light" style={{ fontSize: '12px' }}>
                      {alerta.mensaje}
                    </div>
                  ))
                ) : (
                  <div className="text-muted">No hay alertas activas.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="ent-card">
            <div className="ent-card-header">
              <span className="ent-card-title">Productos Bajo Stock Mínimo</span>
            </div>
            <div className="ent-card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>PRODUCTO</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>SKU</th>
                      <th className="text-muted small text-end" style={{ fontSize: '11px' }}>STOCK</th>
                      <th className="pe-4 text-muted small text-end" style={{ fontSize: '11px' }}>MÍNIMO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bajoMinimoRows.length > 0 ? (
                      bajoMinimoRows.map((p) => (
                        <tr key={p.id}>
                          <td className="ps-4 fw-semibold">{p.nombre}</td>
                          <td>{p.sku}</td>
                          <td className="text-end text-danger fw-bold">{p.stock}</td>
                          <td className="pe-4 text-end">{p.stockMinimo}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">No hay productos por debajo del mínimo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="ent-card">
            <div className="ent-card-header">
              <span className="ent-card-title">Reservas Activas</span>
            </div>
            <div className="ent-card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>PRODUCTO</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>SKU</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>REFERENCIA</th>
                      <th className="text-muted small" style={{ fontSize: '11px' }}>ALMACÉN</th>
                      <th className="text-muted small text-end" style={{ fontSize: '11px' }}>RESERVADO</th>
                      <th className="pe-4 text-muted small text-end" style={{ fontSize: '11px' }}>ÚLT. ACT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeReservations?.length > 0 ? (
                      data.activeReservations.slice(0, 12).map((r) => (
                        <tr key={`${r.product_id}-${r.reference}`}>
                          <td className="ps-4 fw-semibold">{r.product_name}</td>
                          <td>{r.sku}</td>
                          <td>{r.reference}</td>
                          <td>{r.deposit_name || 'N/D'}</td>
                          <td className="text-end fw-bold text-warning">{r.reserved_quantity}</td>
                          <td className="pe-4 text-end text-muted">{r.last_update}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">No hay reservas activas.</td>
                      </tr>
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

export default Dashboard
