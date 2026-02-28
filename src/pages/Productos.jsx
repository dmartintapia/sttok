import { useEffect, useState } from 'react'
import { createProducto, getProductos } from '../services/dataService'

const initialForm = {
  sku: '',
  nombre: '',
  categoria: '',
  stock: 0,
  stockMinimo: 0,
  costo: 0,
  precio: 0,
}

function Productos() {
  const [productos, setProductos] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProductos()
      .then(setProductos)
      .finally(() => setLoading(false))
  }, [])

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const nuevo = await createProducto(form)
    setProductos((prev) => [nuevo, ...prev])
    setForm(initialForm)
  }

  return (
    <div>
      <h1 className="h3 mb-4">Productos</h1>
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-body">
              <h2 className="h5">Nuevo producto</h2>
              <form onSubmit={onSubmit} className="d-flex flex-column gap-2 mt-3">
                <input className="form-control" name="sku" placeholder="SKU" value={form.sku} onChange={onChange} required />
                <input className="form-control" name="nombre" placeholder="Nombre" value={form.nombre} onChange={onChange} required />
                <input className="form-control" name="categoria" placeholder="Categoría" value={form.categoria} onChange={onChange} required />
                <input className="form-control" type="number" name="stock" placeholder="Stock" value={form.stock} onChange={onChange} min="0" required />
                <input className="form-control" type="number" name="stockMinimo" placeholder="Stock mínimo" value={form.stockMinimo} onChange={onChange} min="0" required />
                <input className="form-control" type="number" name="costo" placeholder="Costo" value={form.costo} onChange={onChange} min="0" required />
                <input className="form-control" type="number" name="precio" placeholder="Precio" value={form.precio} onChange={onChange} min="0" required />
                <button className="btn btn-primary mt-2">Guardar</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-body table-responsive">
              <h2 className="h5 mb-3">Listado</h2>
              {loading ? (
                <p>Cargando productos...</p>
              ) : (
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Stock</th>
                      <th>Mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((producto) => (
                      <tr key={producto.id}>
                        <td>{producto.sku}</td>
                        <td>{producto.nombre}</td>
                        <td>{producto.categoria}</td>
                        <td>{producto.stock}</td>
                        <td>{producto.stockMinimo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Productos
