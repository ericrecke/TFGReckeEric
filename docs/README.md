# Documentacion tecnica

Este directorio describe las integraciones y decisiones tecnicas del prototipo
DSS Trading. El objetivo es explicar que datos se consumen, como se transforman
y que metodos del codigo participan en cada proceso.

## Contenido

- [Integracion con Binance](api/binance.md)
- [Calculo de indicadores tecnicos](architecture/technical-analysis.md)
- [Modelo predictivo DSS v1](architecture/modelo-predictivo.md)

## Flujo general

```text
Binance Spot API
    |
    |-- exchangeInfo ------> catalogo market_symbols
    |-- ticker/24hr -------> precio y estadisticas de 24 horas
    `-- klines ------------> velas OHLC
                                  |
                                  |-- technicalindicators
                                  `-- Modelo DSS v1
                                           |
                                           `--> recomendacion orientativa
```

La aplicacion no utiliza endpoints de ordenes ni credenciales de una cuenta de
Binance. Toda la informacion de mercado consumida proviene de endpoints
publicos.

## Codigo relacionado

```text
server/src/services/market.service.js
server/src/services/indicator.service.js
server/src/services/prediction.service.js
server/src/controllers/analysis.controllers.js
```

Estas paginas documentan el comportamiento actual del codigo. Si cambian
periodos, variables, reglas o endpoints, la documentacion debe actualizarse en
el mismo cambio.
