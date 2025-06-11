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
    let sequelize;

    try {
        // En producción, usar DATABASE_PUBLIC_URL
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.DATABASE_PUBLIC_URL) {
                throw new Error('DATABASE_PUBLIC_URL no está definida en producción');
            }
            sequelize = new Sequelize(process.env.DATABASE_PUBLIC_URL, {
                dialect: 'postgres',
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                },
                logging: console.log
            });
        } else {
            // En desarrollo, usar las variables individuales
            sequelize = new Sequelize({
                host: process.env.POSTGRES_HOST,
                port: process.env.POSTGRES_PORT || 5432,
                database: process.env.POSTGRES_DB,
                username: process.env.POSTGRES_USER,
                password: process.env.POSTGRES_PASSWORD,
                dialect: 'postgres',
                logging: console.log
            });
        }

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
        if (sequelize) {
            await sequelize.close();
        }
    }
}

// Ejecutar la función
dropAllTables(); 