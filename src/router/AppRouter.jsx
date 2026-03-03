import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import Dashboard from '../pages/Dashboard'
import Productos from '../pages/Productos'
import Movimientos from '../pages/Movimientos'
import Kardex from '../pages/Kardex'
import Almacenes from '../pages/Almacenes'
import Login from '../pages/Login'
import { hasAuthSession } from '../services/dataService'

function AppRouter() {
  const [authenticated, setAuthenticated] = useState(hasAuthSession())

  if (!authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setAuthenticated(true)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/movimientos" element={<Movimientos />} />
        <Route path="/almacenes" element={<Almacenes />} />
        <Route path="/kardex" element={<Kardex />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
  )
}

export default AppRouter
