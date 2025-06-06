import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// Crear objeto de configuración
const config = {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    dialect: 'postgres'
};

// Convertir a JSON y escribir en config.json
const configPath = path.join(process.cwd(), 'config', 'config.json');
const configContent = {
    development: config,
    test: config,
    production: config
};

fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));

// Ejecutar migraciones
const runMigrations = async () => {
    try {
        console.log('Ejecutando migraciones...');
        const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate');
        console.log(stdout);
        if (stderr) console.error(stderr);
    } catch (error) {
        console.error('Error al ejecutar migraciones:', error);
        process.exit(1);
    }
};

runMigrations(); 