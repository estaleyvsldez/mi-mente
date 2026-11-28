# ADR-003 · El currículo es contenido (YAML), no código

**Decisión.** `curriculum/<módulo>/pensum.yaml` (temas y generadores) y
`lessons/bXX.yaml` (introducción, secciones, comprobaciones, glosario, banco).
Se validan con Pydantic (`extra="forbid"`) al arrancar y en las pruebas.

**Por qué.** Separar contenido académico de la lógica; revisable por el
propietario; añadir MAT-02 no requiere tocar el backend. Una huella SHA-256
del pensum impide modificarlo por accidente.
