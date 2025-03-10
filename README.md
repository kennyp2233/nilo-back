# NILO App Backend

Aplicación de transporte desarrollada con NestJS y PostgreSQL.

## Requisitos

- Node.js (v16 o superior)
- npm (v8 o superior)
- PostgreSQL (v13 o superior)

## Instalación

1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/nilo-back.git
cd nilo-back
```

2. Instalar dependencias

```bash
npm install
```

3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
# Base de datos
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nilo_db?schema=public"

# JWT
JWT_SECRET="tu_clave_secreta_jwt"
JWT_EXPIRES_IN="24h"

# OpenRouteService
ORS_URL="https://api.openrouteservice.org/v2/directions/driving-car"
ORS_API_KEY="tu_api_key_de_openrouteservice"

# Configuración de la aplicación
PORT=3000
NODE_ENV=development
APP_VERSION=1.0
```

4. Ejecutar migraciones de Prisma

```bash
npx prisma migrate dev
```

## Poblar la base de datos con datos de prueba

Para generar datos ficticios y llenar la base de datos con información de prueba, ejecuta:

```bash
npm run seed
```

Este comando creará:
- Usuarios con diferentes roles (pasajeros, conductores, admin)
- Vehículos para los conductores
- Configuraciones de tarifas
- Viajes en diferentes estados
- Pagos
- Calificaciones
- Transacciones de monedero
- Códigos promocionales

## Ejecutar la aplicación

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

La API estará disponible en `http://localhost:3000`.

## Estructura del proyecto

```
src/
├── app.module.ts                # Módulo principal
├── main.ts                      # Punto de entrada
├── auth/                        # Autenticación
├── config/                      # Configuración
├── geocoding/                   # Servicio de geocodificación
├── notifications/               # Sistema de notificaciones
├── ors/                         # OpenRouteService para rutas
├── payments/                    # Gestión de pagos
├── prisma/                      # Cliente de Prisma
├── promotions/                  # Códigos promocionales
├── seeder/                      # Generación de datos de prueba
├── trips/                       # Gestión de viajes
├── users/                       # Gestión de usuarios
├── vehicles/                    # Gestión de vehículos
└── wallets/                     # Monederos digitales
```

## Endpoints principales

### Autenticación

- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Inicio de sesión

### Usuarios

- `GET /users/profile` - Perfil del usuario actual
- `PATCH /users/profile` - Actualizar perfil

### Viajes

- `POST /trips` - Crear viaje (pasajero)
- `GET /trips` - Listar viajes del usuario
- `GET /trips/:id` - Detalles de un viaje
- `POST /trips/:id/accept` - Aceptar viaje (conductor)
- `POST /trips/:id/rate` - Calificar viaje

### Pagos

- `POST /payments` - Realizar pago
- `GET /payments/user/history` - Historial de pagos

### Vehículos

- `POST /vehicles` - Registrar vehículo (conductor)
- `GET /vehicles/:id` - Detalles de un vehículo

### Monederos

- `GET /wallets` - Información del monedero
- `POST /wallets/deposit` - Depositar fondos
- `POST /wallets/withdraw` - Retirar fondos

### Notificaciones

- `POST /notifications/token` - Registrar token de dispositivo
- `DELETE /notifications/token/:token` - Desactivar token

### Promociones

- `GET /promotions/code/:code` - Verificar código promocional
- `POST /promotions/apply` - Aplicar código promocional