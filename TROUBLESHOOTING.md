# Guía de Troubleshooting Técnico - Sistema Industrial

**Para**: Personal técnico / Administradores  
**Profundidad**: Técnica avanzada

---

## 🔧 Problemas y Soluciones

### 1. Sistema No Inicia

#### Síntoma

- Página en blanco al ir a `http://localhost:3000`
- Error: `ERR_CONNECTION_REFUSED`

#### Diagnóstico Rápido

```bash
# Verificar si el servidor está corriendo
lsof -i :3000

# Verificar procesos Node
ps aux | grep node

# Verificar si hay errores en la terminal
npm run dev
```

#### Soluciones

**Opción A: Servidor no está corriendo**

```bash
cd /workspaces/industrial

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

**Opción B: Puerto 3000 está ocupado**

```bash
# Matar proceso que ocupa el puerto
lsof -i :3000
kill -9 <PID>

# O cambiar puerto
PORT=3001 npm run dev
```

**Opción C: Dependencias corruptas**

```bash
# Limpiar cache y reinstalar
rm -rf node_modules pnpm-lock.yaml
npm install
npm run dev
```

---

### 2. Base de Datos No Conecta

#### Síntoma

- Error: `FATAL: password authentication failed`
- Error: `connect ECONNREFUSED 127.0.0.1:5432`
- Funcionalidad CRUD no funciona

#### Diagnóstico

```bash
# Verificar si PostgreSQL está corriendo
psql --version
systemctl status postgresql

# Intentar conexión manual
psql -h localhost -U postgres -d industrial
```

#### Soluciones

**Si PostgreSQL no está corriendo**:

```bash
# Iniciar PostgreSQL
sudo systemctl start postgresql

# Verificar que la base de datos existe
psql -h localhost -U postgres -l
```

**Si la contraseña es incorrecta**:

```bash
# Revisar archivo de configuración
cat /workspaces/industrial/lib/database.ts

# Línea a buscar:
# password: "tu_contraseña"

# Cambiar contraseña en PostgreSQL
psql -U postgres
ALTER USER postgres WITH PASSWORD 'nueva_contraseña';
```

**Si falta la base de datos**:

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE industrial;"

# Cargar esquema
psql -U postgres -d industrial < /workspaces/industrial/scripts/database-schema.sql

# Verificar tablas
psql -U postgres -d industrial -c "\dt"
```

**Pool de conexiones al máximo**:

```bash
# Revisar /lib/database.ts
# max: 20 es el límite

# Si hay muchas conexiones inactivas:
psql -U postgres -d industrial -c "SELECT * FROM pg_stat_activity;"

# Terminar conexiones viejas:
psql -U postgres -d industrial -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='industrial' AND state='idle' AND query_start < now() - interval '10 minutes';"
```

---

### 3. WebSocket No Conecta

#### Síntoma

- Console error: `WebSocket is closed before the connection is established`
- DevTools muestra "WebSocket: ❌ Desconectado"
- Dashboard no se actualiza en tiempo real

#### Diagnóstico

```bash
# Verificar puerto 3300
lsof -i :3300

# Conectar manualmente
node -e "const ws = new (require('ws'))('ws://localhost:3300'); ws.on('open', () => { console.log('✅ Conectado'); ws.close(); });"
```

#### Soluciones

**WebSocket server no está corriendo**:

Ubicación: Revisar si hay archivo separado para servidor WebSocket

```bash
# Buscar servidor WebSocket
find /workspaces/industrial -name "*websocket*" -o -name "*ws*" -type f

# Si no existe, crear uno simple:
# /workspaces/industrial/ws-server.js
```

**Puerto 3300 ocupado**:

```bash
# Liberar puerto
lsof -i :3300
kill -9 <PID>

# O cambiar puerto en /lib/websocket-config.ts
```

**Firewall bloqueando puerto**:

```bash
# Verificar reglas firewall
sudo ufw status

# Permitir puerto 3300
sudo ufw allow 3300

# O deshabilitar firewall temporalmente
sudo ufw disable
```

**Problemas de CORS**:

```javascript
// En /lib/websocket-config.ts, agregar:
const ws = new WebSocket("ws://localhost:3300", {
  origin: "http://localhost:3000",
});
```

---

### 4. Consumos de Material No Se Calculan

#### Síntoma

- Crear orden de producción
- No aparecen registros en `Consumo_Materia_Prima_Produccion`
- Los consumos están `NULL` o vacíos

#### Diagnóstico

**Verificar producto tiene componentes**:

```sql
-- Conectar a DB
psql -U postgres -d industrial

-- Ver producto
SELECT * FROM Productos WHERE id = 1;

-- Ver componentes del producto
SELECT * FROM Productos_Componentes WHERE producto_id = 1;
```

**Verificar orden fue creada**:

```sql
-- Ver órdenes
SELECT * FROM Ordenes_Produccion ORDER BY id DESC LIMIT 1;

-- Ver consumos de la orden
SELECT * FROM Consumo_Materia_Prima_Produccion
WHERE orden_produccion_id = <ID_ORDEN>;
```

#### Soluciones

**Opción A: Producto sin componentes definidos**

Solución: Agregar componentes al producto

```bash
# Desde UI:
1. Ve a "Productos"
2. Click editar producto
3. Agregar componentes
4. Definir cantidades necesarias
```

**Opción B: Función calculateMaterialConsumption no se llama**

Verificar archivo `/lib/production-calculations.ts`:

```typescript
// Debe existir esta función
export async function calculateMaterialConsumption(
  productoId: number,
  cantidad: number,
  pool: any
) {
  // ... código de cálculo
}
```

Verificar que se llama en `/app/api/ordenes-produccion/route.ts` (método POST):

```typescript
// En el POST handler:
const consumptions = await calculateMaterialConsumption(
  producto_id,
  cantidad,
  pool
);
```

**Opción C: Error en la consulta SQL**

Revisar logs:

```bash
# Ejecutar desde terminal
npm run dev

# Buscar errores en la consola
# Debe haber logs de la función calculateMaterialConsumption
```

**Opción D: Transacción fallando**

```sql
-- Verificar manualmente
BEGIN;
INSERT INTO Consumo_Materia_Prima_Produccion (orden_produccion_id, materia_prima_id, cantidad)
VALUES (1, 1, 100.00);
COMMIT;
```

Si falla la inserción: revisar que la orden existe y los IDs de materiales son válidos.

---

### 5. API Retorna 500 - Error Interno

#### Síntoma

- API call falla con `HTTP 500`
- Error no específico en consola

#### Diagnóstico

**Habilitar logs detallados**:

```bash
# Agregar a /app/api/[route]/route.ts:
console.log('DEBUG:', { body, params, query });

# Ejecutar con logs
npm run dev 2>&1 | tee debug.log

# Ver logs después
tail -100 debug.log
```

#### Soluciones

**Errores comunes**:

1. **Campo faltante en request body**

   ```typescript
   // Agregar validación:
   if (!body.producto_id) {
     return Response.json({ error: "producto_id requerido" }, { status: 400 });
   }
   ```

2. **ID no existe en DB**

   ```sql
   -- Verificar que el ID existe:
   SELECT * FROM Productos WHERE id = 999;
   -- Si retorna 0 filas, el ID no existe
   ```

3. **Error de tipo de dato**

   ```typescript
   // Asegurar conversión correcta:
   const cantidad = parseInt(body.cantidad); // string → number
   ```

4. **Pool de conexiones agotado**
   ```typescript
   // Aumentar max connections en /lib/database.ts:
   const pool = new pg.Pool({
     max: 30, // Aumentar de 20 a 30
   });
   ```

---

### 6. Interfaz Lenta o Congelada

#### Síntoma

- Página tarda >3 segundos en cargar
- Tabla con muchos registros no responde
- DevTools muestra "Unresponsive script"

#### Diagnóstico

**Medir velocidad**:

```bash
# En browser DevTools → Network tab
# Verificar tiempos de:
# - HTML inicial: < 1s
# - API calls: < 2s
# - Rendering: < 1s

# En terminal:
npm run build
# Ver tamaño del bundle
```

#### Soluciones

**Para API lenta**:

```sql
-- Verificar índices en DB
EXPLAIN ANALYZE SELECT * FROM Ordenes_Produccion ORDER BY id DESC LIMIT 50;

-- Si es lento, crear índice:
CREATE INDEX idx_ordenes_produccion_id ON Ordenes_Produccion(id DESC);
```

**Para rendering lento**:

```typescript
// En /app/dashboard/ordenes-produccion/page.tsx

// ANTES: Renderizar todas las filas
{ordenes.map(o => <Row key={o.id} {...o} />)}

// DESPUÉS: Usar paginación
const [page, setPage] = useState(1);
const pageSize = 50;
const startIdx = (page - 1) * pageSize;
const paginatedOrdenes = ordenes.slice(startIdx, startIdx + pageSize);

{paginatedOrdenes.map(o => <Row key={o.id} {...o} />)}
```

**Para bundle grande**:

```bash
# Analizar tamaño del bundle
npm run build -- --analyze

# Identificar paquetes grandes
# Reemplazar con alternativas más pequeñas o
# Hacer lazy loading de componentes
```

---

### 7. Errores de TypeScript

#### Síntoma

- `error TS2307: Cannot find module 'ws'`
- Compilación falla
- Tipos no reconocidos

#### Diagnóstico

```bash
# Ver errores completos
npm run build

# Verificar que tipos están instalados
npm list @types/ws
```

#### Soluciones

**Instalar tipos faltantes**:

```bash
npm install --save-dev @types/ws
npm install ws
```

**Si no funciona, reinstalar dependencias**:

```bash
rm -rf node_modules
npm install
npm run build
```

---

### 8. Cambios de Código No Se Reflejan

#### Síntoma

- Edité un archivo
- El navegador no muestra cambios
- Cambios anteriores siguen mostrándose

#### Diagnóstico

Esto normalmente ocurre por caching:

#### Soluciones

**Opción A: Recargar navegador**

```
Ctrl+Shift+R (Hard refresh - borra caché)
```

**Opción B: El servidor no está recargando automáticamente**

```bash
# Asegurar que HMR está habilitado
npm run dev

# Verificar en next.config.mjs:
# webpack: (config, { dev, isServer }) => {
#   if (dev) config.watchOptions = { poll: 1000 };
#   return config;
# }
```

**Opción C: Cambios en API no se ven**

El API necesita reinicio manual:

```bash
# Detener servidor
Ctrl+C

# Reiniciar
npm run dev
```

---

### 9. Error de Permisos en BD

#### Síntoma

- `permission denied for schema public`
- `ERROR: permission denied for table`

#### Diagnóstico

```bash
# Conectar como admin
psql -U postgres -d industrial

# Ver permisos del usuario
\dp

# Ver usuarios y roles
\du
```

#### Soluciones

```sql
-- Dar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE industrial TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Aplicar para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
```

---

### 10. Esquema de BD Corrupto

#### Síntoma

- Tablas no existen
- Relaciones incorrectas
- Integridad referencial rota

#### Diagnóstico

```bash
# Verificar estado del schema
psql -U postgres -d industrial -c "\dt"

# Ver relaciones
psql -U postgres -d industrial -c "\d Ordenes_Produccion"
```

#### Soluciones

**Restaurar desde script**:

```bash
# Opción A: Recrear BD desde cero
psql -U postgres -c "DROP DATABASE IF EXISTS industrial;"
psql -U postgres -c "CREATE DATABASE industrial;"
psql -U postgres -d industrial < /workspaces/industrial/scripts/database-schema.sql
```

**Opción B: Si solo falta una tabla**

```bash
# Encontrar el SQL de la tabla en database-schema.sql
grep -n "CREATE TABLE <nombre_tabla>" /workspaces/industrial/scripts/database-schema.sql

# Ejecutar solo ese CREATE TABLE
psql -U postgres -d industrial -c "CREATE TABLE ..."
```

---

## 🔍 Herramientas de Debugging

### Inspeccionar API

```bash
# Llamar API directamente
curl http://localhost:3000/api/ordenes-produccion

# Con más detalles
curl -v http://localhost:3000/api/ordenes-produccion

# POST request
curl -X POST http://localhost:3000/api/ordenes-produccion \
  -H "Content-Type: application/json" \
  -d '{"producto_id": 1, "cantidad": 100}'
```

### Inspeccionar BD

```bash
# Conectar a BD
psql -U postgres -d industrial

# Comandos útiles:
\dt                    # Ver todas las tablas
\d Ordenes_Produccion  # Ver estructura de tabla
SELECT COUNT(*) FROM Ordenes_Produccion;  # Contar registros
SELECT * FROM Ordenes_Produccion LIMIT 5;  # Ver primeros 5
```

### Inspeccionar WebSocket

```bash
# En browser console:
const ws = new WebSocket('ws://localhost:3300');
ws.onopen = () => console.log('✅ Conectado');
ws.onmessage = (e) => console.log('📨', e.data);
ws.onerror = (e) => console.error('❌', e);
ws.onclose = () => console.log('❌ Cerrado');
```

---

## 🆘 Si Nada Funciona

### Reinicio Completo del Sistema

```bash
# 1. Detener servidor
Ctrl+C

# 2. Matar todos los procesos Node
killall node

# 3. Limpiar
rm -rf .next node_modules pnpm-lock.yaml

# 4. Reinstalar
npm install

# 5. Reiniciar PostgreSQL
sudo systemctl restart postgresql

# 6. Verificar BD
psql -U postgres -d industrial -c "SELECT COUNT(*) FROM Ordenes_Produccion;"

# 7. Iniciar servidor
npm run dev
```

### Reporte de Error

Si persiste el problema, recolecta esta información:

```
Fecha/Hora: [cuando ocurrió]
Navegador: [Chrome, Firefox, Safari]
Sistema: [Windows, Mac, Linux]
Acción: [qué estabas haciendo cuando falló]
Error exacto: [copiar mensaje de error]
Logs: [copiar de consola del navegador]

Archivos adjuntos:
- Screenshot del error
- Logs del servidor (npm run dev output)
```

---
