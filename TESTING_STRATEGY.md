# Testing Strategy

## Objetivo

La estrategia de testing toma a los scripts SQL como contrato de datos del sistema. Por eso el bootstrap de testing parte siempre de `scripts/database-schema.sql` y `scripts/create-dev-admin.sql`.

## Capas

- Unitarias: validadores, auth, permisos, helpers de negocio, cálculo de consumos y cliente API.
- Integración de rutas: handlers críticos (`ventas`, `compras`, `ordenes-produccion`) con mocks de autenticación y base.
- E2E smoke: navegación protegida y pantalla de login con Playwright.
- E2E full-flow: para CI o staging con PostgreSQL real reseteada desde scripts.

## Bootstrap de Base de Datos

- `npm run db:test:start`
- `npm run db:test:reset`
- `npm run db:test:stop`
- Si `TEST_DATABASE_URL` no está definido, la suite levanta una PostgreSQL descartable en Docker sobre `127.0.0.1:55432`.
- El reset elimina y recrea el schema `public`, vuelve a ejecutar `database-schema.sql`, recrea el admin de desarrollo y carga `scripts/seed-e2e-base.sql`.
- Los emails e2e no salen a un SMTP real: cuando `EMAIL_CAPTURE_DIR` está definido se capturan en disco para validación.

## Cobertura Objetivo

- Unitarias + integración de rutas: mantener al menos 80% statements y 60% branches sobre el alcance crítico actual.
- E2E smoke: cubrir acceso anónimo, login y redirecciones protegidas.
- E2E full-flow recomendado:
  - Login con admin de desarrollo.
  - CRUD de cliente, compra y venta.
  - Orden de producción con consumo automático.
  - Reportes PDF/Excel y envío por email con captura local.

## Comandos

- `npm test -- --runInBand`
- `npm run test:coverage -- --runInBand`
- `npm run db:test:start`
- `npm run db:test:reset`
- `npm run test:e2e`
- `npm run db:test:stop`
- `npm run test:e2e:install`
