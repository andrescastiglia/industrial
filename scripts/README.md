# Scripts de Administración

Este directorio contiene scripts útiles para administrar el sistema.

## create-user.js

Script interactivo para crear usuarios desde la línea de comandos.

### Requisitos

- Node.js instalado
- Variable de entorno `DATABASE_URL` configurada
- Tabla `users` creada en la base de datos

### Uso

```bash
# Configurar DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# O en una sola línea
DATABASE_URL="postgresql://user:password@host:port/database" node scripts/create-user.js
```

El script solicitará interactivamente:

- Email del usuario
- Password (mínimo 6 caracteres)
- Role (admin, gerente, operario)
- Nombre
- Apellido

### Ejemplo de uso

```bash
$ DATABASE_URL="postgresql://..." node scripts/create-user.js

=================================
   CREAR NUEVO USUARIO
=================================

Email: juan@empresa.com
Password (mínimo 6 caracteres): password123
Role (admin/gerente/operario): gerente
Nombre: Juan
Apellido: Pérez

Creando usuario...

✅ Usuario creado exitosamente:

   ID:        2
   Email:     juan@empresa.com
   Role:      gerente
   Nombre:    Juan Pérez
   Activo:    Sí
   Creado:    2025-11-13T15:30:00.000Z
```

### Errores comunes

**Error: Variable DATABASE_URL no configurada**

```
❌ ERROR: Variable de entorno DATABASE_URL no configurada
```

Solución: Exportar la variable antes de ejecutar el script.

**Error: Tabla users no existe**

```
❌ Error al crear usuario:
   La tabla "users" no existe. Ejecuta primero:
   psql $DATABASE_URL -f scripts/database-schema.sql
```

Solución: Ejecutar primero la migración de base de datos.

**Error: Email duplicado**

```
❌ Error al crear usuario:
   El email ya está registrado
```

Solución: Usar un email diferente o actualizar el usuario existente.

## database-schema.sql

Script SQL para crear todas las tablas del sistema, incluyendo:

- Tabla `users` para autenticación
- Tablas de negocio (clientes, productos, órdenes, etc.)
- Índices para optimización
- Datos iniciales (tipos de componente, usuario admin)

### Ejecución

```bash
# Conectar a PostgreSQL y ejecutar
psql $DATABASE_URL -f scripts/database-schema.sql

# O desde psql interactivo
psql $DATABASE_URL
\i scripts/database-schema.sql
```

### Usuario admin inicial

El script crea automáticamente un usuario administrador:

**Para Producción:**
```
Email:    admin@ejemplo.com
Password: peperino
Role:     admin
```

**Para Desarrollo Local:**
```
Email:    admin@ejemplo.com
Password: admin123
Role:     admin
```

⚠️ **IMPORTANTE**: 
- El script SQL por defecto usa `peperino` (para producción)
- Para desarrollo local, comenta la línea de producción y descomenta la línea de desarrollo en el SQL
- Cambiar el password de producción después del primer login

## Comandos npm útiles

```bash
# Crear usuario interactivamente (usando .env local)
npm run create-user

# Ejecutar migración completa de base de datos (PRODUCCIÓN)
npm run db:migrate

# Configurar usuario admin para desarrollo local (admin123)
npm run db:dev-admin

# Ver logs de producción
npm run logs
```

Scripts disponibles en `package.json`:

```json
{
  "scripts": {
    "create-user": "node scripts/create-user.js",
    "db:migrate": "psql $DATABASE_URL -f scripts/database-schema.sql",
    "db:dev-admin": "psql $DATABASE_URL -f scripts/create-dev-admin.sql"
  }
}
```

## create-dev-admin.sql

Script SQL para configurar el usuario admin con password de desarrollo (`admin123`).

### ⚠️ Solo para desarrollo local

```bash
# Ejecutar en tu base de datos local
npm run db:dev-admin

# O manualmente
psql $DATABASE_URL -f scripts/create-dev-admin.sql
```

Este script:
- Crea o actualiza el usuario `admin@ejemplo.com`
- Establece el password a `admin123`
- Muestra confirmación en consola

**NO ejecutar en producción** - usar solo en ambiente de desarrollo/testing.
