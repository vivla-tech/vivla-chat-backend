import { sequelize } from '../models/index.js';

const syncDatabase = async () => {
    try {
        // force: true eliminará las tablas existentes y las recreará
        // En producción, deberías usar { alter: true } o simplemente sincronizar sin opciones
        await sequelize.sync({ force: true });
        console.log('Base de datos sincronizada correctamente.');
    } catch (error) {
        console.error('Error al sincronizar la base de datos:', error);
    } finally {
        process.exit();
    }
};

// Ejecutar la sincronización
syncDatabase(); 