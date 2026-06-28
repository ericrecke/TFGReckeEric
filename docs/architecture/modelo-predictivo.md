# Modelo predictivo DSS v1

## Proposito

Modelo DSS v1 clasifica el siguiente movimiento esperado de un activo en:

```text
VENDER | ESPERAR | COMPRAR
```

Es una herramienta de soporte. No predice un precio exacto, no ejecuta ordenes
y no reemplaza el criterio del usuario.

Implementacion:

```text
server/src/services/prediction.service.js
server/src/controllers/analysis.controllers.js
```

Biblioteca:

```js
const tf = require('@tensorflow/tfjs');
```

## Datos de entrada

El analisis solicita hasta 1000 velas del simbolo y temporalidad seleccionados.
El modelo utiliza unicamente los precios de cierre validos.

Se requieren:

- Al menos 72 cierres para intentar una prediccion.
- Al menos 50 muestras de entrenamiento luego de crear ventanas y etiquetas.

No se mezclan temporalidades: la cache se identifica mediante
`simbolo:temporalidad`.

## Variables del modelo

Para cada posicion se calculan cinco variables:

| Indice | Variable | Calculo | Limite |
| --- | --- | --- | --- |
| 0 | Retorno de 1 periodo | `(actual / anterior - 1) * 100` | `[-10, 10]` |
| 1 | Retorno de 5 periodos | `(actual / precio_5 - 1) * 100` | `[-20, 20]` |
| 2 | Distancia al promedio de 5 | `(actual / promedio_5 - 1) * 100` | `[-10, 10]` |
| 3 | Distancia al promedio de 20 | `(actual / promedio_20 - 1) * 100` | `[-20, 20]` |
| 4 | Volatilidad de 20 periodos | Desvio de retornos por 100 | `[0, 10]` |

`clamp()` evita que valores extremos dominen el entrenamiento.

## Creacion de etiquetas

Cada muestra usa el retorno de la vela siguiente:

```text
futureReturn = (cierre_siguiente / cierre_actual - 1) * 100
threshold = clamp(volatilidad * 0.35, 0.1, 2)
```

Clasificacion:

| Condicion | Indice | Etiqueta |
| --- | --- | --- |
| `futureReturn < -threshold` | 0 | VENDER |
| Dentro del umbral | 1 | ESPERAR |
| `futureReturn > threshold` | 2 | COMPRAR |

El umbral dinamico evita aplicar la misma sensibilidad a mercados con
volatilidades distintas.

## Arquitectura

```text
Entrada: 5 variables
    |
Dense: 12 neuronas, activacion ReLU
    |
Dense: 3 neuronas, activacion Softmax
    |
Salida: [vender, esperar, comprar]
```

Configuracion:

```js
optimizer: Adam(0.01)
loss: categoricalCrossentropy
metric: accuracy
epochs: 20
batchSize: 32
shuffle: false
```

Las etiquetas se transforman con `tf.oneHot()`. Los inicializadores Glorot usan
semillas 42 y 43 para reducir variaciones entre entrenamientos.

## Entrenamiento e inferencia

1. `createTrainingSet()` genera variables y etiquetas historicas.
2. `createModel()` construye y compila la red.
3. `trainModel()` crea tensores y ejecuta `model.fit()`.
4. `getModel()` reutiliza el modelo durante 15 minutos.
5. `predictMarketDirection()` calcula las variables mas recientes.
6. `model.predict()` devuelve tres valores softmax.
7. La clase con valor mayor se presenta como resultado principal.

Los tensores de entrada y entrenamiento se liberan mediante `dispose()` para
evitar crecimiento de memoria.

## Cache

La cache vive en memoria del proceso Node.js:

```text
clave: simbolo:temporalidad
duracion: 15 minutos
```

Al vencer, el modelo anterior se libera y se entrena uno nuevo. Reiniciar el
backend elimina toda la cache. Los pesos no se guardan en MongoDB ni en disco.

## Integracion con riesgo e indicadores

`generateAnalysis()` obtiene en paralelo ticker y velas, calcula indicadores,
entrena o reutiliza el modelo y genera una explicacion tecnica.

Regla final:

- La salida del modelo es la decision principal.
- Si recomienda COMPRAR pero la relacion beneficio/riesgo es menor a 1.5 o el
  riesgo maximo supera 3%, el resultado se cambia a ESPERAR.
- Si no existe prediccion, se utiliza la recomendacion tecnica de fallback.

Se persisten:

```text
predictedResult
confidencePercent
probabilities.sell
probabilities.hold
probabilities.buy
model = dss-predictive-v1
trainingSamples
```

## Interpretacion de confianza

`confidencePercent` es el mayor valor de la salida softmax multiplicado por
100. Debe interpretarse como confianza interna relativa entre las tres clases.

No es:

- Una probabilidad calibrada de obtener ganancias.
- Una estimacion de precision futura.
- Una garantia de que el mercado seguira la recomendacion.

## Limitaciones actuales
- El entrenamiento se realiza durante la solicitud de analisis.
- No existe todavia un conjunto separado de validacion.
- El modelo usa cierres; no usa volumen, maximo, minimo ni noticias.
- Los pesos son temporales.
- El rendimiento historico del modelo no debe inferirse desde la confianza
  softmax.

Para una version posterior deberiamos tener:entrenamiento offline reproducible,
division temporal train/validation/test, backtesting con costos, calibracion de
probabilidades y monitoreo de drift.

## Referencias oficiales

- [Modelos y capas en TensorFlow.js](https://www.tensorflow.org/js/guide/models_and_layers)
- [Entrenamiento de modelos en TensorFlow.js](https://www.tensorflow.org/js/guide/train_models)
- [API de TensorFlow.js](https://js.tensorflow.org/api/latest/)
- [Guardar y cargar modelos](https://www.tensorflow.org/js/guide/save_load)
