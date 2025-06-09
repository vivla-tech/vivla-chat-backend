import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Validar variables de entorno requeridas
const DB_NAME = process.env.POSTGRES_DB;
const APP_USER = process.env.POSTGRES_USER;
const APP_PASSWORD = process.env.POSTGRES_PASSWORD;
const DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = process.env.POSTGRES_PORT || '5432';

// Usar el usuario del sistema para operaciones administrativas
const ADMIN_USER = os.userInfo().username;

if (!DB_NAME || !APP_USER || !APP_PASSWORD) {
    console.error('❌ Error: Faltan variables de entorno requeridas en .env.local');
    console.error('Se requieren: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD');
    process.exit(1);
}

console.log('📝 Configuración de la base de datos:');
console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
console.log(`   Database: ${DB_NAME}`);
console.log(`   App User: ${APP_USER}`);
console.log(`   Admin User: ${ADMIN_USER}`);

async function resetDatabase() {
    try {
        // Crear una conexión temporal usando el usuario del sistema
        const sequelize = new Sequelize('postgres', ADMIN_USER, null, {
            host: DB_HOST,
            port: DB_PORT,
            dialect: 'postgres',
            logging: false
        });

        console.log('🔄 Conectando a PostgreSQL como usuario del sistema...');
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa');

        // Terminar todas las conexiones a la base de datos
        console.log(`🔌 Terminando conexiones existentes a ${DB_NAME}...`);
        await sequelize.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '${DB_NAME}'
            AND pid <> pg_backend_pid();
        `);
        console.log('✅ Conexiones terminadas');

        // Eliminar la base de datos si existe
        console.log(`🗑️  Eliminando base de datos ${DB_NAME} si existe...`);
        await sequelize.query(`DROP DATABASE IF EXISTS ${DB_NAME};`);
        console.log('✅ Base de datos eliminada');

        // Crear una nueva base de datos
        console.log(`📦 Creando nueva base de datos ${DB_NAME}...`);
        await sequelize.query(`CREATE DATABASE ${DB_NAME};`);
        console.log('✅ Base de datos creada');

        // Otorgar privilegios básicos al usuario de la aplicación
        console.log(`🔑 Otorgando privilegios básicos a ${APP_USER}...`);
        await sequelize.query(`
            -- Otorgar todos los privilegios en la base de datos
            GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${APP_USER};
            
            -- Otorgar privilegios para modificar parámetros de sesión
            ALTER USER ${APP_USER} SET session_replication_role = 'replica';
        `);
        console.log('✅ Privilegios básicos otorgados');

        // Cerrar la conexión temporal
        await sequelize.close();

        // Crear una nueva conexión a la base de datos específica
        const dbSequelize = new Sequelize(DB_NAME, ADMIN_USER, null, {
            host: DB_HOST,
            port: DB_PORT,
            dialect: 'postgres',
            logging: false
        });

        // Otorgar privilegios en el esquema
        console.log(`🔑 Otorgando privilegios en el esquema a ${APP_USER}...`);
        await dbSequelize.query(`
            -- Otorgar privilegios en el esquema public
            GRANT ALL ON SCHEMA public TO ${APP_USER};
            
            -- Otorgar privilegios en todas las tablas
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${APP_USER};
            
            -- Otorgar privilegios en todas las secuencias
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER};
            
            -- Otorgar privilegios para crear tablas
            GRANT CREATE ON SCHEMA public TO ${APP_USER};
        `);
        console.log('✅ Privilegios en esquema otorgados');

        // Ejecutar las migraciones directamente
        console.log('🔄 Ejecutando migraciones...');
        
        // Definir el orden de las migraciones
        const migrations = [
            '20240600000016_create_users_table.cjs',
            '20240600000017_create_groups_table.cjs',
            '20240600000018_create_messages_table.cjs'
        ];

        // Ejecutar cada migración en orden
        for (const migrationFile of migrations) {
            console.log(`📝 Ejecutando migración ${migrationFile}...`);
            const migrationPath = path.join(__dirname, '..', 'src', 'migrations', migrationFile);
            const migration = require(migrationPath);
            await migration.up(dbSequelize.getQueryInterface(), Sequelize);
            console.log(`✅ Migración ${migrationFile} completada`);
        }

        // Cerrar la conexión a la base de datos
        await dbSequelize.close();

        console.log('✨ Base de datos reseteada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al resetear la base de datos:', error);
        process.exit(1);
    }
}

resetDatabase(); 