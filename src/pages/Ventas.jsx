import { useEffect, useState } from 'react'
import { getProductos, getAlmacenes, getClientes, createMovimiento } from '../services/dataService'
import {
    Tag,
    PlusCircle,
    Package,
    MapPin,
    User,
    DollarSign,
    Calendar,
    FileText,
    BadgeCheck,
    AlertTriangle,
    ShoppingCart
} from 'lucide-react'

const initialForm = {
    fecha: new Date().toISOString().slice(0, 10),
    productoId: '',
    clienteId: '',
    almacen: 'WH-A',
    cantidad: 1,
    precioVenta: 0,
    referencia: '',
}

function Ventas() {
    const [productos, setProductos] = useState([])
    const [almacenes, setAlmacenes] = useState([])
    const [clientes, setClientes] = useState([])
    const [form, setForm] = useState(initialForm)
    const [loading, setLoading] = useState(true)
    const [ventasRecientes, setVentasRecientes] = useState([])

    useEffect(() => {
        Promise.all([getProductos(), getAlmacenes(), getClientes()]).then(
            ([productosData, almacenesData, clientesData]) => {
                setProductos(productosData)
                setAlmacenes(almacenesData)
                setClientes(clientesData)
                if (productosData[0]) {
                    setForm(prev => ({
                        ...prev,
                        productoId: productosData[0].id,
                        precioVenta: productosData[0].precio
                    }))
                }
                if (clientesData[0]) setForm(prev => ({ ...prev, clienteId: clientesData[0].id }))
                setLoading(false)
            }
        )
    }, [])

    const onChange = (e) => {
        const { name, value } = e.target
        if (name === 'productoId') {
            const selected = productos.find(p => p.id === Number(value))
            setForm(prev => ({ ...prev, productoId: value, precioVenta: selected ? selected.precio : 0 }))
        } else {
            setForm(prev => ({ ...prev, [name]: value }))
        }
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        try {
            const selectedProduct = productos.find(p => p.id === Number(form.productoId))
            const stockDisponible = selectedProduct?.distribucion[form.almacen] || 0

            if (form.cantidad > stockDisponible) {
                throw new Error(`Stock insuficiente en ${form.almacen}. Disponible: ${stockDisponible}`)
            }

            // Simulación de creación de venta vinculada a movimiento de salida
            const payload = {
                ...form,
                tipo: 'salida',
                referencia: `FACT-${form.referencia || Date.now()}`,
            }
            await createMovimiento(payload)

            const nuevaVenta = {
                id: Date.now(),
                fecha: form.fecha,
                producto: selectedProduct?.nombre,
                cliente: clientes.find(c => c.id === Number(form.clienteId))?.nombre,
                cantidad: form.cantidad,
                total: form.cantidad * form.precioVenta,
                almacen: form.almacen
            }

            setVentasRecientes(prev => [nuevaVenta, ...prev])
            setForm(prev => ({ ...initialForm, productoId: prev.productoId, clienteId: prev.clienteId, almacen: prev.almacen, precioVenta: selectedProduct?.precio || 0 }))
            alert('Venta procesada con éxito. Stock rebajado del almacén.')
        } catch (err) {
            alert(err.message)
        }
    }

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-4">
                <h1 className="display-6 fw-bold text-dark">Terminal de Ventas (Punto de Venta)</h1>
                <p className="text-secondary">Gestiona salidas de inventario por ventas directas con validación de stock multisede</p>
            </header>

            <div className="row g-4">
                {/* Formulario de Venta */}
                <div className="col-xl-4">
                    <div className="ent-card">
                        <div className="ent-card-header bg-primary bg-opacity-10">
                            <span className="ent-card-title text-primary d-flex align-items-center gap-2">
                                <ShoppingCart size={16} /> Registro de Venta Directa
                            </span>
                        </div>
                        <div className="ent-card-body">
                            <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
                                <div className="row g-2">
                                    <div className="col-6">
                                        <div className="filter-item">
                                            <label className="filter-label"><Calendar size={12} className="me-1" /> Fecha</label>
                                            <input className="form-control form-control-sm" type="date" name="fecha" value={form.fecha} onChange={onChange} required />
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="filter-item">
                                            <label className="filter-label"><FileText size={12} className="me-1" /> Ref. Factura</label>
                                            <input className="form-control form-control-sm" name="referencia" placeholder="ABC-99" value={form.referencia} onChange={onChange} />
                                        </div>
                                    </div>
                                </div>

                                <div className="filter-item">
                                    <label className="filter-label"><User size={12} className="me-1" /> Cliente</label>
                                    <select className="form-select form-select-sm" name="clienteId" value={form.clienteId} onChange={onChange} required>
                                        {clientes.map(cl => <option key={cl.id} value={cl.id}>{cl.nombre}</option>)}
                                    </select>
                                </div>

                                <div className="filter-item">
                                    <label className="filter-label"><Package size={12} className="me-1" /> Producto</label>
                                    <select className="form-select form-select-sm" name="productoId" value={form.productoId} onChange={onChange} required>
                                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>)}
                                    </select>
                                </div>

                                <div className="filter-item">
                                    <label className="filter-label"><MapPin size={12} className="me-1" /> Almacén de Despacho</label>
                                    <select className="form-select form-select-sm" name="almacen" value={form.almacen} onChange={onChange} required>
                                        {almacenes.map(alm => <option key={alm.id} value={alm.id}>{alm.nombre} ({alm.id})</option>)}
                                    </select>
                                </div>

                                <div className="row g-2">
                                    <div className="col-6">
                                        <div className="filter-item">
                                            <label className="filter-label">Cantidad</label>
                                            <input className="form-control form-control-sm" type="number" name="cantidad" value={form.cantidad} onChange={onChange} min="1" required />
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="filter-item">
                                            <label className="filter-label">Precio Unitario ($)</label>
                                            <input className="form-control form-control-sm" type="number" name="precioVenta" value={form.precioVenta} onChange={onChange} min="0" step="0.01" required />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-primary bg-opacity-10 p-3 rounded border border-primary border-opacity-25 text-center my-2">
                                    <div className="small text-primary mb-1">TOTAL VENTA</div>
                                    <div className="h2 fw-bold text-primary mb-0">${(form.cantidad * form.precioVenta).toLocaleString()}</div>
                                </div>

                                <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold shadow-sm">
                                    Procesar Venta y Confirmar Salida
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Listado de Ventas Recientes */}
                <div className="col-xl-8">
                    <div className="ent-card h-100">
                        <div className="ent-card-header d-flex justify-content-between align-items-center">
                            <span className="ent-card-title d-flex align-items-center gap-2">
                                <BadgeCheck size={16} /> Historial de Ventas (Sesión Actual)
                            </span>
                        </div>
                        <div className="ent-card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>FECHA</th>
                                            <th className="text-muted small" style={{ fontSize: '11px' }}>PRODUCTO</th>
                                            <th className="text-muted small" style={{ fontSize: '11px' }}>CLIENTE</th>
                                            <th className="text-muted small text-center" style={{ fontSize: '11px' }}>CANT</th>
                                            <th className="text-muted small text-end" style={{ fontSize: '11px' }}>TOTAL</th>
                                            <th className="pe-4 text-muted small text-end" style={{ fontSize: '11px' }}>ALM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventasRecientes.length > 0 ? (
                                            ventasRecientes.map(v => (
                                                <tr key={v.id}>
                                                    <td className="ps-4 text-secondary">{v.fecha}</td>
                                                    <td className="fw-semibold">{v.producto}</td>
                                                    <td className="text-muted small">{v.cliente}</td>
                                                    <td className="text-center fw-bold">{v.cantidad}</td>
                                                    <td className="text-end text-primary fw-bold">${v.total.toLocaleString()}</td>
                                                    <td className="pe-4 text-end"><span className="badge bg-light text-dark border">{v.almacen}</span></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" className="text-center py-5 text-muted italic">
                                                <ShoppingCart size={24} className="d-block mx-auto mb-2 opacity-25" />
                                                Esperando registros de venta...
                                            </td></tr>
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

export default Ventas
