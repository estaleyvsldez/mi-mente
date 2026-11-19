---
name: nq-noticias
description: Resumen de noticias y eventos que mueven el Nasdaq 100 (NQ/MNQ) en tiempo real. Usar cuando el usuario pida noticias del mercado, briefing pre-market, calendario económico, "qué mueve el NQ hoy", earnings de big tech, Fed, CPI, NFP, o contexto antes de operar.
---

# NQ Noticias

Objetivo: darle al usuario, en español y en menos de un minuto de lectura, lo que puede mover el NQ hoy. Datos verificados, con fuente y hora. Nunca inventar.

## Pasos

1. **Fecha y hora.** Toma la fecha y hora actual. Usa siempre hora de Nueva York (ET). Si es fin de semana o feriado de EE. UU., dilo.
2. **Calendario económico de hoy y mañana.** Busca en la web (ForexFactory, Investing.com, MarketWatch). Prioriza: CPI, PCE, NFP, Jobless Claims, ISM, GDP, retail sales, FOMC, minutas, discursos de Powell u otros miembros de la Fed. Por cada evento: hora ET, pronóstico y anterior; el real si ya salió.
3. **Earnings.** Revisa si reportan hoy o mañana los pesos pesados del NQ: NVDA, MSFT, AAPL, AMZN, META, GOOGL, AVGO, TSLA, COST, NFLX, AMD. Antes de apertura o después del cierre.
4. **Noticias de las últimas 12-24 h.** Busca: Fed y tasas, rendimiento del bono a 10 años, dólar (DXY), aranceles y geopolítica, regulación de chips o IA, noticias grandes de las empresas de arriba.
5. **Finnhub (opcional).** Si existe la variable de entorno `FINNHUB_API_KEY`, úsala para noticias:
   `curl -s "https://finnhub.io/api/v1/news?category=general&token=$FINNHUB_API_KEY"`
   Noticias de una empresa:
   `curl -s "https://finnhub.io/api/v1/company-news?symbol=NVDA&from=AAAA-MM-DD&to=AAAA-MM-DD&token=$FINNHUB_API_KEY"`
   Nunca muestres la clave en la respuesta.

## Formato de respuesta

```
NQ — [fecha] · [hora ET]

⏰ HOY (ET)
- 08:30 CPI m/m · pron 0.3% · ant 0.2%  ← ALTO IMPACTO
- ...

📊 EARNINGS
- NVDA después del cierre
- ...

📰 NOTICIAS CLAVE
- [titular corto] — [fuente, hora] — posible efecto: alcista/bajista/neutral para NQ
- ...

⚠️ RIESGO DEL DÍA: bajo / medio / alto — [una línea de por qué]
```

## Reglas

- Cada noticia lleva fuente y hora. Si no encuentras la hora, marca "(hora no confirmada)".
- Marca como **VIEJA** cualquier noticia de más de 24 h.
- Si no encuentras algo, dilo. No rellenes con suposiciones.
- No des señales de compra o venta ni niveles exactos de entrada. Da contexto: qué eventos traen volatilidad y cuándo.
- Recuerda en una línea, al final y solo la primera vez en la sesión: las noticias llegan antes a los algoritmos; esto es contexto, no consejo financiero.
- Datos de futuros: NQ = $20 por punto ($5 por tick de 0.25). MNQ = $2 por punto ($0.50 por tick).
