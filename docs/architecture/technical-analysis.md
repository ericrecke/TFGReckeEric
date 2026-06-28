# Calculo de indicadores tecnicos

## Objetivo

Los indicadores resumen el comportamiento historico de un activo y sirven como
evidencia complementaria. No representan por si solos una orden de compra o
venta.

La implementacion se encuentra en:

```text
server/src/services/indicator.service.js
```

Se utiliza la biblioteca:

```js
const { EMA, MACD, RSI, SMA } = require('technicalindicators');
```

## Fuente de precios

`calculateAndSaveIndicators(marketData, period, suppliedPrices)` admite dos
fuentes:

1. Durante un analisis usa los cierres de las velas solicitadas a Binance.
2. Si no recibe precios, usa los ultimos 100 snapshots de `market_data`,
   ordenados cronologicamente.

El periodo por defecto es 14.

## Indicadores

### SMA 14

La media movil simple calcula el promedio de los ultimos 14 cierres:

```text
SMA = suma(cierres) / 14
```

En codigo:

```js
SMA.calculate({ period: 14, values: prices })
```

### EMA 14

La media movil exponencial asigna mayor peso a los precios recientes:

```js
EMA.calculate({ period: 14, values: prices })
```

La comparacion `EMA > SMA` se interpreta como impulso alcista; `EMA < SMA`,
como impulso bajista.

### RSI 14

RSI mide la relacion entre movimientos positivos y negativos recientes:

```js
RSI.calculate({ period: 14, values: prices })
```

Interpretacion utilizada:

| RSI | Estado |
| --- | --- |
| `>= 70` | Sobrecompra |
| `<= 30` | Sobreventa |
| Entre 30 y 70 | Zona neutral |

### MACD 12/26/9

Configuracion:

```js
MACD.calculate({
  values: prices,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  SimpleMAOscillator: false,
  SimpleMASignal: false
})
```

El valor persistido es el campo `MACD` del ultimo resultado. Un valor positivo
indica momentum positivo y uno negativo, momentum negativo.

## Persistencia

Se toma el ultimo valor producido por cada serie, se redondea a cuatro
decimales y se crea un documento en `indicators`:

```text
symbol
marketData
sma
ema
rsi
macd
movingAverage
period
source = technicalindicators
timestamp
```

## Uso en recomendaciones

Los indicadores forman una recomendacion tecnica de respaldo:

- RSI extremo puede sugerir esperar o aplicar reversion a la media.
- EMA frente a SMA aporta direccion de tendencia.
- La variacion de 24 horas aporta fuerza reciente.
- Los parametros de riesgo determinan si una compra es aceptable.

La decision principal corresponde al Modelo DSS v1 cuando existe prediccion.
Si el modelo no puede entrenarse, las reglas tecnicas funcionan como fallback.

## Limitaciones

- Los indicadores describen datos pasados; no garantizan movimientos futuros.
- El periodo 14 no fue optimizado individualmente para cada activo.
- El MACD persistido no incluye todavia linea de senial ni histograma.
- Los snapshots de respaldo pueden tener distinta separacion temporal; durante
  Analisis se prefieren cierres uniformes de velas Binance.

## Referencias

- [technicalindicators en npm](https://www.npmjs.com/package/technicalindicators)
- [Codigo fuente de technicalindicators](https://github.com/anandanand84/technicalindicators)
