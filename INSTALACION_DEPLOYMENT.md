# Guía de Instalación y Deployment - Sistema Industrial

**Versión**: 1.0  
**Para**: Administradores de sistemas / DevOps / Setup inicial  
**Profundidad**: Operacional

---

## 📋 Tabla de Contenidos

1. [Requisitos del Sistema](#requisitos)
2. [Instalación Local](#instalación-local)
3. [Instalación en Producción](#instalación-producción)
4. [Docker Deployment](#docker)
5. [Configuración Avanzada](#configuración-avanzada)
6. [Monitoreo](#monitoreo)
7. [Backup y Recuperación](#backup)

---

## <a id="requisitos"></a>📦 Requisitos del Sistema

### Para Desarrollo Local

```
Sistema Operativo: Linux (Ubuntu 20.04+), macOS, o Windows (WSL2)
Node.js: v18.0.0 o superior
npm: v9.0.0 o superior
PostgreSQL: v14+ o v15+
RAM: Mínimo 2GB, Recomendado 4GB+
Espacio en disco: 2GB libre
```

### Para Producción

```
Sistema Operativo: Linux (Ubuntu 22.04 LTS recomendado)
Node.js: v18 LTS (Long Term Support)
PostgreSQL: v15 con replicación configurada
RAM: 8GB mínimo, 16GB recomendado
Espacio en disco: 10GB+ SSD
CPU: 2+ cores
Red: Acceso a puertos 80, 443 (HTTPS), 5432 (BD)
```

### Verificar Requisitos

```bash
# Node.js
node --version      # Debe ser v18.0.0+
npm --version       # Debe ser v9.0.0+

# PostgreSQL
psql --version      # Debe ser 14+

# Git (para clonar repo)
git --version
```

---

## <a id="instalación-local"></a>⚙️ Instalación Local

### Paso 1: Clonar el Repositorio

```bash
# HTTPS
git clone https://github.com/tuempresa/industrial.git
cd industrial

# O SSH (si tienes clave configurada)
git clone git@github.com:tuempresa/industrial.git
cd industrial
```

### Paso 2: Instalar Dependencias

```bash
# Opción A: npm (recomendado)
npm install

# Opción B: pnpm (más rápido)
npm install -g pnpm
pnpm install

# Verificar instalación
npm list | head -20
```

### Paso 3: Configurar Variables de Entorno

```bash
# Crear archivo .env.local
cat > .env.local << EOF
# Base de Datos PostgreSQL
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=industrial
DATABASE_USER=postgres
DATABASE_PASSWORD=tu_contraseña_segura

# JWT Secrets (generar con: openssl rand -base64 32)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_REFRESH_SECRET=otro_secret_diferente_para_refresh

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development

# Email (Opcional - para reportes)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=noreply@tuempresa.com

# Sentry (Opcional - para error tracking)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# WebSocket
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=3300

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development

# Autenticación (opcional)
JWT_SECRET=tu_jwt_secret_aqui
EOF

chmod 600 .env.local
```

### Paso 4: Configurar Base de Datos PostgreSQL

#### 4A: Si PostgreSQL está instalado localmente

```bash
# Iniciar PostgreSQL
sudo systemctl start postgresql

# Verificar estado
sudo systemctl status postgresql

# Conectar
sudo -u postgres psql
```

#### 4B: Crear BD y usuario

```sql
-- Dentro de psql (como root/postgres)

-- Crear base de datos
CREATE DATABASE industrial;

-- Crear usuario dedicado
CREATE USER app_user WITH PASSWORD 'contraseña_segura';

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE industrial TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

-- Salir
\q
```

#### 4C: Cargar esquema

```bash
# Desde bash
psql -U postgres -d industrial < scripts/database-schema.sql

# Verificar que se crearon tablas
psql -U postgres -d industrial -c "\dt"
```

**Esperado: 12+ tablas creadas**

```
                        List of relations
 Schema |                Name                 | Type  |  Owner
--------+-------------------------------------+-------+----------
 public | Clientes                            | table | postgres
 public | Compras                             | table | postgres
 public | Consumo_Materia_Prima_Produccion    | table | postgres
 public | Detalle_Compra_Materia_Prima        | table | postgres
 public | Detalle_Orden_Venta                 | table | postgres
 public | Etapas_Produccion                   | table | postgres
 public | Materia_Prima                       | table | postgres
 public | Operarios                           | table | postgres
 public | Ordenes_Produccion                  | table | postgres
 public | Ordenes_Venta                       | table | postgres
 public | Productos                           | table | postgres
 public | Productos_Componentes               | table | postgres
 public | Proveedores                         | table | postgres
 public | Tipo_Componente                     | table | postgres
(14 rows)
```

### Paso 5: Iniciar el Servidor de Desarrollo

```bash
# Terminal 1: Servidor Next.js
npm run dev

# Esperado en consola:
# ▲ Next.js 14.0.0
# - Local: http://localhost:3000
```

### Paso 6: Verificar Instalación

```bash
# En navegador
http://localhost:3000

# Debe mostrar:
# ✅ Dashboard principal cargado
# ✅ Menú lateral visible
# ✅ No hay errores en consola
```

---

## <a id="instalación-producción"></a>🚀 Instalación en Producción

### Arquitectura Recomendada

```
┌─────────────────────────────────────────────────┐
│  Nginx (Reverse Proxy, SSL/TLS)                 │
│  Puerto 80, 443                                 │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  Node.js App (PM2)                              │
│  http://localhost:3000 (interno)                │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  PostgreSQL                                     │
│  Puerto 5432 (local, no expuesto)               │
└─────────────────────────────────────────────────┘

WebSocket (puerto 3300):
  ├─ ws://app.example.com:3300 (externo)
  └─ O via Nginx ws upgrade
```

### Paso 1: Preparar Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2

# Verificar instalaciones
node --version
psql --version
nginx -v
```

### Paso 2: Preparar BD Producción

```bash
# Crear usuario BD con permisos limitados
sudo -u postgres psql << SQL
CREATE DATABASE industrial_prod;
CREATE USER app_prod WITH PASSWORD 'contraseña_super_segura_minimo_20_caracteres';
GRANT CONNECT ON DATABASE industrial_prod TO app_prod;
GRANT USAGE ON SCHEMA public TO app_prod;
GRANT CREATE ON SCHEMA public TO app_prod;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_prod;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_prod;
SQL

# Cargar esquema
sudo -u postgres psql -d industrial_prod < /home/app/industrial/scripts/database-schema.sql
```

### Paso 3: Clonar Aplicación

```bash
# Crear usuario dedicado para la app
sudo useradd -m -s /bin/bash app

# Cambiar a usuario app
sudo su - app

# Clonar repo en /home/app
git clone https://github.com/tuempresa/industrial.git
cd industrial
```

### Paso 4: Configurar Producción

```bash
# Como usuario app
cd ~/industrial

# Crear .env.production
cat > .env.production << EOF
# Base de Datos
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=industrial_prod
DATABASE_USER=app_prod
DATABASE_PASSWORD=contraseña_super_segura_minimo_20_caracteres

# WebSocket
WEBSOCKET_HOST=0.0.0.0
WEBSOCKET_PORT=3300

# Next.js
NEXT_PUBLIC_API_URL=https://app.ejemplo.com
NODE_ENV=production

# Seguridad
JWT_SECRET=$(openssl rand -base64 32)

# Proxy
PROXY_SECRET=$(openssl rand -base64 32)
EOF

chmod 600 .env.production
```

### Paso 5: Build Producción

```bash
# Como usuario app, en ~/industrial
npm install
npm run build

# Esperado: "✓ Ready in 45s"
```

### Paso 6: Configurar PM2

```bash
# Como usuario app, crear archivo de configuración
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'industrial-app',
    script: './node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  },
  {
    name: 'industrial-websocket',
    script: './server/websocket.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3300
    },
    error_file: './logs/ws-error.log',
    out_file: './logs/ws-out.log'
  }],
  deploy: {
    production: {
      user: 'app',
      host: 'tu.servidor.com',
      ref: 'origin/main',
      repo: 'https://github.com/tuempresa/industrial.git',
      path: '/home/app/industrial',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js'
    }
  }
};
EOF

# Crear directorio logs
mkdir -p logs

# Iniciar con PM2
pm2 start ecosystem.config.js

# Guardar configuración para auto-start
pm2 save
pm2 startup

# Ver estado
pm2 list
```

### Paso 7: Configurar Nginx

Como usuario **root** (sudo):

```bash
# Crear archivo de configuración
sudo tee /etc/nginx/sites-available/industrial > /dev/null << 'EOF'
upstream app {
    server localhost:3000;
}

upstream websocket {
    server localhost:3300;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name app.ejemplo.com www.app.ejemplo.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS principal
server {
    listen 443 ssl http2;
    server_name app.ejemplo.com www.app.ejemplo.com;

    # Certificados SSL (LetsEncrypt recomendado)
    ssl_certificate /etc/letsencrypt/live/app.ejemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.ejemplo.com/privkey.pem;

    # Seguridad SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/industrial_access.log;
    error_log /var/log/nginx/industrial_error.log;

    # Proxy a la app
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket upgrade
    location /api/socket.io {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Comprimir respuestas
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    gzip_proxied any;
}
EOF

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/industrial /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx

# Verificar estado
sudo systemctl status nginx
```

### Paso 8: SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot certonly --nginx -d app.ejemplo.com -d www.app.ejemplo.com

# Renovación automática (cada 90 días)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Ver certificado
sudo certbot certificates
```

### Paso 9: Verificar Instalación Producción

```bash
# Ver procesos PM2
pm2 list

# Ver logs en tiempo real
pm2 logs

# Verificar que la app responde
curl https://app.ejemplo.com

# Verificar WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://app.ejemplo.com/api/socket.io
```

---

## <a id="docker"></a>🐳 Docker Deployment

### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# Imagen final (más pequeña)
FROM node:18-alpine

WORKDIR /app

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar app compilada
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: industrial
      DATABASE_USER: app_user
      DATABASE_PASSWORD: ${DB_PASSWORD}
      WEBSOCKET_HOST: 0.0.0.0
      WEBSOCKET_PORT: 3300
    depends_on:
      - postgres
    networks:
      - industrial-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: industrial
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/database-schema.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - industrial-network
    restart: unless-stopped

volumes:
  postgres-data:

networks:
  industrial-network:
    driver: bridge
```

### Usar Docker

```bash
# Crear archivo de variables
cat > .env.docker << EOF
DB_PASSWORD=contraseña_segura_produccion
EOF

# Build
docker-compose build

# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Backup BD
docker-compose exec postgres pg_dump -U app_user industrial > backup.sql
```

---

## <a id="configuración-avanzada"></a>⚙️ Configuración Avanzada

### Optimizaciones de Producción

#### PostgreSQL Tuning

```sql
-- Conectar como admin: psql -U postgres

-- Ver parámetros actuales
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;

-- Modificar /etc/postgresql/15/main/postgresql.conf
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
random_page_cost = 1.1
log_min_duration_statement = 1000  -- Log queries > 1 segundo
```

#### Next.js Optimización

En `next.config.mjs`:

```javascript
export default {
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,

  // Cache API responses
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [{ key: "Cache-Control", value: "public, s-maxage=60" }],
    },
  ],
};
```

### Rate Limiting

```bash
# Instalar redis
sudo apt install -y redis-server

# Iniciar
sudo systemctl start redis-server
```

En aplicación:

```typescript
// middleware.ts
import { rateLimit } from "@/lib/rate-limit";

export async function middleware(request: Request) {
  const { success } = await rateLimit.check({
    key: request.ip,
    limit: 100,
    window: 60, // segundos
  });

  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }
}
```

---

## <a id="monitoreo"></a>📊 Monitoreo

### Health Check

```bash
# Script de verificación
cat > /home/app/health-check.sh << 'EOF'
#!/bin/bash

echo "=== Health Check $(date) ==="

# 1. Nginx
curl -s http://localhost:3000 > /dev/null && echo "✅ App: UP" || echo "❌ App: DOWN"

# 2. PostgreSQL
psql -U app_prod -d industrial_prod -c "SELECT 1" > /dev/null 2>&1 && echo "✅ DB: UP" || echo "❌ DB: DOWN"

# 3. PM2
pm2 list

# 4. Conexiones activas
echo "=== Conexiones BD ==="
psql -U app_prod -d industrial_prod -c "SELECT count(*) FROM pg_stat_activity;"

# 5. Órdenes en proceso
echo "=== Órdenes en proceso ==="
psql -U app_prod -d industrial_prod -c "SELECT COUNT(*) FROM Ordenes_Produccion WHERE estado = 'En Proceso';"
EOF

chmod +x /home/app/health-check.sh

# Ejecutar
/home/app/health-check.sh
```

### Logs

```bash
# Ver logs en tiempo real
pm2 logs

# Ver solo errores
pm2 logs --err

# Log Nginx
tail -50 /var/log/nginx/industrial_access.log
tail -50 /var/log/nginx/industrial_error.log

# Rotar logs
sudo logrotate /etc/logrotate.d/nginx
```

---

## <a id="backup"></a>💾 Backup y Recuperación

### Backup Automático

```bash
# Crear script de backup
cat > /home/app/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup BD
pg_dump -U app_prod -d industrial_prod | gzip > $BACKUP_DIR/bd_$DATE.sql.gz

# Backup archivos
tar -czf $BACKUP_DIR/app_$DATE.tar.gz ~/industrial

# Eliminar backups viejos (más de 30 días)
find $BACKUP_DIR -mtime +30 -delete

echo "✅ Backup completado: $DATE"
EOF

chmod +x /home/app/backup.sh

# Agendar backup diario (crontab)
crontab -e

# Agregar línea:
# 2 3 * * * /home/app/backup.sh >> /home/app/backup.log 2>&1
```

### Restaurar Backup

```bash
# Restaurar BD desde backup
gunzip < /home/app/backups/bd_20250110_030000.sql.gz | \
  psql -U app_prod -d industrial_prod

# Restaurar archivos
tar -xzf /home/app/backups/app_20250110_030000.tar.gz -C /home/app/
```

---

## 🎯 Checklist Final Producción

```
☐ Node.js v18 LTS instalado
☐ PostgreSQL v15 configurado
☐ Base de datos creada y esquema cargado
☐ Usuario BD con permisos limitados
☐ Variables de entorno en .env.production
☐ Build producción exitoso
☐ PM2 configurado y guardado
☐ Nginx instalado y configurado
☐ SSL Let's Encrypt configurado
☐ Certificados SSL renovación automática
☐ Health check ejecutándose
☐ Backups programados
☐ Logs rotados
☐ Firewall configurado (puertos 80, 443)
☐ Monitoreo activo
☐ Tests pasando
☐ Performance baseline documentado
```

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0  
**Estado**: ✅ Guía Completa de Instalación y Deployment
