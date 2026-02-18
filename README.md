<<<<<<< ours
# Pizzería Criolla

App liviana para tomar pedidos de pizzas, empanadas, hamburguesas y lomitos, con envío de la orden a WhatsApp y un panel simple para actualizar precios, stock e imágenes.

## Requisitos
- Node.js 18+

## Cómo usar
1. Instalar dependencias (no se requieren librerías externas).
2. Ejecutar el servidor:
   ```bash
   npm start
   ```
3. Abrir `http://localhost:3000` para el flujo de compra.
4. Abrir `http://localhost:3000/admin` para actualizar menú, stock y fotos. Las imágenes se guardan en `public/uploads` y se referencian en `data/menu.json`.

Los productos con stock `0` no se muestran en el front de compra. El checkout arma un mensaje con los datos de contacto y pago y abre WhatsApp al número +54 9 11 3627-5604.
=======
# Sistema de Gestión de Stock

Aplicación web completa con backend en Django + DRF y frontend en React, pensada para gestionar productos, depósitos, movimientos de stock y alertas de reposición.

## Requisitos
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Docker (opcional)

## Configuración rápida (local)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
```

Configura tus variables en `.env` y luego:
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Docker (opcional)
```bash
docker-compose up --build
```

## Endpoints principales
- `POST /api/auth/token/` (JWT)
- `GET /api/products/`
- `POST /api/movements/`
- `GET /api/dashboard/alerts/`
- `GET /api/dashboard/summary/`

## Cómo probar

### Backend (Django)
```bash
cd backend
source .venv/bin/activate
python manage.py test
```

### Frontend (React)
```bash
cd frontend
npm test
```

## Roles y permisos
- **Admin**: usa usuarios `is_staff` (admin de Django).
- **Operador**: agrega el usuario al grupo `operator` para permitir registrar movimientos.

## Auditoría
Cada movimiento registrado genera un log en la tabla `AuditLog`. Puedes consultar `GET /api/audit-logs/`.

## Depuración de problemas comunes

### Error de conexión a PostgreSQL
- Verifica host/puerto en `.env`.
- Confirma que el usuario tenga permisos en la base.
- Prueba la conexión con `psql`.

### Error de CORS en frontend
- Confirma que `CORS_ALLOWED_ORIGINS` en `settings.py` contiene `http://localhost:3000`.

### JWT inválido
- Verifica que el reloj del sistema esté sincronizado.
- Renueva el token con `/api/auth/token/refresh/`.

## Datos de prueba
Se incluyen scripts SQL en `backend/scripts/` para carga inicial y datos de ejemplo.

## Logging
El backend escribe logs en consola y en `backend/logs/app.log`. Ajusta el nivel en `settings.py`.
>>>>>>> theirs
