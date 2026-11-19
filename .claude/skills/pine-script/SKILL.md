---
name: pine-script
description: Escribir, corregir y explicar indicadores y estrategias de trading en Pine Script (TradingView) y NinjaScript (NinjaTrader), con foco en futuros NQ/MNQ. Usar cuando el usuario pida un indicador, estrategia, alerta, backtest, script de TradingView o NinjaTrader, o corregir un error de Pine.
---

# Pine Script y NinjaScript para NQ

## Reglas de Pine Script

- Empieza siempre con `//@version=6`.
- Usa `indicator()` para indicadores y `strategy()` para estrategias con backtest.
- **Nada de repintado:**
  - En `request.security()` usa `lookahead = barmerge.lookahead_off` y toma el valor confirmado `[1]` cuando pidas otra temporalidad.
  - Las señales se confirman al cierre de la vela (`barstate.isconfirmed`) cuando importe.
- En `strategy()` pon costos realistas. Para NQ: `commission_type = strategy.commission.cash_per_contract`, `commission_value = 2.5` y `slippage = 1` (ticks). Dile al usuario que los ajuste a su broker.
- Todo número configurable va con `input.*()` y su título en español.
- Sesión regular del NQ: 09:30-16:00 ET. Para filtrar por horario usa `time(timeframe.period, "0930-1600", "America/New_York")`.
- Alertas: `alertcondition()` en indicadores; `alert()` o el `alert_message` de las órdenes en estrategias.
- Stops y targets en ticks o puntos: 1 punto = 4 ticks. NQ: $20/punto. MNQ: $2/punto.

## Entrega

1. El script completo, listo para pegar en TradingView (Pine Editor → pegar → "Add to chart").
2. Debajo, 3-5 líneas: qué hace, qué inputs tiene y cómo leer las señales.
3. Si es una estrategia, recuerda: revisar el Strategy Tester con al menos 6 meses de datos, mirar el drawdown y no solo la ganancia, y probar en demo antes de usar dinero real.

## Si da error

Pide el mensaje exacto de error del Pine Editor y la línea. Los errores comunes de v5 → v6 son: conversión implícita de `int`/`float` a `bool` (ya no se permite) y `na` en condiciones `if`.

## NinjaScript (NinjaTrader 8)

- Es C#. Clase en `NinjaTrader.NinjaScript.Strategies` o `.Indicators`.
- Configura en `OnStateChange()` (`State.SetDefaults`, `State.Configure`) y la lógica en `OnBarUpdate()`.
- Revisa `CurrentBar < BarsRequiredToTrade` antes de operar.
- Prueba primero en Strategy Analyzer y luego en cuenta Sim.

## Límites

- No prometas rentabilidad. Un backtest bueno no garantiza resultados.
- No conectes scripts a cuentas reales para operar solos sin que el usuario lo pida explícitamente y entienda el riesgo.
