import fetch from 'node-fetch';

/**
 * Configuración del servicio de deals
 */
const DEAL_SERVICE_CONFIG = {
    BASE_URL: 'https://api.vivla.com/v1',
    API_TOKEN: process.env.VIVLA_API_TOKEN || 'Od9epkgd9jOjg2AajMqWKilgEO8fdMuU2K3zDovfCgzUUrIbEuw35DOkh5LocvP0'
};

/**
 * Obtener los deals de un usuario por su email
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} - Respuesta con los deals del usuario
 */
export const getUserDeals = async (email) => {
    try {
        // Validar que el email sea proporcionado
        if (!email || typeof email !== 'string' || email.trim() === '') {
            throw new Error('El email es requerido y debe ser una cadena válida');
        }

        // Limpiar y validar formato básico del email
        const cleanEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            throw new Error('Formato de email inválido');
        }

        // Construir la URL de la API
        const url = `${DEAL_SERVICE_CONFIG.BASE_URL}/users/deals/${encodeURIComponent(cleanEmail)}`;

        // Realizar la llamada a la API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${DEAL_SERVICE_CONFIG.API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000 // Timeout de 10 segundos
        });

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error en la API de deals (${response.status}):`, errorText);
            
            if (response.status === 404) {
                throw new Error(`No se encontró un usuario con el email: ${cleanEmail}`);
            } else if (response.status === 401) {
                throw new Error('Token de autorización inválido o expirado');
            } else if (response.status === 403) {
                throw new Error('No tienes permisos para acceder a esta información');
            } else {
                throw new Error(`Error en la API de deals: ${response.status} - ${errorText}`);
            }
        }

        // Parsear la respuesta JSON
        const data = await response.json();

        // Validar la estructura de la respuesta
        if (!data || typeof data !== 'object') {
            throw new Error('Respuesta inválida de la API de deals');
        }

        // Si hay un error en la respuesta de la API
        if (data.status === 'error') {
            throw new Error(data.message || 'Error desconocido en la API de deals');
        }

        // Si la respuesta es exitosa, validar que tenga la estructura esperada
        if (data.status === 'success') {
            // Validar que tenga los campos esperados
            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Respuesta de la API con formato inválido: falta el array de deals');
            }

            if (!data.user || typeof data.user !== 'object') {
                throw new Error('Respuesta de la API con formato inválido: falta información del usuario');
            }

            // Validar que el count sea consistente
            if (typeof data.count !== 'number' || data.count !== data.data.length) {
                console.warn('Advertencia: El count en la respuesta no coincide con el número de deals');
            }

            return {
                success: true,
                message: data.message,
                deals: data.data,
                count: data.count,
                user: data.user
            };
        }

        // Si no es ni success ni error, es una respuesta inesperada
        throw new Error('Respuesta inesperada de la API de deals');

    } catch (error) {
        console.error('Error en getUserDeals:', error);
        
        // Si es un error de red o timeout
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Error de conexión con la API de deals. Verifica tu conexión a internet.');
        }
        
        if (error.name === 'AbortError') {
            throw new Error('Timeout al conectar con la API de deals');
        }

        // Re-lanzar el error con el mensaje apropiado
        throw error;
    }
};

/**
 * Validar si un usuario tiene deals
 * @param {string} email - Email del usuario
 * @returns {Promise<boolean>} - true si tiene deals, false si no
 */
export const hasUserDeals = async (email) => {
    try {
        const result = await getUserDeals(email);
        return result.success && result.count > 0;
    } catch (error) {
        // Si el error es que no se encontró el usuario, significa que no tiene deals
        if (error.message.includes('No se encontró un usuario')) {
            return false;
        }
        // Para otros errores, re-lanzar
        throw error;
    }
};

/**
 * Obtener solo el número de deals de un usuario
 * @param {string} email - Email del usuario
 * @returns {Promise<number>} - Número de deals del usuario
 */
export const getUserDealsCount = async (email) => {
    try {
        const result = await getUserDeals(email);
        return result.success ? result.count : 0;
    } catch (error) {
        // Si el error es que no se encontró el usuario, retornar 0
        if (error.message.includes('No se encontró un usuario')) {
            return 0;
        }
        // Para otros errores, re-lanzar
        throw error;
    }
};

/**
 * Obtener información básica de los deals (solo id, house_name y date)
 * @param {string} email - Email del usuario
 * @returns {Promise<Array>} - Array con información básica de los deals
 */
export const getUserDealsBasic = async (email) => {
    try {
        const result = await getUserDeals(email);
        
        if (!result.success) {
            return [];
        }

        // Mapear solo la información básica
        return result.deals.map(deal => ({
            id: deal.id,
            house_name: deal.house_name,
            date: deal.date,
            fractions: deal.fractions
        }));
    } catch (error) {
        // Si el error es que no se encontró el usuario, retornar array vacío
        if (error.message.includes('No se encontró un usuario')) {
            return [];
        }
        // Para otros errores, re-lanzar
        throw error;
    }
}; 