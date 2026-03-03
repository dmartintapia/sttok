import { NavLink } from 'react-router-dom'
import { Home, Package, BarChart2, ChevronLeft, Search, Map, Users } from 'lucide-react'
import { clearAuthSession } from '../../services/dataService'

function Sidebar() {
    const onLogout = () => {
        clearAuthSession()
        window.location.href = '/login'
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">AIDOO Stock</div>
                <div className="sidebar-subtitle">Enterprise Data Solutions</div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-group-title">Principal</div>
                <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <Home size={18} /> Dashboard
                </NavLink>

                <div className="nav-group-title">Inventarios</div>
                <NavLink to="/productos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <Package size={18} /> Productos
                </NavLink>
                <NavLink to="/movimientos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <Search size={18} /> Movimientos
                </NavLink>
                <NavLink to="/almacenes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <Map size={18} /> Almacenes
                </NavLink>
                <NavLink to="/usuarios" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <Users size={18} /> Usuarios
                </NavLink>

                <div className="nav-group-title">Reportes</div>
                <NavLink to="/kardex" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <BarChart2 size={18} /> Kardex
                </NavLink>
            </nav>

            <div className="p-3 mt-auto border-top border-secondary border-opacity-10 text-center">
                <button className="btn btn-link text-white-50 text-decoration-none p-0 d-flex align-items-center justify-content-center gap-1 mx-auto" style={{ fontSize: '11px' }}>
                    <ChevronLeft size={12} /> Go back
                </button>
                <button
                    className="btn btn-outline-light btn-sm mt-2"
                    type="button"
                    onClick={onLogout}
                >
                    Cerrar sesion
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
