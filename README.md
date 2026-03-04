# Sistema de Stock - Frontend (React + Vite)

Frontend de un sistema de stock construido con **React + Vite**, **React Router** y **Bootstrap**, usando datos mockeados y un servicio asíncrono simulado.

## Pantallas

- Dashboard (stock y alertas)
- Productos (lista + formulario)
- Movimientos (alta + historial)
- Kardex (tabla con filtros)

## Cómo correr

```bash
npm install
npm run dev
```

Variables importantes:

```bash
VITE_API_URL=http://localhost:8000/api
VITE_SUPPORT_CONTACT=contacto@tu-dominio.com
FREE_PLAN_MAX_SKUS=100
SUPPORT_CONTACT=contacto@tu-dominio.com
TURNSTILE_SECRET_KEY=
```

Build y preview:

```bash
npm run build
npm run preview
```

## Estructura de carpetas

```txt
src/
  App.jsx
  main.jsx
  components/
    layout/
      MainLayout.jsx
      Navbar.jsx
  mock/
    data.js
  pages/
    Dashboard.jsx
    Kardex.jsx
    Movimientos.jsx
    Productos.jsx
  router/
    AppRouter.jsx
  services/
    dataService.js
  styles/
    custom.css
```
# sttok
