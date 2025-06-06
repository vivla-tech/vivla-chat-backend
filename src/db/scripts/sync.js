import { sequelize } from '../models/index.js';
import { fileURLToPath } from 'url';

/**
 * Sincroniza la base de datos con los modelos
 * @param {boolean} force - Si es true, recrea las tablas
 */
const syncDatabase = async (force = false) => {
    try {
        console.log(`Iniciando sincronización de la base de datos${force ? ' (forzada)' : ''}...`);
        await sequelize.sync({ force });
        console.log('✅ Base de datos sincronizada correctamente');
    } catch (error) {
        console.error('❌ Error al sincronizar la base de datos:', error);
    } finally {
        process.exit();
    }
};

// Si se ejecuta directamente y se pasa --force como argumento
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const forceSync = process.argv.includes('--force');
    syncDatabase(forceSync);
}

export default syncDatabase; 