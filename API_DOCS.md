# Documentación de la API de NILO

## Autenticación

### Registro de Usuario

**Endpoint:** `POST /auth/register`

**Descripción:** Registra un nuevo usuario en el sistema.

**Datos de Solicitud:**
```json
{
  "email": "usuario@ejemplo.com",
  "phone": "+593981234567",
  "password": "contraseña123",
  "firstName": "Nombre",
  "lastName": "Apellido",
  "role": "PASSENGER" // PASSENGER, DRIVER, ADMIN
}
```

**Respuesta Exitosa:**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "firstName": "Nombre",
    "lastName": "Apellido",
    "role": "PASSENGER"
  },
  "token": "jwt_token"
}
```

### Inicio de Sesión

**Endpoint:** `POST /auth/login`

**Descripción:** Autentica a un usuario y devuelve un token JWT.

**Datos de Solicitud:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta Exitosa:**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "firstName": "Nombre",
    "lastName": "Apellido",
    "role": "PASSENGER"
  },
  "token": "jwt_token"
}
```

## Usuarios

### Obtener Perfil

**Endpoint:** `GET /users/profile`

**Descripción:** Obtiene el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "phone": "+593981234567",
  "firstName": "Nombre",
  "lastName": "Apellido",
  "profilePicture": "url_imagen",
  "role": "PASSENGER",
  "lastLoginAt": "2023-01-01T00:00:00.000Z",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "passenger": {
    "id": "uuid",
    "emergencyContact": "contacto_emergencia",
    "favoriteLocations": []
  }
}
```

### Actualizar Perfil

**Endpoint:** `PATCH /users/profile`

**Descripción:** Actualiza la información del perfil del usuario.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "firstName": "NuevoNombre",
  "lastName": "NuevoApellido",
  "phone": "+593987654321",
  "profilePicture": "nueva_url_imagen"
}
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "phone": "+593987654321",
  "firstName": "NuevoNombre",
  "lastName": "NuevoApellido",
  "profilePicture": "nueva_url_imagen",
  "role": "PASSENGER",
  "lastLoginAt": "2023-01-01T00:00:00.000Z",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-02T00:00:00.000Z"
}
```

## Viajes

### Crear Viaje

**Endpoint:** `POST /trips`

**Descripción:** Crea un nuevo viaje (solo para pasajeros).

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "type": "ON_DEMAND",
  "startLocation": {
    "latitude": -0.18,
    "longitude": -78.48,
    "address": {
      "street": "Av. República",
      "city": "Quito",
      "state": "Pichincha",
      "country": "Ecuador"
    }
  },
  "endLocation": {
    "latitude": -0.19,
    "longitude": -78.49,
    "address": {
      "street": "Av. 12 de Octubre",
      "city": "Quito",
      "state": "Pichincha",
      "country": "Ecuador"
    }
  }
}
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "type": "ON_DEMAND",
  "status": "SEARCHING",
  "startLocation": { "latitude": -0.18, "longitude": -78.48, "address": { ... } },
  "endLocation": { "latitude": -0.19, "longitude": -78.49, "address": { ... } },
  "distance": 2.5,
  "duration": 10,
  "fare": 5.5,
  "estimatedFare": 5.5,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Listar Viajes

**Endpoint:** `GET /trips`

**Descripción:** Lista todos los viajes del usuario actual.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Parámetros de Consulta:**
```
status: SCHEDULED|SEARCHING|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED
```

**Respuesta Exitosa para Pasajeros:**
```json
[
  {
    "tripId": "uuid",
    "passengerId": "uuid",
    "fare": 5.5,
    "status": "COMPLETED",
    "trip": {
      "id": "uuid",
      "type": "ON_DEMAND",
      "startLocation": { ... },
      "endLocation": { ... },
      "distance": 2.5,
      "duration": 10,
      "driver": {
        "user": {
          "firstName": "Conductor",
          "lastName": "Ejemplo",
          "profilePicture": "url_imagen"
        },
        "vehicle": {
          "make": "Toyota",
          "model": "Corolla",
          "color": "Blanco",
          "plate": "ABC-1234"
        }
      }
    }
  }
]
```

### Aceptar Viaje

**Endpoint:** `POST /trips/:id/accept`

**Descripción:** Permite a un conductor aceptar un viaje (solo conductores).

**Headers:**
```
Authorization: Bearer jwt_token
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "type": "ON_DEMAND",
  "status": "CONFIRMED",
  "driverId": "uuid",
  "startLocation": { ... },
  "endLocation": { ... },
  "distance": 2.5,
  "duration": 10,
  "fare": 5.5,
  "estimatedFare": 5.5,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Calificar Viaje

**Endpoint:** `POST /trips/:id/rate`

**Descripción:** Permite calificar a un usuario (conductor o pasajero) después de un viaje.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "toUserId": "uuid",
  "score": 5,
  "comment": "Excelente servicio"
}
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "tripId": "uuid",
  "fromUserId": "uuid",
  "toUserId": "uuid",
  "score": 5,
  "comment": "Excelente servicio",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

## Pagos

### Realizar Pago

**Endpoint:** `POST /payments`

**Descripción:** Registra un pago para un viaje.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "tripId": "uuid",
  "method": "CASH" // CASH, CARD, WALLET
}
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "tripId": "uuid",
  "userId": "uuid",
  "amount": 5.5,
  "method": "CASH",
  "status": "COMPLETED",
  "platformFee": 1.1,
  "driverAmount": 4.4,
  "taxAmount": 0.66,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## Vehículos

### Registrar Vehículo

**Endpoint:** `POST /vehicles`

**Descripción:** Registra un vehículo para un conductor.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "plate": "ABC-1234",
  "make": "Toyota",
  "model": "Corolla",
  "year": 2020,
  "color": "Blanco",
  "capacity": 4,
  "category": "STANDARD" // STANDARD, PREMIUM, WOMEN_ONLY
}
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "driverId": "uuid",
  "plate": "ABC-1234",
  "make": "Toyota",
  "model": "Corolla",
  "year": 2020,
  "color": "Blanco",
  "capacity": 4,
  "category": "STANDARD",
  "insuranceStatus": "PENDING",
  "active": true
}
```

## Monederos

### Obtener Información del Monedero

**Endpoint:** `GET /wallets`

**Descripción:** Obtiene la información del monedero del usuario.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "balance": 50.25,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Depositar Fondos

**Endpoint:** `POST /wallets/deposit`

**Descripción:** Añade fondos al monedero del usuario.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "amount": 20.0,
  "description": "Recarga de saldo"
}
```

**Respuesta Exitosa:**
```json
{
  "wallet": {
    "id": "uuid",
    "userId": "uuid",
    "balance": 70.25,
    "updatedAt": "2023-01-02T00:00:00.000Z"
  },
  "transaction": {
    "id": "uuid",
    "walletId": "uuid",
    "amount": 20.0,
    "balanceAfter": 70.25,
    "type": "DEPOSIT",
    "description": "Recarga de saldo",
    "status": "COMPLETED",
    "createdAt": "2023-01-02T00:00:00.000Z"
  }
}
```

## Promociones

### Aplicar Código Promocional

**Endpoint:** `POST /promotions/apply`

**Descripción:** Aplica un código promocional para obtener descuento.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "code": "BIENVENIDO",
  "amount": 10.0,
  "tripType": "ON_DEMAND"
}
```

**Respuesta Exitosa:**
```json
{
  "originalAmount": 10.0,
  "discount": 3.0,
  "finalAmount": 7.0,
  "promoCode": {
    "id": "uuid",
    "code": "BIENVENIDO",
    "description": "Código de bienvenida para nuevos usuarios"
  }
}
```

## Notificaciones

### Registrar Token de Dispositivo

**Endpoint:** `POST /notifications/token`

**Descripción:** Registra un token para enviar notificaciones push.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Datos de Solicitud:**
```json
{
  "token": "device_token_fcm",
  "deviceInfo": "iPhone 12, iOS 15.0"
}
```

**Respuesta Exitosa:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "token": "device_token_fcm",
  "deviceInfo": "iPhone 12, iOS 15.0",
  "isActive": true,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## Geocodificación

### Buscar Dirección

**Endpoint:** `GET /geocoding/search`

**Descripción:** Busca direcciones a partir de un texto.

**Parámetros de Consulta:**
```
query: Av República Quito
limit: 5 (opcional)
countryCode: EC (opcional)
```

**Respuesta Exitosa:**
```json
[
  {
    "id": "123456",
    "name": "Avenida República",
    "displayName": "Avenida República, Quito, Pichincha, Ecuador",
    "latitude": -0.18,
    "longitude": -78.48,
    "type": "highway",
    "address": {
      "road": "Avenida República",
      "city": "Quito",
      "state": "Pichincha",
      "country": "Ecuador"
    },
    "boundingBox": {
      "minLat": -0.185,
      "maxLat": -0.175,
      "minLon": -78.485,
      "maxLon": -78.475
    }
  }
]
```

## Rutas (ORS)

### Obtener Ruta

**Endpoint:** `GET /ors/route`

**Descripción:** Obtiene la ruta entre dos puntos geográficos.

**Parámetros de Consulta:**
```
start: -0.18,-78.48
end: -0.19,-78.49
```

**Respuesta Exitosa:**
```json
{
  "routes": [
    {
      "summary": {
        "distance": 2500,
        "duration": 600
      },
      "geometry": "encoded_polyline_string"
    }
  ]
}
```