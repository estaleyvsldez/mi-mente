# ADR-004 · Formato de las respuestas numéricas

* Coma decimal (`0,75`); también se acepta el punto (`0.75`).
* Sin separador de miles: `1.000` se rechaza como ambiguo y se pide `1000`.
* Fracciones `3/4`, mixtos `1 3/4`, negativos `-5`.
* Listas separadas por `;` (la coma es decimal).
* Factorizaciones `2^3·3`, `2·2·2·3` o `2³ × 3`.
* Si el valor es correcto pero la forma no (fracción sin simplificar cuando se
  pide simplificada), se marca incorrecto **explicando por qué**.
* Una respuesta que no se puede interpretar **no cuenta como intento**.
