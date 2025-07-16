/**
 * Servicio para análisis y generación de tags basados en contenido de mensajes
 */

// Tags disponibles
const AVAILABLE_TAGS = ['General', 'Estancias', 'Planes', 'Incidencias'];

// Palabras clave por tag (en español e inglés, singular y plural)
const KEYWORDS_BY_TAG = {
    'Estancias': [
        // Español
        'estancia', 'estancias', 'alojamiento', 'alojamientos', 'reserva', 'reservas',
        'habitación', 'habitaciones', 'check-in', 'check-out', 'checkin', 'checkout',
        'hospedaje', 'hospedajes', 'casa', 'casas', 'apartamento', 'apartamentos',
        'piso', 'pisos', 'vivienda', 'viviendas', 'alquiler', 'alquileres',
        // Inglés
        'stay', 'stays', 'accommodation', 'accommodations', 'booking', 'bookings',
        'room', 'rooms', 'house', 'houses', 'apartment', 'apartments', 'rental', 'rentals',
        'lodging', 'lodgings', 'reservation', 'reservations'
    ],
    'Planes': [
        // Español
        'plan', 'planes', 'actividad', 'actividades', 'excursión', 'excursiones',
        'tour', 'tours', 'visita', 'visitas', 'evento', 'eventos', 'experiencia',
        'experiencias', 'actividad', 'actividades', 'diversión', 'entretenimiento',
        'ocio', 'recreación', 'recreo', 'pasatiempo', 'pasatiempos',
        // Inglés
        'plan', 'plans', 'activity', 'activities', 'tour', 'tours', 'visit', 'visits',
        'event', 'events', 'experience', 'experiences', 'entertainment', 'recreation',
        'leisure', 'hobby', 'hobbies', 'fun', 'amusement'
    ],
    'Incidencias': [
        // Español
        'incidencia', 'incidencias', 'problema', 'problemas', 'avería', 'averías',
        'reparación', 'reparaciones', 'mantenimiento', 'mantenimientos', 'urgencia',
        'urgencias', 'fallo', 'fallos', 'error', 'errores', 'defecto', 'defectos',
        'mal funcionamiento', 'disfunción', 'disfunciones', 'técnico', 'técnicos',
        'servicio técnico', 'asistencia técnica', 'soporte', 'soporte técnico',
        // Inglés
        'incident', 'incidents', 'problem', 'problems', 'issue', 'issues',
        'breakdown', 'breakdowns', 'repair', 'repairs', 'maintenance',
        'emergency', 'emergencies', 'failure', 'failures', 'error', 'errors',
        'defect', 'defects', 'malfunction', 'malfunctions', 'technical', 'technician',
        'support', 'troubleshooting', 'fix', 'fixes'
    ]
};

// Caché para keywords normalizadas (optimización de performance)
let normalizedKeywordsCache = null;

// Función para obtener keywords normalizadas (con caché)
function getNormalizedKeywords() {
    if (normalizedKeywordsCache) {
        return normalizedKeywordsCache;
    }
    
    const normalized = {};
    for (const [tag, keywords] of Object.entries(KEYWORDS_BY_TAG)) {
        normalized[tag] = new Set(keywords.map(keyword => normalizeText(keyword)));
    }
    
    normalizedKeywordsCache = normalized;
    return normalized;
}

// Función para normalizar texto (quitar acentos, convertir a minúsculas)
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
}

// Función para extraer palabras del texto
function extractWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0);
}

/**
 * Analiza el contenido de un mensaje y devuelve tags relevantes (OPTIMIZADO)
 * @param {string} text - Texto del mensaje a analizar
 * @param {number} maxTags - Número máximo de tags a devolver (por defecto 3)
 * @returns {Promise<string[]>} Array de tags relevantes
 */
export async function analyzeMessageAndGetTags(text, maxTags = 3) {
    try {
        if (!text || typeof text !== 'string') {
            console.warn('TagService: Texto inválido proporcionado');
            return ['General']; // Tag por defecto
        }

        const normalizedText = normalizeText(text);
        const words = new Set(extractWords(normalizedText)); // Usar Set para búsquedas O(1)
        const normalizedKeywords = getNormalizedKeywords(); // Usar caché
        
        console.log(`🔍 Analizando texto para tags: "${text.substring(0, 50)}..."`);
        console.log(`📝 Palabras extraídas: [${Array.from(words).join(', ')}]`);
        
        const matchedTags = [];
        
        // Analizar cada tag usando Sets para búsquedas O(1)
        for (const [tag, keywordSet] of Object.entries(normalizedKeywords)) {
            // Verificar si alguna palabra del texto coincide con las palabras clave del tag
            for (const word of words) {
                if (keywordSet.has(word)) {
                    matchedTags.push(tag);
                    console.log(`✅ Tag "${tag}" asignado por palabra clave: "${word}"`);
                    break; // Una coincidencia es suficiente para asignar el tag
                }
            }
        }
        
        // Si no se encontraron tags específicos, asignar "General"
        if (matchedTags.length === 0) {
            matchedTags.push('General');
            console.log(`🏷️ Tag "General" asignado por defecto`);
        }
        
        // Limitar el número de tags según maxTags
        const finalTags = matchedTags.slice(0, maxTags);
        
        console.log(`🏷️ Tags finales: [${finalTags.join(', ')}]`);
        
        return finalTags;
        
    } catch (error) {
        console.error('Error en analyzeMessageAndGetTags:', error);
        return ['General']; // Tag por defecto en caso de error
    }
}

/**
 * Obtiene todos los tags disponibles
 * @returns {string[]} Array con todos los tags disponibles
 */
export function getAllAvailableTags() {
    return AVAILABLE_TAGS;
}

/**
 * Valida si un tag es válido
 * @param {string} tag - Tag a validar
 * @returns {boolean} True si el tag es válido
 */
export function isValidTag(tag) {
    return AVAILABLE_TAGS.includes(tag);
}

/**
 * Obtiene palabras clave por tag
 * @param {string} tag - Tag del cual obtener palabras clave
 * @returns {string[]} Array de palabras clave del tag
 */
export function getKeywordsByTag(tag) {
    return KEYWORDS_BY_TAG[tag] || [];
}

/**
 * Obtiene todos los tags con sus palabras clave
 * @returns {Object} Objeto con tags y sus palabras clave
 */
export function getTagsWithKeywords() {
    return KEYWORDS_BY_TAG;
}

/**
 * Limpia el caché de keywords normalizadas
 * Útil si se modifican las keywords en tiempo de ejecución
 */
export function clearKeywordsCache() {
    normalizedKeywordsCache = null;
    console.log('🗑️ Caché de keywords limpiado');
}

/**
 * Obtiene estadísticas de performance del servicio
 * @returns {Object} Estadísticas de uso
 */
export function getPerformanceStats() {
    return {
        cacheInitialized: normalizedKeywordsCache !== null,
        totalKeywords: Object.values(KEYWORDS_BY_TAG).reduce((sum, keywords) => sum + keywords.length, 0),
        availableTags: AVAILABLE_TAGS.length
    };
} 