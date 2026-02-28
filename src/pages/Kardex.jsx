import { useEffect, useState } from 'react'
import { getKardex, getProductos } from '../services/dataService'

function Kardex() {
  const [productos, setProductos] = useState([])
  const [kardex, setKardex] = useState([])
  const [filters, setFilters] = useState({ productoId: '', tipo: '', desde: '', hasta: '' })

  useEffect(() => {
    getProductos().then(setProductos)
    getKardex().then(setKardex)
  }, [])

  const onChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const onFilter = async (event) => {
    event.preventDefault()
    const data = await getKardex(filters)
    setKardex(data)
  }

  return (
    <div>
      <h1 className="h3 mb-4">Kardex</h1>

      <div className="card mb-4">
        <div className="card-body">
          <form className="row g-2" onSubmit={onFilter}>
            <div className="col-md-3">
              <select className="form-select" name="productoId" value={filters.productoId} onChange={onChange}>
                <option value="">Todos los productos</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select" name="tipo" value={filters.tipo} onChange={onChange}>
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>
            <div className="col-md-2">
              <input className="form-control" type="date" name="desde" value={filters.desde} onChange={onChange} />
            </div>
            <div className="col-md-2">
              <input className="form-control" type="date" name="hasta" value={filters.hasta} onChange={onChange} />
            </div>
            <div className="col-md-3 d-grid d-md-flex gap-2">
              <button className="btn btn-primary" type="submit">
                Filtrar
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={async () => {
                  const reset = { productoId: '', tipo: '', desde: '', hasta: '' }
                  setFilters(reset)
                  const data = await getKardex(reset)
                  setKardex(data)
                }}
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {kardex.map((row) => (
                <tr key={row.id}>
                  <td>{row.fecha}</td>
                  <td>{row.producto}</td>
                  <td>{row.tipo}</td>
                  <td>{row.cantidad}</td>
                  <td>{row.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Kardex
