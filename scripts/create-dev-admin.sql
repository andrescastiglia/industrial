-- Script para crear/actualizar usuario admin en DESARROLLO LOCAL
-- Este script actualiza el password del usuario admin a 'admin123' para testing
-- 
-- Uso:
--   psql $DATABASE_URL -f scripts/create-dev-admin.sql
--
-- IMPORTANTE: NO ejecutar en producción

-- Actualizar password del admin a admin123 (desarrollo)
-- Hash bcrypt de 'admin123' con 10 salt rounds
INSERT INTO usuarios (email, password_hash, role, nombre, apellido) 
VALUES ('admin@ejemplo.com', '$2b$10$fPJwTadoSPUICz0q3SDkeuYumaOPim3FPEGd5TkpGac.WJR7jgVoS', 'admin', 'Admin', 'Sistema')
ON CONFLICT (email) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

-- Verificar que el usuario fue creado/actualizado
SELECT 
    user_id, 
    email, 
    role, 
    nombre, 
    apellido, 
    created_at, 
    updated_at,
    is_active
FROM usuarios 
WHERE email = 'admin@ejemplo.com';

-- Mensaje informativo
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Usuario admin configurado para DESARROLLO';
    RAISE NOTICE '';
    RAISE NOTICE '   Email:    admin@ejemplo.com';
    RAISE NOTICE '   Password: admin123';
    RAISE NOTICE '   Role:     admin';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  RECORDATORIO: Este password es solo para desarrollo local';
    RAISE NOTICE '';
END $$;
