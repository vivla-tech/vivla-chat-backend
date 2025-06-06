import database from './database.js';
import firebase from './firebase.js';

export {
    database,
    firebase
};

// Configuración general de la aplicación
export const appConfig = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    // Otras configuraciones globales aquí
}; 