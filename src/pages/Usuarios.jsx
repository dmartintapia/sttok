import { useEffect, useMemo, useState } from 'react'
import { createCompanyUser, getAuthSession, getCompanyUsers } from '../services/dataService'

const ROLE_LABEL = {
  owner: 'Owner',
  admin: 'Admin',
  operator: 'Operador',
  viewer: 'Lector',
}

function Usuarios() {
  const session = getAuthSession()
  const myRole = session?.role || ''
  const canManageUsers = ['owner', 'admin'].includes(myRole)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'operator' })

  const allowedRoles = useMemo(() => (
    myRole === 'owner'
      ? ['admin', 'operator', 'viewer', 'owner']
      : ['operator', 'viewer']
  ), [myRole])

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await getCompanyUsers()
      setUsers(rows)
    } catch (err) {
      setError(err?.message || 'No se pudo cargar usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManageUsers) {
      loadUsers()
    } else {
      setLoading(false)
      setError('No tenes permisos para gestionar usuarios.')
    }
  }, [canManageUsers])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createCompanyUser(form)
      setForm({ username: '', password: '', role: 'operator' })
      await loadUsers()
    } catch (err) {
      setError(err?.message || 'No se pudo crear usuario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-4">
        <h1 className="display-6 fw-bold text-dark">Gestión de Usuarios</h1>
        <p className="text-secondary mb-0">
          Empresa: <strong>{session?.company?.name || session?.company?.code || '-'}</strong> | Rol actual: <strong>{ROLE_LABEL[myRole] || myRole || '-'}</strong>
        </p>
      </header>

      <div className="row g-4">
        <div className="col-xl-4">
          <div className="ent-card">
            <div className="ent-card-header bg-primary bg-opacity-10">
              <span className="ent-card-title text-primary">Nuevo usuario</span>
            </div>
            <div className="ent-card-body">
              <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label">Usuario</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.username}
                    onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Contrasena</label>
                  <input
                    className="form-control form-control-sm"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Rol</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    required
                  >
                    {allowedRoles.map((role) => (
                      <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" disabled={!canManageUsers || saving}>
                  {saving ? 'Creando...' : 'Crear usuario'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="ent-card">
            <div className="ent-card-header">
              <span className="ent-card-title">Usuarios de la empresa</span>
            </div>
            <div className="ent-card-body">
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              {loading ? (
                <div className="text-muted">Cargando usuarios...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Empresa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.username}</td>
                          <td>{ROLE_LABEL[user.role] || user.role}</td>
                          <td>{user.companyCode}</td>
                        </tr>
                      ))}
                      {!users.length && (
                        <tr>
                          <td colSpan="3" className="text-center text-muted py-3">Sin usuarios cargados.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="ent-card">
            <div className="ent-card-header">
              <span className="ent-card-title">Permisos por rol</span>
            </div>
            <div className="ent-card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="ps-4">Acción</th>
                      <th>Owner</th>
                      <th>Admin</th>
                      <th>Operador</th>
                      <th className="pe-4">Viewer</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="ps-4">Ver dashboard, productos y reportes</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td className="pe-4">Si</td>
                    </tr>
                    <tr>
                      <td className="ps-4">Registrar movimientos (entrada/salida/ajuste)</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td className="pe-4">No</td>
                    </tr>
                    <tr>
                      <td className="ps-4">Reservar / liberar / despachar stock</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td className="pe-4">No</td>
                    </tr>
                    <tr>
                      <td className="ps-4">Crear/editar productos, categorías y almacenes</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td>No</td>
                      <td className="pe-4">No</td>
                    </tr>
                    <tr>
                      <td className="ps-4">Crear usuarios (operator/viewer)</td>
                      <td>Si</td>
                      <td>Si</td>
                      <td>No</td>
                      <td className="pe-4">No</td>
                    </tr>
                    <tr>
                      <td className="ps-4">Crear otro owner</td>
                      <td>Si</td>
                      <td>No</td>
                      <td>No</td>
                      <td className="pe-4">No</td>
                    </tr>
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

export default Usuarios
