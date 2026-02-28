import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProductos, getAlmacenes, getProveedores, createMovimiento } from '../services/dataService'
import {
    ShoppingBag,
    PlusCircle,
    Package,
    MapPin,
    Truck,
    DollarSign,
    Calendar,
    FileText,
    BadgeCheck,
    TrendingDown
} from 'lucide-react'

const initialForm = {
    fecha: new Date().toISOString().slice(0, 10),
    productoId: '',
    proveedorId: '',
    almacen: 'WH-A',
    cantidad: 1,
    costoUnit: 0,
    referencia: '',
}

function Compras() {
    const [searchParams] = useSearchParams()
    const productoIdFromUrl = searchParams.get('productoId')

    const [productos, setProductos] = useState([])
    const [almacenes, setAlmacenes] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [form, setForm] = useState(initialForm)
    const [loading, setLoading] = useState(true)
    const [comprasRecientes, setComprasRecientes] = useState([])

    useEffect(() => {
        Promise.all([getProductos(), getAlmacenes(), getProveedores()]).then(
            ([productosData, almacenesData, proveedoresData]) => {
                setProductos(productosData)
                setAlmacenes(almacenesData)
                setProveedores(proveedoresData)
                // Pre-seleccionar producto si viene desde Inventario
                const defaultProductoId = productoIdFromUrl
                    ? Number(productoIdFromUrl)
                    : productosData[0]?.id
                if (defaultProductoId) setForm(prev => ({ ...prev, productoId: defaultProductoId }))
                if (proveedoresData[0]) setForm(prev => ({ ...prev, proveedorId: proveedoresData[0].id }))
                setLoading(false)
            }
        )
    }, [])

    const onChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        try {
            // Simulación de creación de compra vinculada a movimiento de entrada
            const payload = {
                ...form,
                tipo: 'entrada',
                referencia: `OC-${form.referencia || Date.now()}`, // Orden de Compra
            }
            const nuevoMov = await createMovimiento(payload)

            const nuevaCompra = {
                id: Date.now(),
                fecha: form.fecha,
                producto: productos.find(p => p.id === Number(form.productoId))?.nombre,
                proveedor: proveedores.find(p => p.id === Number(form.proveedorId))?.nombre,
                cantidad: form.cantidad,
                total: form.cantidad * form.costoUnit,
                almacen: form.almacen
            }

            setComprasRecientes(prev => [nuevaCompra, ...prev])
            setForm(prev => ({ ...initialForm, productoId: prev.productoId, proveedorId: prev.proveedorId, almacen: prev.almacen }))
            alert('Compra registrada y stock actualizado en almacén.')
        } catch (err) {
            alert(err.message)
        }
    }

    const productoPreseleccionado = productoIdFromUrl ? productos.find(p => p.id === Number(productoIdFromUrl)) : null

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-4">
                <h1 className="display-6 fw-bold text-dark">Módulo de Compras (Abastecimiento)</h1>
                <p className="text-secondary">Registra órdenes de compra y automatiza la entrada de stock a tus sedes</p>
            </header>

            {productoPreseleccionado && (
                <div className="alert d-flex align-items-center gap-2 mb-4 py-2 px-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                    <TrendingDown size={16} className="text-primary flex-shrink-0" />
                    <span style={{ fontSize: '13px' }}>
                        <strong>Reposición solicitada desde Inventario</strong> — Producto pre-seleccionado:
                        <span className="badge bg-primary bg-opacity-10 text-primary ms-2">{productoPreseleccionado.nombre} ({productoPreseleccionado.sku})</span>
                        <span className="ms-2 text-muted">Stock actual: <strong className="text-danger">{productoPreseleccionado.stock}</strong> un.</span>
                    </span>
                </div>
            )}

            <div className="row g-4">
                {/* Formulario de Compra */}
                <div className="col-xl-4">
                    <div className="ent-card">
                        <div className="ent-card-header bg-success bg-opacity-10">
                            <span className="ent-card-title text-success d-flex align-items-center gap-2">
                                <ShoppingBag size={16} /> Alta de Orden de Compra
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
                                            <input className="form-control form-control-sm" name="referencia" placeholder="F-2024" value={form.referencia} onChange={onChange} />
                                        </div>
                                    </div>
                                </div>

                                <div className="filter-item">
                                    <label className="filter-label"><Truck size={12} className="me-1" /> Proveedor</label>
                                    <select className="form-select form-select-sm" name="proveedorId" value={form.proveedorId} onChange={onChange} required>
                                        {proveedores.map(prov => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
                                    </select>
                                </div>

                                <div className="filter-item">
                                    <label className="filter-label"><Package size={12} className="me-1" /> Producto</label>
                                    <select className="form-select form-select-sm" name="productoId" value={form.productoId} onChange={onChange} required>
                                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>)}
                                    </select>
                                </div>

                                <div className="filter-item">
                                    <label className="filter-label"><MapPin size={12} className="me-1" /> Almacén de Destino</label>
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
                                            <label className="filter-label">Costo Pactado ($)</label>
                                            <input className="form-control form-control-sm" type="number" name="costoUnit" value={form.costoUnit} onChange={onChange} min="0" step="0.01" required />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-light p-3 rounded border text-center my-2">
                                    <div className="small text-muted mb-1">TOTAL INVERSIÓN</div>
                                    <div className="h3 fw-bold text-success mb-0">${(form.cantidad * form.costoUnit).toLocaleString()}</div>
                                </div>

                                <button className="btn btn-success d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold">
                                    Finalizar y Recibir Stock
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Listado de Compras Recientes */}
                <div className="col-xl-8">
                    <div className="ent-card h-100">
                        <div className="ent-card-header d-flex justify-content-between align-items-center">
                            <span className="ent-card-title d-flex align-items-center gap-2">
                                <BadgeCheck size={16} /> Últimas Órdenes de Compra
                            </span>
                        </div>
                        <div className="ent-card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>FECHA</th>
                                            <th className="text-muted small" style={{ fontSize: '11px' }}>PRODUCTO</th>
                                            <th className="text-muted small" style={{ fontSize: '11px' }}>PROVEEDOR</th>
                                            <th className="text-muted small text-center" style={{ fontSize: '11px' }}>CANT</th>
                                            <th className="text-muted small text-end" style={{ fontSize: '11px' }}>TOTAL</th>
                                            <th className="pe-4 text-muted small text-end" style={{ fontSize: '11px' }}>ALM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comprasRecientes.length > 0 ? (
                                            comprasRecientes.map(c => (
                                                <tr key={c.id}>
                                                    <td className="ps-4 text-secondary">{c.fecha}</td>
                                                    <td className="fw-semibold">{c.producto}</td>
                                                    <td className="text-muted small">{c.proveedor}</td>
                                                    <td className="text-center fw-bold">{c.cantidad}</td>
                                                    <td className="text-end text-success fw-bold">${c.total.toLocaleString()}</td>
                                                    <td className="pe-4 text-end"><span className="badge bg-light text-dark border">{c.almacen}</span></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" className="text-center py-5 text-muted italic">
                                                <ShoppingBag size={24} className="d-block mx-auto mb-2 opacity-25" />
                                                No se han registrado compras en esta sesión.
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

export default Compras
