import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, signup } from '../services/dataService'

const SUPPORT_CONTACT = import.meta.env.VITE_SUPPORT_CONTACT || 'contacto@tu-dominio.com'

function Login({ onLogin }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ company: '', username: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    companyName: '',
    companyCode: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const onSignupChange = (e) => {
    const { name, value } = e.target
    setSignupForm((prev) => ({ ...prev, [name]: value }))
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

  const onSignupSubmit = async (e) => {
    e.preventDefault()
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await signup({
        companyName: signupForm.companyName,
        companyCode: signupForm.companyCode,
        email: signupForm.email,
        username: signupForm.username,
        password: signupForm.password,
      })
      onLogin && onLogin()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'No se pudo completar el registro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm border-0" style={{ width: '100%', maxWidth: '480px' }}>
        <div className="card-body p-4">
          <h1 className="h4 fw-bold mb-1">AIDOO Stock</h1>
          <p className="text-muted mb-4">Plan Gratis: hasta 100 SKU por empresa</p>

          <div className="d-flex gap-2 mb-3">
            <button
              type="button"
              className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => {
                setMode('login')
                setError('')
              }}
              disabled={loading}
            >
              Ingresar
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'signup' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => {
                setMode('signup')
                setError('')
              }}
              disabled={loading}
            >
              Crear empresa
            </button>
          </div>

          {mode === 'login' ? (
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
          ) : (
            <form onSubmit={onSignupSubmit} className="d-flex flex-column gap-3">
              <div>
                <label className="form-label">Empresa</label>
                <input
                  className="form-control"
                  name="companyName"
                  placeholder="Ej: Mi Empresa SRL"
                  value={signupForm.companyName}
                  onChange={onSignupChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Codigo de empresa</label>
                <input
                  className="form-control"
                  name="companyCode"
                  placeholder="Ej: miempresa"
                  value={signupForm.companyCode}
                  onChange={onSignupChange}
                />
                <div className="form-text">Se usa para iniciar sesion junto al usuario.</div>
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  name="email"
                  type="email"
                  value={signupForm.email}
                  onChange={onSignupChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Usuario admin</label>
                <input
                  className="form-control"
                  name="username"
                  value={signupForm.username}
                  onChange={onSignupChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Contrasena</label>
                <input
                  className="form-control"
                  type="password"
                  name="password"
                  value={signupForm.password}
                  onChange={onSignupChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Repetir contrasena</label>
                <input
                  className="form-control"
                  type="password"
                  name="confirmPassword"
                  value={signupForm.confirmPassword}
                  onChange={onSignupChange}
                  required
                />
              </div>

              {error && <div className="alert alert-danger py-2 small mb-0">{error}</div>}

              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear empresa y entrar'}
              </button>
            </form>
          )}

          <div className="alert alert-info py-2 small mt-3 mb-0">
            Upgrade por contacto: {SUPPORT_CONTACT}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
