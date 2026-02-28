import { useEffect, useState } from 'react'
import { getAlmacenes, createAlmacen, getProductos } from '../services/dataService'
import {
    MapPin,
    Map,
    PlusCircle,
    Database,
    Activity,
    TrendingUp,
    MoreVertical,
    ExternalLink,
    ShieldCheck
} from 'lucide-react'

const initialForm = {
    nombre: '',
    ubicacion: '',
}

function Almacenes() {
    const [almacenes, setAlmacenes] = useState([])
    const [productos, setProductos] = useState([])
    const [form, setForm] = useState(initialForm)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([getAlmacenes(), getProductos()]).then(([almacenesData, productosData]) => {
            setAlmacenes(almacenesData)
            setProductos(productosData)
            setLoading(false)
        })
    }, [])

    const onChange = (event) => {
        const { name, value } = event.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const onSubmit = async (event) => {
        event.preventDefault()
        try {
            const nuevo = await createAlmacen(form)
            setAlmacenes((prev) => [...prev, nuevo])
            setForm(initialForm)
        } catch (err) {
            alert(err.message)
        }
    }

    // Cálculos de inventario por almacén
    const getStatsForAlmacen = (almacenId) => {
        const items = productos.reduce((acc, p) => acc + (p.distribucion[almacenId] || 0), 0)
        const valor = productos.reduce((acc, p) => acc + ((p.distribucion[almacenId] || 0) * p.costo), 0)
        return { items, valor }
    }

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-4">
                <h1 className="display-6 fw-bold text-dark">Gestión de Sedes y Almacenes</h1>
                <p className="text-secondary">Administra las ubicaciones físicas del inventario y monitorea su ocupación global</p>
            </header>

            {/* KPI Cards Logísticas */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="ent-card border-start border-4 border-primary p-3">
                        <div className="d-flex justify-content-between">
                            <div>
                                <div className="text-muted small fw-bold">SEDES ACTIVAS</div>
                                <div className="h4 fw-bold mb-0">{almacenes.length} Sedes</div>
                            </div>
                            <div className="bg-primary bg-opacity-10 p-2 rounded">
                                <MapPin className="text-primary" size={24} />
                            </div>
                        </div>
                        <div className="mt-2 small text-primary">
                            <ShieldCheck size={12} /> Red logística operativa
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="ent-card border-start border-4 border-info p-3">
                        <div className="d-flex justify-content-between">
                            <div>
                                <div className="text-muted small fw-bold">TOTAL SKUs ALMACENADOS</div>
                                <div className="h4 fw-bold mb-0">{productos.length} Referencias</div>
                            </div>
                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                <Database className="text-info" size={24} />
                            </div>
                        </div>
                        <div className="mt-2 small text-info">
                            <Activity size={12} /> Movimiento constante detectado
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="ent-card border-start border-4 border-success p-3">
                        <div className="d-flex justify-content-between">
                            <div>
                                <div className="text-muted small fw-bold">VALOR TOTAL STOCK</div>
                                <div className="h4 fw-bold mb-0">${productos.reduce((acc, p) => acc + (p.stock * p.costo), 0).toLocaleString()}</div>
                            </div>
                            <div className="bg-success bg-opacity-10 p-2 rounded">
                                <TrendingUp className="text-success" size={24} />
                            </div>
                        </div>
                        <div className="mt-2 small text-success">
                            Inversión en activos fijos
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Alta de Nuevo Almacén */}
                <div className="col-xl-4">
                    <div className="ent-card">
                        <div className="ent-card-header bg-primary bg-opacity-10">
                            <span className="ent-card-title text-primary d-flex align-items-center gap-2">
                                <PlusCircle size={16} /> Nueva Sede Logística
                            </span>
                        </div>
                        <div className="ent-card-body">
                            <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
                                <div className="filter-item">
                                    <label className="filter-label"><Map size={12} className="me-1" /> Nombre del Almacén</label>
                                    <input className="form-control form-control-sm" name="nombre" placeholder="Ej: Nave Logística Sur" value={form.nombre} onChange={onChange} required />
                                </div>

                                <div className="filter-item">
                                    <label className="filter-label"><MapPin size={12} className="me-1" /> Ubicación / Ciudad</label>
                                    <input className="form-control form-control-sm" name="ubicacion" placeholder="Ej: Sevilla, España" value={form.ubicacion} onChange={onChange} required />
                                </div>

                                <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 mt-2 py-2 fw-semibold">
                                    Registrar Nueva Ubicación
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Listado de Almacenes */}
                <div className="col-xl-8">
                    <div className="ent-card h-100">
                        <div className="ent-card-header d-flex justify-content-between align-items-center">
                            <span className="ent-card-title d-flex align-items-center gap-2">
                                <MapPin size={16} /> Mapa de Sedes Enterprise
                            </span>
                        </div>
                        <div className="ent-card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4 text-muted small" style={{ fontSize: '11px' }}>ID</th>
                                            <th className="text-muted small" style={{ fontSize: '11px' }}>NOMBRE / SEDE</th>
                                            <th className="text-muted small" style={{ fontSize: '11px' }}>UBICACIÓN</th>
                                            <th className="text-muted small text-center" style={{ fontSize: '11px' }}>UNIDADES</th>
                                            <th className="text-muted small text-center" style={{ fontSize: '11px' }}>CAPACIDAD</th>
                                            <th className="pe-4 text-muted small text-end" style={{ fontSize: '11px' }}>ACCIONES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" className="text-center py-5 text-muted">Cargando sedes...</td></tr>
                                        ) : almacenes.length > 0 ? (
                                            almacenes.map((alm) => {
                                                const stats = getStatsForAlmacen(alm.id)
                                                return (
                                                    <tr key={alm.id}>
                                                        <td className="ps-4"><span className="badge bg-light text-dark border">{alm.id}</span></td>
                                                        <td>
                                                            <div className="fw-semibold text-dark">{alm.nombre}</div>
                                                        </td>
                                                        <td>
                                                            <div className="text-secondary d-flex align-items-center gap-1">
                                                                <MapPin size={12} /> {alm.ubicacion}
                                                            </div>
                                                        </td>
                                                        <td className="text-center fw-bold">{stats.items.toLocaleString()} un.</td>
                                                        <td className="text-center">
                                                            <div className="d-flex flex-column align-items-center gap-1">
                                                                <div className="progress w-75" style={{ height: '6px' }}>
                                                                    <div className={`progress-bar ${parseInt(alm.capacidad) > 80 ? 'bg-danger' : 'bg-success'}`} style={{ width: alm.capacidad }}></div>
                                                                </div>
                                                                <span className="small text-muted" style={{ fontSize: '10px' }}>{alm.capacidad} ocupado</span>
                                                            </div>
                                                        </td>
                                                        <td className="pe-4 text-end">
                                                            <div className="d-flex justify-content-end gap-2">
                                                                <button className="btn btn-light btn-sm p-1 border">
                                                                    <ExternalLink size={14} className="text-primary" />
                                                                </button>
                                                                <button className="btn btn-light btn-sm p-1 border">
                                                                    <MoreVertical size={14} className="text-muted" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        ) : (
                                            <tr><td colSpan="6" className="text-center py-5 text-muted">No hay sedes registradas.</td></tr>
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

export default Almacenes
