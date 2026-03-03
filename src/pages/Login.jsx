import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/dataService'

function Login({ onLogin }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ company: '', username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form)
      onLogin && onLogin()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm border-0" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-1">Ingreso al sistema</h1>
          <p className="text-muted mb-4">Empresa, usuario y contraseña</p>

          <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label">Empresa</label>
              <input
                className="form-control"
                name="company"
                placeholder="Ej: acme"
                value={form.company}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <label className="form-label">Usuario</label>
              <input
                className="form-control"
                name="username"
                value={form.username}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <label className="form-label">Contrasena</label>
              <input
                className="form-control"
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                required
              />
            </div>

            {error && <div className="alert alert-danger py-2 small mb-0">{error}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
