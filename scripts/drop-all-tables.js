import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dropAllTables() {
    // Crear conexión usando las variables de entorno
    const sequelize = new Sequelize({
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        dialect: 'postgres',
        logging: console.log
    });

    try {
        // Conectar a la base de datos
        await sequelize.authenticate();
        console.log('Conexión a PostgreSQL establecida correctamente.');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'drop-all-tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar el SQL
        console.log('Ejecutando script de borrado de tablas...');
        await sequelize.query(sql);
        console.log('Todas las tablas han sido borradas correctamente.');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Ejecutar la función
dropAllTables(); 