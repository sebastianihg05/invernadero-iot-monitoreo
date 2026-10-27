# Invernadero IoT

Solemne 1 - Infraestructura TI. Monitoreo de invernaderos y huertos con Raspberry Pi 4, Docker, Cloud Firestore y plataforma web en Vercel.

## Estructura
- `device/` Microservicios que corren en la Raspberry Pi (Docker Compose)
- `web/` Plataforma web y API (Vercel)
- `firebase/` Reglas e indices de Firestore

## Integrantes
- Vanessa Lagos
- Héctor Peña
- Sebastián Hidalgo
- Claudio Ojeda
- Leonardo Burgos

---

## Endpoints de la API REST

| Método | Ruta | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/sensores` | `Bearer <DEVICE_TOKEN>` | Ingesta de telemetría por minuto desde la Raspberry Pi. |
| **GET** | `/api/sensores` | Sesión Firebase | Consulta de datos históricos (`1h`, `24h`, `7d`). |
| **GET** | `/api/dispositivos` | Sesión Firebase (`admin`) | Listado de nodos y estado de conexión en vivo. |
| **POST** | `/api/dispositivos` | Sesión Firebase (`admin`) | Registro de nuevo nodo y generación de token criptográfico. |
| **PATCH** | `/api/dispositivos/:id` | Sesión Firebase (`admin`) | Configuración remota de parámetros o revocación. |
| **GET** | `/api/dispositivos/:id/config` | `Bearer <DEVICE_TOKEN>` | Descarga de configuración vigente por el nodo. |

---

## Seguridad y Resiliencia

- **Tokens Revocables**: Formato `id.secreto`. En Firestore únicamente se almacena el hash **SHA-256** (nunca texto plano).
- **Resiliencia ante Caídas de Red**: Almacenamiento local en SQLite (`sincronizacion.db`) ante fallas de conectividad, con reenvío automático sin duplicados al reconectar.
- **Control de Cuota**: Agregación por minuto (1.440 escrituras/día en vez de 17.280), control de caché para lecturas y tope diario de seguridad.
- **Reglas Firestore**: Bloqueo de escritura directa desde clientes web; todo acceso se valida mediante roles en el servidor.

---

## Despliegue Rápido

### Microservicios (Raspberry Pi)
```bash
cd device
cp .env.example .env
docker compose up -d --build
```

### Plataforma Web (Next.js)
```bash
cd web
npm install
npm run dev
```
