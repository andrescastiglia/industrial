#!/usr/bin/env node

/**
 * Script para crear usuarios en la base de datos desde la línea de comandos
 * 
 * Uso:
 *   node scripts/create-user.js
 * 
 * Variables de entorno requeridas:
 *   DATABASE_URL - URL de conexión a PostgreSQL
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Verificar que DATABASE_URL esté configurado
if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: Variable de entorno DATABASE_URL no configurada');
    console.error('');
    console.error('Uso:');
    console.error('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/create-user.js');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Función para hacer preguntas
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función principal
async function createUser() {
    try {
        console.log('');
        console.log('=================================');
        console.log('   CREAR NUEVO USUARIO');
        console.log('=================================');
        console.log('');

        // Solicitar datos
        const email = await question('Email: ');
        if (!isValidEmail(email)) {
            console.error('❌ Formato de email inválido');
            await cleanup();
            return;
        }

        const password = await question('Password (mínimo 6 caracteres): ');
        if (password.length < 6) {
            console.error('❌ El password debe tener al menos 6 caracteres');
            await cleanup();
            return;
        }

        const role = await question('Role (admin/gerente/operario): ');
        if (!['admin', 'gerente', 'operario'].includes(role)) {
            console.error('❌ Rol inválido. Debe ser: admin, gerente u operario');
            await cleanup();
            return;
        }

        const nombre = await question('Nombre: ');
        const apellido = await question('Apellido: ');

        console.log('');
        console.log('Creando usuario...');

        // Hash del password
        const password_hash = await bcrypt.hash(password, 10);

        // Insertar usuario en la BD
        const result = await pool.query(
            `INSERT INTO usuarios (email, password_hash, role, nombre, apellido)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, email, role, nombre, apellido, created_at, is_active`,
            [email, password_hash, role, nombre, apellido]
        ); console.log('');
        console.log('✅ Usuario creado exitosamente:');
        console.log('');
        console.log('   ID:       ', result.rows[0].user_id);
        console.log('   Email:    ', result.rows[0].email);
        console.log('   Role:     ', result.rows[0].role);
        console.log('   Nombre:   ', result.rows[0].nombre, result.rows[0].apellido);
        console.log('   Activo:   ', result.rows[0].is_active ? 'Sí' : 'No');
        console.log('   Creado:   ', result.rows[0].created_at);
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ Error al crear usuario:');

        if (error.code === '23505') {
            console.error('   El email ya está registrado');
        } else if (error.code === '23514') {
            console.error('   Rol inválido');
        } else if (error.code === '42P01') {
            console.error('   La tabla "usuarios" no existe. Ejecuta primero:');
            console.error('   psql $DATABASE_URL -f scripts/database-schema.sql');
        } else {
            console.error('   ', error.message);
        }
        console.error('');
    } finally {
        await cleanup();
    }
}

async function cleanup() {
    await pool.end();
    rl.close();
}

// Ejecutar
createUser();
