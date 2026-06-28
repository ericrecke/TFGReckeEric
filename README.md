# DSS Trading

Sistema de soporte a decisiones para analizar criptomonedas de Binance. La
aplicacion muestra precios y velas, calcula indicadores tecnicos, permite
configurar riesgo y genera recomendaciones orientativas mediante un modelo
predictivo. No ejecuta operaciones automaticamente.

## Tecnologias
- Frontend: Angular 21, Bootstrap 5 y Lightweight Charts.
- Backend: Node.js, Express y Mongoose.
- Base de datos: MongoDB.
- Mercado: API publica de Binance.
- Analisis: `technicalindicators` y TensorFlow.js.

## Documentacion tecnica

- [Integracion con Binance](docs/api/binance.md)
- [Indicadores tecnicos](docs/architecture/technical-analysis.md)
- [Modelo predictivo DSS v1](docs/architecture/modelo-predictivo.md)

## Estructura

```text
.
|-- client/                          Aplicacion Angular
|-- server/                          API REST y acceso a MongoDB/Binance
`-- README.md
```

## Requisitos


- Node.js 20.19 o superior.
- npm 10 o superior.
- MongoDB local o una instancia de MongoDB Atlas.
- Acceso a `https://api.binance.com`.

## 1. Configurar el backend

Desde la raiz del repositorio:

```powershell
cd server
npm install
Copy-Item .env.example .env
```

Editar `server/.env`:

`MONGO_URI`, `JWT_SECRET` y `JWT_REFRESH_SECRET` deben cambiarse antes de usar
la aplicacion fuera de un entorno local. Para generar un secreto se puede usar:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Iniciar la API en modo desarrollo:

```powershell
npm run dev
```

Alternativamente, para ejecutarla sin recarga automatica:

```powershell
npm start
```

La API queda disponible en `http://localhost:3000`.

Al iniciar, el backend:

1. Se conecta a MongoDB.
2. Sincroniza en `market_symbols` los pares Spot/USDT activos de Binance.
3. Ordena los simbolos conocidos primero y luego por volumen de 24 horas.
4. Repite la sincronizacion del catalogo cada 6 horas.

El inicio correcto muestra mensajes similares a:

```text
Connected to MongoDB
Binance symbol catalog synchronized: ... active USDT pairs
Server is running on port 3000
```

## 2. Configurar el frontend

Abrir otra terminal desde la raiz del repositorio:

```powershell
cd client
npm install
npm start
```

Abrir `http://localhost:4200` en el navegador. El frontend esta configurado para
consumir la API en `http://localhost:3000`, por lo que ambos procesos deben
estar activos.

## Scripts utiles

### Backend

Ejecutar desde `server/`:

```powershell
npm run dev   # Desarrollo con nodemon
npm start     # Ejecucion normal
```

### Frontend

Ejecutar desde `client/`:

```powershell
npm start       # Servidor de desarrollo
npm run build   # Compilacion de produccion
npm test        # Pruebas del frontend
```

La compilacion se genera en:

```text
client/dist/crypto-decision-client
```

## Flujo inicial

1. Iniciar MongoDB.
2. Iniciar el backend en el puerto 3000.
3. Esperar la confirmacion de conexion y sincronizacion de Binance.
4. Iniciar Angular en el puerto 4200.
5. Registrar un usuario.
6. Iniciar sesion y acceder al dashboard.

## Solucion de problemas

### No conecta con MongoDB

Verificar que MongoDB este iniciado y que `MONGO_URI` sea valido. Si se utiliza
Atlas, revisar el usuario, la clave y las reglas de acceso de red.

### El catalogo de monedas no carga

Verificar la conexion a Internet y el acceso a `BINANCE_BASE_URL`. La aplicacion
conserva el ultimo catalogo sincronizado en MongoDB si Binance no responde
durante un reinicio.

### Respuestas 401 o sesion vencida

La aplicacion intenta renovar el access token mediante el refresh token. Si
ambos vencieron, redirige al login. Ante datos antiguos del navegador, cerrar
sesion o eliminar las claves `crypto_decision_*` de `localStorage`.

### El frontend no alcanza al backend

Confirmar que la API responda en `http://localhost:3000` y que Angular se haya
iniciado en `http://localhost:4200`. Las URLs de la API se encuentran
actualmente configuradas en los servicios de Angular.

## Consideraciones

- Las recomendaciones son orientativas y no reemplazan el criterio del usuario.
- La aplicacion no envia ordenes a Binance.
- No deben subirse archivos `.env`, credenciales ni secretos JWT al repositorio.

## Posibles mejoras a futuro
- Agregar Iconos de monedas.
- Generar una vista donde se explica que es cada indicador al usuario.
- Las operaciones son en este caso simulaciones actualmente, mas adelante implementar Operaciones reales con Binance Api (necesario token propio del usuario)
- Finalizar las alertas y notificaciones
