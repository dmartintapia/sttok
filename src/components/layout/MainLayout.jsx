import Sidebar from './Sidebar'

function MainLayout({ children }) {
  return (
    <div className="enterprise-wrapper">
      <Sidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-title">AIDOO Stock | Actualizado {new Date().toLocaleDateString('es-AR')}</div>
          <div className="d-flex align-items-center gap-3">
            <div className="input-group input-group-sm" style={{ width: '200px' }}>
              <span className="input-group-text bg-white border-end-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </span>
              <input type="text" className="form-control border-start-0 ps-0" placeholder="Buscar" />
            </div>
            {/* User Profile / Mock Notifications */}
            <div className="d-flex gap-2">
              <span className="badge rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '10px' }}>2</span>
              <div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              </div>
            </div>
          </div>
        </header>

        <div className="content-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default MainLayout
