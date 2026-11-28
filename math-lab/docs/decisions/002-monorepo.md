# ADR-002 · Monorepo en la carpeta `math-lab/`

**Decisión.** Motor, backend, frontend, currículo y documentación conviven en
`math-lab/` dentro del repositorio `mi-mente`, separados por carpetas.

**Por qué.** Un solo lugar, versiones coherentes entre capas, sin publicar
paquetes. El motor es un paquete independiente (`engine/pyproject.toml`) y
podría extraerse a otro repositorio sin cambios.
