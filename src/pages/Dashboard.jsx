import { useEffect, useState } from 'react'
import { getDashboardData } from '../services/dataService'

function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Cargando dashboard...</p>

  const cards = [
    { label: 'Productos', value: data.resumen.totalProductos, color: 'primary' },
    { label: 'Stock total', value: data.resumen.stockTotal, color: 'success' },
    { label: 'Bajo mínimo', value: data.resumen.bajoMinimo, color: 'warning' },
    { label: 'Sin stock', value: data.resumen.sinStock, color: 'danger' },
  ]

  return (
    <div>
      <h1 className="h3 mb-4">Dashboard</h1>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-sm-6 col-lg-3" key={card.label}>
            <div className={`card border-${card.color}`}>
              <div className="card-body">
                <p className="mb-1 text-muted">{card.label}</p>
                <h4 className="mb-0">{card.value}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="h5 mb-3">Alertas de stock</h2>
        <div className="d-flex flex-column gap-2">
          {data.alertas.map((alerta) => (
            <div key={alerta.id} className={`alert alert-${alerta.tipo} mb-0`} role="alert">
              {alerta.mensaje}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
