import { NavLink } from 'react-router-dom'
import { Home, Package, BarChart2, ChevronLeft, Search, Map } from 'lucide-react'

function Sidebar() {
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

                <div className="nav-group-title">Reportes</div>
                <NavLink to="/kardex" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <BarChart2 size={18} /> Kardex
                </NavLink>
            </nav>

            <div className="p-3 mt-auto border-top border-secondary border-opacity-10 text-center">
                <button className="btn btn-link text-white-50 text-decoration-none p-0 d-flex align-items-center justify-content-center gap-1 mx-auto" style={{ fontSize: '11px' }}>
                    <ChevronLeft size={12} /> Go back
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
