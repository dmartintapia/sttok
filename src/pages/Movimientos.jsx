import { useEffect, useState } from 'react'
import { createMovimiento, getMovimientos, getProductos } from '../services/dataService'

const initialForm = {
  fecha: new Date().toISOString().slice(0, 10),
  productoId: '',
  tipo: 'entrada',
  cantidad: 1,
  referencia: '',
}

function Movimientos() {
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProductos(), getMovimientos()]).then(([productosData, movimientosData]) => {
      setProductos(productosData)
      setMovimientos(movimientosData)
      if (productosData[0]) {
        setForm((prev) => ({ ...prev, productoId: productosData[0].id }))
      }
    })
  }, [])

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const nuevo = await createMovimiento(form)
      setMovimientos((prev) => [nuevo, ...prev])
      setForm((prev) => ({ ...initialForm, productoId: prev.productoId }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h1 className="h3 mb-4">Movimientos</h1>
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-body">
              <h2 className="h5">Registrar movimiento</h2>
              <form onSubmit={onSubmit} className="d-flex flex-column gap-2 mt-3">
                <input className="form-control" type="date" name="fecha" value={form.fecha} onChange={onChange} required />
                <select className="form-select" name="productoId" value={form.productoId} onChange={onChange} required>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre}
                    </option>
                  ))}
                </select>
                <select className="form-select" name="tipo" value={form.tipo} onChange={onChange}>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
                <input className="form-control" type="number" name="cantidad" value={form.cantidad} onChange={onChange} min="1" required />
                <input className="form-control" name="referencia" placeholder="Referencia" value={form.referencia} onChange={onChange} required />
                <button className="btn btn-primary mt-2">Registrar</button>
              </form>
              {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-body table-responsive">
              <h2 className="h5 mb-3">Historial</h2>
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((item) => (
                    <tr key={item.id}>
                      <td>{item.fecha}</td>
                      <td>{item.producto}</td>
                      <td>
                        <span className={`badge ${item.tipo === 'entrada' ? 'text-bg-success' : 'text-bg-danger'}`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td>{item.cantidad}</td>
                      <td>{item.referencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Movimientos
