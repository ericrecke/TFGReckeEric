# Integracion con Binance Spot API

## Objetivo

Binance es la fuente externa de catalogo y datos de mercado. DSS Trading
consume solamente endpoints publicos de Spot:

- No requiere API key de Binance.
- No consulta saldos ni datos de una cuenta.
- No crea, modifica ni cancela ordenes.
- No ejecuta operaciones reales.

La URL base se configura en:

```dotenv
BINANCE_BASE_URL=https://api.binance.com
```

Si no se define la variable, el backend utiliza ese mismo valor por defecto.

## Endpoints externos utilizados

| Endpoint | Uso en DSS Trading |
| --- | --- |
| `GET /api/v3/exchangeInfo` | Obtener simbolos y estado de negociacion Spot. |
| `GET /api/v3/ticker/24hr` | Precio actual, variacion, volumen, maximo y minimo de 24 horas. |
| `GET /api/v3/klines` | Obtener velas OHLC historicas para grafico, indicadores y modelo. |

### `exchangeInfo`

Se filtran exclusivamente simbolos que cumplan:

```text
status = TRADING
quoteAsset = USDT
isSpotTradingAllowed != false
```

Los resultados se guardan en la coleccion `market_symbols`. La sincronizacion
se ejecuta:

1. Al iniciar el backend.
2. Cada 6 horas.
3. Bajo demanda si el catalogo esta vacio o vencido.

`syncSymbolCatalog()` combina `exchangeInfo` con el volumen de `ticker/24hr`.
Los activos conocidos tienen prioridad inicial y el resto se ordena por volumen
cotizado en USDT durante 24 horas.

### `ticker/24hr`

El metodo `mapTickerResponse()` normaliza la respuesta a:

```js
{
  symbol,
  price,
  changePercent,
  priceChangePercent,
  volume,
  quoteVolume,
  highPrice,
  lowPrice,
  source,
  timestamp
}
```

Se utiliza de tres maneras:

- `getTicker24h(symbol)`: un activo seleccionado.
- `getAllowedTickers24h()`: los cinco activos destacados del dashboard.
- `getTickers24h(symbols)`: lote de simbolos, por ejemplo operaciones abiertas.

Los endpoints live no persisten cada actualizacion. El resumen periodico guarda
snapshots en `market_data` para conservar informacion y calcular indicadores.

### `klines`

`getCandles(symbol, period, limit)` solicita hasta 1000 velas y transforma cada
fila de Binance a:

```js
{
  openTime,
  closeTime,
  open,
  high,
  low,
  close,
  volume
}
```

Mapeo de temporalidades:

| DSS Trading | Intervalo Binance | Cobertura aproximada con 1000 velas |
| --- | --- | --- |
| `1H` | `1h` | 41 dias |
| `4H` | `4h` | 166 dias |
| `1D` | `1d` | 2,7 anios |
| `1W` | `1w` | 19 anios |

La ultima vela puede estar todavia abierta. El dashboard actualiza su maximo,
minimo y cierre visual con el precio live.

## Metodos internos

| Metodo | Responsabilidad |
| --- | --- |
| `normalizeSymbol()` | Convertir un simbolo a mayusculas y quitar espacios. |
| `syncSymbolCatalog()` | Sincronizar simbolos, volumen y ranking en MongoDB. |
| `ensureSymbolCatalog()` | Verificar la vigencia del catalogo. |
| `validateAllowedSymbol()` | Permitir solo pares Spot/USDT activos. |
| `getAllowedSymbols()` | Listar todos los simbolos ordenados por popularidad. |
| `getFeaturedSymbols()` | Obtener el top utilizado por las cards. |
| `getTicker24h()` | Consultar un ticker individual. |
| `getAllowedTickers24h()` | Consultar el top 5 del dashboard. |
| `getTickers24h()` | Consultar varios tickers en un solo pedido. |
| `getCandles()` | Obtener y normalizar velas OHLC. |

## Frecuencias utilizadas

| Proceso | Frecuencia |
| --- | --- |
| Precio live del dashboard | 5 segundos |
| Seguimiento de operaciones abiertas | 5 segundos |
| Snapshot persistido del resumen | 30 segundos |
| Catalogo de simbolos | 6 horas |

## Manejo de errores y limites

- Las solicitudes tienen timeout de 10 o 15 segundos.
- Un simbolo debe existir en `market_symbols` y estar activo.
- Binance puede responder `429` si se supera el peso permitido.
- Ante un `429` se deberia respetar `Retry-After`; el prototipo todavia no
  implementa reintentos con backoff.
- La aplicacion agrupa simbolos para reducir solicitudes, especialmente en el
  seguimiento de operaciones.

## Referencias oficiales

- [Binance Spot REST API](https://developers.binance.com/en/docs/products/spot/rest-api)
- [Informacion general y limites](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-api-information)
- [Endpoints generales: exchangeInfo](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/general-endpoints)
- [Endpoints de mercado: ticker y klines](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints)
