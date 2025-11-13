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

```
Email:    admin@ejemplo.com
Password: peperino
Role:     admin
```

⚠️ **IMPORTANTE**: Cambiar este password después del primer login en producción.

## Comandos npm útiles

```bash
# Crear usuario (usando .env local)
npm run create-user

# Ejecutar migración de base de datos
npm run db:migrate

# Ver logs de producción
npm run logs
```

Agregar estos scripts a `package.json`:

```json
{
  "scripts": {
    "create-user": "node scripts/create-user.js",
    "db:migrate": "psql $DATABASE_URL -f scripts/database-schema.sql"
  }
}
```
