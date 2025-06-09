import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST || 'localhost';

async function resetDatabase() {
    try {
        // Crear una conexión temporal sin base de datos
        const sequelize = new Sequelize('postgres', DB_USER, DB_PASSWORD, {
            host: DB_HOST,
            dialect: 'postgres',
            logging: false
        });

        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa');

        // Eliminar la base de datos si existe
        console.log(`🗑️  Eliminando base de datos ${DB_NAME} si existe...`);
        await sequelize.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);`);
        console.log('✅ Base de datos eliminada');

        // Crear una nueva base de datos
        console.log(`📦 Creando nueva base de datos ${DB_NAME}...`);
        await sequelize.query(`CREATE DATABASE ${DB_NAME};`);
        console.log('✅ Base de datos creada');

        // Cerrar la conexión temporal
        await sequelize.close();

        // Ejecutar las migraciones
        console.log('🔄 Ejecutando migraciones...');
        const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate');
        if (stderr) console.error('⚠️  Advertencias durante la migración:', stderr);
        console.log('✅ Migraciones completadas');

        console.log('✨ Base de datos reseteada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al resetear la base de datos:', error);
        process.exit(1);
    }
}

resetDatabase(); 