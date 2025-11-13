# Changelog - Sistema de Gestión Industrial

Todos los cambios notables al proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [2.3.0] - 2025-11-13

### ✨ Añadido - Análisis de Eficiencia

#### Nuevas Funcionalidades

**Sistema de KPIs Automáticos**

- Cálculo de 4 KPIs principales:
  - Eficiencia de Producción: (Producido/Planificado) × 100
  - Utilización de Capacidad: (Horas Usadas/Disponibles) × 100
  - Costo por Unidad: Costos Totales / Unidades
  - Lead Time: Promedio de días de producción
- Estados de salud automáticos: excellent, good, warning, critical
- Comparativas mes vs mes anterior con porcentaje de variación
- Indicadores visuales de tendencia (↑ verde, ↓ rojo, — gris)

**Detección de Cuellos de Botella**

- Identificación automática de:
  - Etapas lentas (>5 días promedio)
  - Productos problemáticos (alta tasa de retrasos)
  - Proveedores lentos (confiabilidad <90%)
- Cálculo de niveles de impacto: high, medium, low
- Traducción automática de nombres de etapas al español

**Motor de Recomendaciones**

- Sistema basado en reglas con 8 categorías de análisis
- Priorización automática: crítico, alto, medio, bajo
- Niveles de urgencia: immediate, short-term, medium-term, long-term
- 20+ umbrales configurables
- Análisis de inventario integrado (detección stock bajo)
- Acciones específicas por área operativa
- Estimación de beneficios por recomendación

**Interfaz de Usuario**

- Página nueva: `/dashboard/analisis-eficiencia`
- 4 cards de KPIs con código de colores
- Progress bars dinámicas
- Sección de cuellos de botella en 3 columnas
- Lista de recomendaciones expandibles
- Badges de prioridad con colores
- Responsive design (mobile/tablet/desktop)
- Loading states y error handling

**API Endpoint**

- `GET /api/analytics/efficiency`
- Parámetros: `period` (YYYY-MM), `includeHistory`, `historyMonths`
- Autenticación JWT obligatoria
- Ejecución paralela de analizadores (Promise.all)
- Tiempo de respuesta: <500ms promedio

#### Archivos Nuevos

```
lib/analytics/
  ├── efficiency-analyzer.ts        (420 líneas)
  ├── bottleneck-detector.ts        (360 líneas)
  └── recommendation-engine.ts      (450 líneas)

app/api/analytics/
  └── efficiency/route.ts           (130 líneas)

app/dashboard/
  └── analisis-eficiencia/page.tsx  (443 líneas)

docs/
  └── EFFICIENCY_ANALYSIS_GUIDE.md  (500+ líneas)
```

**Total**: 1,803 líneas de código + 500 líneas de documentación

#### Tecnologías Añadidas

- SQL agregaciones avanzadas (FILTER, EXTRACT, CASE WHEN)
- Parallel async processing (Promise.all)
- Date manipulation (date-fns)

---

### 🔧 Corregido - Autenticación con Cookies

#### Problema Identificado

**Error**: `The edge runtime does not support Node.js 'crypto' module`

- **Causa**: Middleware intentaba validar JWT en Edge Runtime
- **Impacto**: Login exitoso pero sin redirección a dashboard
- **Síntomas**:
  - POST /api/auth/login 200 ✅
  - GET /dashboard 307 → GET /login ❌
  - Loop de redirección

#### Solución Implementada

**Arquitectura de Dos Capas**

1. **Middleware (Edge Runtime)**

   ```typescript
   // middleware.ts
   - Solo verifica PRESENCIA de token
   - Extrae de: cookie OR Authorization header
   - No realiza validación JWT (crypto no disponible)
   - Redirige a /login si ausente
   ```

2. **API Routes (Node.js Runtime)**
   ```typescript
   // api/*/route.ts
   - Validación JWT completa con verifyAccessToken()
   - Acceso a crypto module
   - Verificación de permisos RBAC
   - Logging de operaciones
   ```

**Sistema Híbrido de Almacenamiento**

- **Cookie**: `token` (7 días, SameSite=Lax, httpOnly=false)
  - Leída por middleware
  - Enviada automáticamente en requests
- **localStorage**: `accessToken`, `refreshToken`, `user`
  - Usada por fetch() API calls
  - Accesible desde JavaScript

**Cambios en Login**

```typescript
// app/login/page.tsx
- Agrega delay de 100ms para asegurar cookies
- Usa window.location.href en vez de router.replace()
- Full page reload fuerza lectura de cookies
- Cookie configurada con SameSite=Lax
```

#### Archivos Modificados

```diff
middleware.ts
- Removido: import verifyAccessToken, AUTH_ERRORS
- Removido: Validación JWT completa
+ Agregado: Simple token presence check
+ Agregado: Cookie OR header extraction

app/login/page.tsx
+ Agregado: await delay(100ms)
+ Cambiado: router.replace() → window.location.href
+ Agregado: SameSite=Lax en cookie

app/api/auth/login/route.ts
+ Agregado: response.cookies.set() con config completa

app/api/auth/logout/route.ts
+ Agregado: Cookie clear (maxAge: 0)
```

#### Testing Realizado

**Escenarios probados**:

- ✅ Login con admin@ejemplo.com → Dashboard OK
- ✅ Login con gerente@ejemplo.com → Dashboard OK
- ✅ Login con operario@ejemplo.com → Dashboard OK
- ✅ Navegación entre rutas protegidas → OK
- ✅ API calls con token en cookie → 200 OK
- ✅ Logout → Cookie cleared → Redirect to login

**Browsers testeados**:

- Chrome 120+
- Firefox 121+
- Safari 17+

---

### 📝 Documentación Actualizada

#### Archivos Modificados

**AUTH_README.md**

- Actualizado diagrama de arquitectura con Edge Runtime
- Agregada sección "Cookie-Based Authentication Flow"
- Documentado sistema híbrido (cookie + localStorage)
- Explicación de limitaciones Edge Runtime
- Ejemplos actualizados con cookies

**ROADMAP_DESARROLLO.md**

- Sección 2.3 marcada como ✅ COMPLETADO
- Agregadas métricas de implementación
- KPIs documentados con fórmulas
- Estado de salud por KPI
- Duración y LOC actualizados

**README.md**

- Sección "Estado del Proyecto" actualizada
- Fase 2.3 agregada con métricas
- Notas de implementación reciente
- Cambios en autenticación documentados
- Quick start actualizado con cookies

**GUIA_USUARIO.md**

- Versión actualizada a 2.0
- Sección "Nuevas Funcionalidades" agregada
- Instrucciones de Análisis de Eficiencia
- Guía de interpretación de KPIs
- Ejemplos de recomendaciones
- Screenshots de interfaz (pendiente)

**INSTALACION_DEPLOYMENT.md**

- Variables de entorno actualizadas
- JWT_SECRET y JWT_REFRESH_SECRET agregados
- EMAIL\_\* configuración para reportes
- SENTRY\_\* para error tracking

#### Nuevos Documentos

**EFFICIENCY_ANALYSIS_GUIDE.md** (500+ líneas)

- Fórmulas técnicas de cada KPI
- Queries SQL documentadas
- Reglas de negocio del motor de recomendaciones
- Ejemplos de uso de API
- Guía de integración frontend
- Troubleshooting común

---

## [2.2.0] - 2025-11-12

### ✨ Añadido - Reportes Exportables

- Generación de PDFs profesionales (jsPDF + jspdf-autotable)
- Exportación a Excel con formato (ExcelJS)
- Envío de reportes por email (Nodemailer)
- 4 tipos de reportes: Producción, Ventas, Inventario, Costos
- Interfaz de usuario en `/dashboard/reportes`
- Configuración SMTP via variables de entorno

**LOC**: 2,900+ líneas

---

## [2.1.0] - 2025-01-15

### ✨ Añadido - Dashboard Ejecutivo

- 4 KPIs en tiempo real (Producción, Inventario, Ventas, Costos)
- Gráfico de producción diaria (Recharts)
- Auto-refresh cada 5 minutos
- Panel de alertas (órdenes vencidas/en riesgo)
- Comparativas mes vs mes anterior
- Hook personalizado `useDashboard`

**LOC**: 725 líneas

---

## [1.3.0] - 2025-01-15

### ✨ Añadido - Testing Automatizado

- Jest + Testing Library configurado
- 112 tests implementados (error-handler: 50, validations: 62)
- CI/CD con GitHub Actions
- Matrix testing (Node 18.x, 20.x)
- Coverage reports automáticos
- Scripts: test, test:watch, test:coverage, test:ci

**LOC**: 1,000+ líneas de tests

---

## [1.2.0] - 2025-01-15

### ✨ Añadido - Manejo de Errores Uniforme

- 8 clases especializadas de error
- 40+ códigos estandarizados con prefijos
- Winston logging estructurado (4 transports)
- Sentry integration (client, server, edge)
- Helper functions (assertExists, assertPermission, assertBusinessRule)
- Mapeo automático de errores PostgreSQL

**LOC**: 1,370 líneas + 2,920 docs

---

## [1.1.0] - 2024-11-12

### ✨ Añadido - Validación de Datos Robusta

- Zod schemas (32 esquemas completos)
- 8 schemas de entidades principales
- validateRequest() middleware para API routes
- 14 funciones de validación de relaciones
- Sanitización automática de inputs
- Prevención SQL injection

**LOC**: 3,631 líneas + 550 docs

---

## [1.0.0] - 2024-11-01

### ✨ Inicial - Autenticación y Autorización

- Sistema JWT (access + refresh tokens)
- RBAC con 3 roles (admin, gerente, operario)
- Middleware de Next.js
- Bcrypt password hashing
- Hook useAuth para React
- API endpoints: /auth/login, /auth/logout, /auth/refresh

**LOC**: 623 líneas

---

## Leyenda de Símbolos

- ✨ **Añadido**: Nuevas funcionalidades
- 🔧 **Corregido**: Bugs solucionados
- 📝 **Documentación**: Cambios en docs
- 🔒 **Seguridad**: Patches de seguridad
- ⚡ **Performance**: Mejoras de rendimiento
- 🎨 **UI/UX**: Cambios de interfaz
- ♻️ **Refactor**: Cambios de código sin cambio funcional
- 🗑️ **Deprecated**: Funcionalidades obsoletas
- 🚀 **Deployment**: Cambios de infraestructura

---

## Formato de Versiones

Usamos [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Cambios incompatibles con versión anterior
- **MINOR** (0.X.0): Nuevas funcionalidades compatibles
- **PATCH** (0.0.X): Correcciones de bugs

---

**Última actualización**: 13 de noviembre, 2025
