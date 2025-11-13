# Reportes Exportables - Documentación

## 📄 Descripción General

El sistema de reportes permite generar, exportar y enviar automáticamente reportes en formato PDF y Excel. Los reportes incluyen análisis de producción, ventas, inventario y costos con comparativas mensuales.

---

## 🎯 Tipos de Reportes

### 1. Reporte de Producción

**Contenido**:

- Total de órdenes completadas
- Unidades producidas
- Tasa de cumplimiento
- Comparativa vs mes anterior
- Detalle de cada orden (ID, producto, cantidad, estado, fecha)

**Casos de uso**:

- Reuniones de revisión de producción
- Análisis de capacidad productiva
- Reporte mensual a gerencia

### 2. Reporte de Ventas

**Contenido**:

- Ventas totales en pesos (COP)
- Cantidad de transacciones
- Ticket promedio
- Tendencia vs mes anterior
- Detalle de cada venta (ID, cliente, monto, estado, fecha)

**Casos de uso**:

- Análisis de desempeño comercial
- Proyección de ingresos
- Reporte a inversionistas

### 3. Reporte de Inventario

**Contenido**:

- Total de items en inventario
- Items bajo stock (críticos)
- Valor total del inventario
- Detalle de materia prima (código, nombre, cantidad, mínimo, estado)

**Casos de uso**:

- Planificación de compras
- Control de stock
- Auditorías de inventario

### 4. Reporte de Costos

**Contenido**:

- Total de compras del periodo
- Cantidad de transacciones
- Compra promedio
- Tendencia vs mes anterior
- Detalle de compras (ID, proveedor, monto, estado, fecha)

**Casos de uso**:

- Control de gastos
- Análisis de proveedores
- Presupuesto vs real

---

## 📊 Formatos de Exportación

### PDF

**Características**:

- Diseño profesional con logo y branding
- KPIs destacados en tarjetas visuales
- Tablas con formato alternado (zebra striping)
- Gráficos y tendencias visuales
- Pie de página con numeración
- Formato listo para imprimir

**Uso recomendado**:

- Presentaciones ejecutivas
- Reportes para stakeholders
- Documentación formal

**Generación**:

```typescript
// Cliente (Frontend)
const response = await fetch(
  `/api/reports/pdf?type=production&period=2024-11`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
const blob = await response.blob();
// Descargar o mostrar PDF
```

### Excel

**Características**:

- Datos brutos sin procesamiento
- Fórmulas automáticas (SUM, AVERAGE)
- Auto-filtros en headers
- Formato condicional
- Columnas auto-ajustadas
- Compatible con análisis posterior

**Uso recomendado**:

- Análisis de datos detallados
- Integración con otros sistemas
- Reportes con manipulación de datos

**Generación**:

```typescript
// Cliente (Frontend)
const response = await fetch(`/api/reports/excel?type=sales&period=2024-11`, {
  headers: { Authorization: `Bearer ${token}` },
});
const blob = await response.blob();
// Descargar Excel
```

---

## 📧 Envío por Email

### Configuración SMTP

**Variables de entorno requeridas** (`.env.local`):

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@empresa.com
SMTP_PASS=tu-contraseña-app
```

**Proveedores soportados**:

- Gmail (smtp.gmail.com:587)
- Microsoft/Outlook (smtp.office365.com:587)
- Yahoo (smtp.mail.yahoo.com:587)
- SendGrid (smtp.sendgrid.net:587)
- Mailgun (smtp.mailgun.org:587)
- Cualquier servidor SMTP estándar

**Configuración Gmail**:

1. Ir a Google Account: https://myaccount.google.com/
2. Seguridad → Verificación en 2 pasos (activar)
3. Contraseñas de aplicación → Generar nueva
4. Usar la contraseña de 16 caracteres en `SMTP_PASS`

### Tipos de Emails

#### 1. Reporte de Producción

```typescript
POST /api/reports/email
{
  "type": "production",
  "recipients": ["gerente@empresa.com", "produccion@empresa.com"],
  "period": "2024-11"
}
```

**Contenido del email**:

- HTML con diseño profesional
- KPIs destacados con colores
- Adjuntos: PDF + Excel
- Tendencias visuales (↑ verde, ↓ rojo)

#### 2. Reporte de Ventas

```typescript
POST /api/reports/email
{
  "type": "sales",
  "recipients": ["ventas@empresa.com"],
  "period": "2024-11"
}
```

**Contenido del email**:

- Ventas totales con formato de moneda
- Cantidad de transacciones
- Ticket promedio
- Adjuntos: PDF + Excel

#### 3. Resumen Ejecutivo

```typescript
POST /api/reports/email
{
  "type": "executive-summary",
  "recipients": ["ceo@empresa.com", "cfo@empresa.com"]
}
```

**Contenido del email**:

- Grid con 4 KPIs principales
- Alertas de órdenes vencidas/en riesgo
- Sin adjuntos (solo HTML)
- Actualización automática diaria/semanal

#### 4. Alerta Crítica

```typescript
POST /api/reports/email
{
  "type": "critical-alert",
  "recipients": ["admin@empresa.com"],
  "alertType": "Stock Crítico",
  "alertMessage": "5 items de materia prima están por debajo del mínimo",
  "alertDetails": {
    "items": ["Acero 304", "Vidrio templado", ...],
    "action": "Generar orden de compra urgente"
  }
}
```

**Contenido del email**:

- Header rojo con icono de advertencia
- Tipo y mensaje de alerta destacados
- Detalles en JSON formateado
- Prioridad alta

---

## 🖥️ Interfaz de Usuario

### Página de Reportes

**URL**: `/dashboard/reportes`

**Componentes**:

1. **Selector de Tipo**: Cards con descripción de cada reporte
2. **Selector de Periodo**: Dropdown con últimos 12 meses
3. **Vista previa**: Muestra el reporte que se generará
4. **Acciones de descarga**: Botones PDF y Excel
5. **Formulario de email**: Textarea con destinatarios separados por coma

**Flujo de uso**:

```
1. Usuario selecciona tipo de reporte (ej: Producción)
2. Usuario selecciona periodo (ej: Noviembre 2024)
3. Usuario hace clic en "Descargar PDF" o "Descargar Excel"
4. Sistema genera reporte y descarga automáticamente
5. (Opcional) Usuario ingresa emails y hace clic en "Enviar"
6. Sistema envía email con adjuntos a destinatarios
```

---

## 🔧 API Endpoints

### GET /api/reports/pdf

**Parámetros**:

- `type`: production | sales | inventory | costs
- `period`: YYYY-MM (opcional, default: mes actual)

**Headers**:

- `Authorization: Bearer {token}`

**Response**:

- Content-Type: application/pdf
- Content-Disposition: attachment; filename="Reporte_X_YYYY-MM.pdf"

**Códigos de estado**:

- 200: Reporte generado exitosamente
- 401: No autorizado (token inválido/expirado)
- 400: Parámetros inválidos
- 500: Error al generar reporte

**Ejemplo cURL**:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/pdf?type=production&period=2024-11" \
  --output reporte.pdf
```

---

### GET /api/reports/excel

**Parámetros**:

- `type`: production | sales | inventory | costs
- `period`: YYYY-MM (opcional, default: mes actual)

**Headers**:

- `Authorization: Bearer {token}`

**Response**:

- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Content-Disposition: attachment; filename="Reporte_X_YYYY-MM.xlsx"

**Códigos de estado**:

- 200: Reporte generado exitosamente
- 401: No autorizado
- 400: Parámetros inválidos
- 500: Error al generar reporte

**Ejemplo JavaScript**:

```javascript
const token = localStorage.getItem("token");
const response = await fetch("/api/reports/excel?type=sales&period=2024-10", {
  headers: { Authorization: `Bearer ${token}` },
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "reporte_ventas.xlsx";
a.click();
```

---

### POST /api/reports/email

**Headers**:

- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Body**:

```typescript
{
  type: 'production' | 'sales' | 'executive-summary' | 'critical-alert',
  recipients: string[],  // Array de emails
  period?: string,       // YYYY-MM (opcional para production/sales)
  alertType?: string,    // Requerido para critical-alert
  alertMessage?: string, // Requerido para critical-alert
  alertDetails?: any     // Opcional para critical-alert
}
```

**Response**:

```json
{
  "success": true,
  "message": "Reporte enviado exitosamente"
}
```

**Códigos de estado**:

- 200: Email enviado exitosamente
- 401: No autorizado
- 403: Sin permisos (solo admin/gerente)
- 400: Parámetros inválidos
- 503: Servicio de email no configurado
- 500: Error al enviar email

**Ejemplo cURL**:

```bash
curl -X POST http://localhost:3000/api/reports/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "production",
    "recipients": ["gerente@empresa.com"],
    "period": "2024-11"
  }'
```

---

## 🔐 Seguridad

### Autenticación

- Todos los endpoints requieren token JWT válido
- Token en header: `Authorization: Bearer {token}`
- Expiración: 24 horas (configurable)

### Autorización

- **Generación de reportes**: Usuarios autenticados (cualquier rol)
- **Envío de emails**: Solo admin y gerente
- Validación de rol en payload del JWT

### Rate Limiting

- 100 requests por minuto por usuario
- Prevención de abuso de generación de reportes

### Logging

- Todas las operaciones se registran con apiLogger
- Logs incluyen: usuario, tipo de reporte, duración, éxito/error
- Logs almacenados en: `logs/api.log`

### Datos Sensibles

- Credenciales SMTP en variables de entorno (nunca en código)
- Tokens JWT no se guardan en logs
- Emails de destinatarios validados

---

## 🐛 Resolución de Problemas

### Error: "Servicio de email no configurado"

**Causa**: Variables SMTP no están configuradas

**Solución**:

1. Crear archivo `.env.local`
2. Copiar contenido de `.env.example`
3. Completar con credenciales SMTP
4. Reiniciar servidor Next.js

---

### Error: "Email connection verification failed"

**Causa**: Credenciales SMTP incorrectas o firewall

**Solución**:

1. Verificar `SMTP_USER` y `SMTP_PASS`
2. Para Gmail, usar contraseña de aplicación (no contraseña normal)
3. Verificar que puerto 587 esté abierto
4. Verificar que `SMTP_HOST` sea correcto

---

### Error: "Error al generar reporte"

**Causa**: Datos faltantes en base de datos o consulta SQL fallida

**Solución**:

1. Verificar que existan registros en el periodo seleccionado
2. Revisar logs del servidor: `logs/api.log`
3. Verificar conexión a base de datos
4. Revisar consola del navegador para detalles

---

### Reporte vacío o con datos incorrectos

**Causa**: Periodo seleccionado sin datos

**Solución**:

1. Verificar que el periodo tenga registros en BD
2. Cambiar a un mes con actividad conocida
3. Ejecutar query SQL manualmente para verificar datos:

```sql
SELECT COUNT(*) FROM Ordenes_Produccion
WHERE fecha_finalizacion >= '2024-11-01'
  AND fecha_finalizacion <= '2024-11-30'
  AND estado = 'completada';
```

---

## 📈 Mejores Prácticas

### Para Administradores

1. **Configurar Email**:
   - Usar cuenta de email dedicada para el sistema
   - Configurar SPF/DKIM en el dominio para evitar spam
   - Usar servicio SMTP profesional (SendGrid, Mailgun) para producción

2. **Programar Reportes Automáticos**:
   - Configurar cron job para envío diario/semanal
   - Ejemplo (crontab):

```bash
# Enviar resumen ejecutivo cada lunes a las 8am
0 8 * * 1 curl -X POST localhost:3000/api/reports/email \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"executive-summary","recipients":["ceo@empresa.com"]}'
```

3. **Monitorear Logs**:
   - Revisar `logs/api.log` regularmente
   - Configurar alertas para errores críticos
   - Analizar tiempos de generación (optimizar queries lentos)

### Para Desarrolladores

1. **Extender Tipos de Reportes**:

```typescript
// Agregar nuevo tipo en pdf-generator.ts
export async function generateCustomReport(data: any): Promise<Blob> {
  const generator = new PDFGenerator()

  generator.addHeader({
    title: 'Mi Reporte Custom',
    subtitle: 'Descripción',
    period: data.period
  })

  generator.addKPIs([...])
  generator.addTableSection({...})

  return generator.generate()
}
```

2. **Personalizar Templates de Email**:

```typescript
// En email-service.ts
async sendCustomEmail(recipients: string[], data: any) {
  const html = `
    <html>
      <!-- Tu template HTML -->
    </html>
  `

  return await this.sendEmail({
    to: recipients,
    subject: 'Asunto Custom',
    html
  })
}
```

3. **Optimizar Queries**:

```typescript
// Agregar índices en BD
CREATE INDEX idx_ordenes_fecha ON Ordenes_Produccion(fecha_finalizacion);
CREATE INDEX idx_ventas_fecha ON Ventas(fecha_venta);
CREATE INDEX idx_compras_fecha ON Compras(fecha_compra);
```

---

## 📊 Métricas de Rendimiento

**Tiempos de generación** (promedio):

- PDF simple: 200-500ms
- Excel simple: 300-700ms
- PDF con 100+ registros: 1-2 segundos
- Excel con 100+ registros: 1.5-3 segundos
- Envío de email: 2-5 segundos

**Optimizaciones implementadas**:

- Queries SQL con índices
- Streaming de datos grandes
- Pooling de conexiones a BD
- Caché de configuración SMTP

---

## 🚀 Próximas Mejoras

- [ ] Reportes programados (cron jobs integrados)
- [ ] Templates personalizables por usuario
- [ ] Gráficos en reportes Excel
- [ ] Reportes con filtros avanzados
- [ ] Dashboard de analytics de reportes
- [ ] Firma digital de PDFs
- [ ] Watermark en reportes
- [ ] Historial de reportes generados
- [ ] Compresión ZIP para múltiples reportes
- [ ] API webhook para integración externa

---

**Versión**: 1.0.0  
**Última actualización**: 12 de noviembre de 2025  
**Autor**: Equipo de Desarrollo Industrial
