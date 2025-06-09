import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Carga variables de entorno (por ejemplo, CHATWOOT_ACCESS_TOKEN, CHATWOOT_BASE_URL) desde .env o .env.local.
dotenv.config({ path: '.env.local' });

const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN;
const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com/api/v1';
const CHATWOOT_ACCOUNT_ID = 2;

// Función auxiliar para realizar peticiones a la API de Chatwoot.
async function chatwootRequest(endpoint, options = {}) {
  const url = `${CHATWOOT_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'api_access_token': CHATWOOT_ACCESS_TOKEN
  };
  const fetchOptions = { ...options, headers };
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chatwoot API error (${response.status}): ${errorText}`);
  }
  return await response.json();
}

// --- Funciones para interactuar con usuarios ---

/**
 * Lista todos los usuarios (agentes) de la cuenta de Chatwoot.
 * Endpoint: GET /api/v1/agents
 */
async function listUsers() {
  return await chatwootRequest('/agents');
}

/**
 * Crea un nuevo usuario (agente) en Chatwoot.
 * Endpoint: POST /api/v1/agents
 * @param {Object} userData – Datos del usuario (por ejemplo, { name, email, role: 'agent' }).
 */
async function createUser(userData) {
  return await chatwootRequest('/agents', { method: 'POST', body: JSON.stringify(userData) });
}

// --- Funciones para interactuar con conversaciones ---

/**
 * Lista todas las conversaciones (por defecto, conversaciones abiertas).
 * Endpoint: GET /api/v1/conversations
 * @param {Object} query – Parámetros de consulta (por ejemplo, { status: 'open' }).
 */
async function listConversations(query = {}) {
  const queryString = new URLSearchParams(query).toString();
  const endpoint = queryString ? `/conversations?${queryString}` : '/conversations';
  return await chatwootRequest(endpoint);
}

/**
 * Crea una nueva conversación en Chatwoot.
 * Endpoint: POST /api/v1/accounts/{account_id}/conversations
 * @param {Object} params - Parámetros de la conversación
 * @param {string} params.source_id - ID único del origen de la conversación
 * @param {number} params.contact_id - ID del contacto con el que se crea la conversación
 * @param {string} [params.message] - Contenido del mensaje inicial (opcional)
 * @returns {Promise<Object>} - La conversación creada con su ID y datos básicos
 */
async function createConversation({ source_id, contact_id, message }) {
    const inbox_id = 2;
    
    // Validar datos requeridos
    if (!source_id || !contact_id) {
        throw new Error('source_id y contact_id son requeridos para crear una conversación');
    }

    const payload = {
        source_id,
        inbox_id,
        contact_id,
        ...(message && { message: { content: message } })
    };

    return await chatwootRequest(`/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

// --- Funciones para interactuar con mensajes ---

/**
 * Envía un mensaje (texto) a una conversación de Chatwoot.
 * Endpoint: POST /api/v1/conversations/:conversationId/messages
 * @param {number} conversationId – El ID de la conversación.
 * @param {string} content – El texto del mensaje.
 */
async function sendMessage(conversationId, content) {
  const payload = { 
    content,
    message_type: 'incoming',
    sender_type: "contact",
    private: false,
    content_type: "text",
    };
    const url = `/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
    console.log('Sending message to Chatwoot:', {
        conversationId,
        content,
        payload,
        url
    });
  return await chatwootRequest(url, { method: 'POST', body: JSON.stringify(payload) });
}

/**
 * Lista todos los mensajes de una conversación.
 * Endpoint: GET /api/v1/conversations/:conversationId/messages
 * @param {number} conversationId – El ID de la conversación.
 */
async function listMessages(conversationId) {
  return await chatwootRequest(`/conversations/${conversationId}/messages`);
}

/**
 * Crea un nuevo contacto en Chatwoot.
 * Endpoint: POST /api/v1/accounts/{account_id}/contacts
 * @param {Object} contactData – Datos del contacto (por ejemplo, { name, email, inbox_id, ... }).
 * @returns {Promise<Object>} – El contacto creado.
 * @see https://developers.chatwoot.com/api-reference/contacts/create-contact
 */
async function createContact(contactData) {
    return await chatwootRequest(`/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, {
        method: 'POST',
        body: JSON.stringify(contactData)
    });
}

/**
 * Busca contactos por email en Chatwoot.
 * Endpoint: GET /api/v1/accounts/{account_id}/contacts/search?q={email}
 * @param {string} email – El email a buscar.
 * @returns {Promise<Object>} – Contactos encontrados (payload).
 * @see https://developers.chatwoot.com/api-reference/contacts/search-contacts
 */
async function searchContactByEmail(email) {
    const query = new URLSearchParams({ q: email }).toString();
    return await chatwootRequest(`/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?${query}`);
}

/**
 * Busca un contacto por email y lo crea si no existe. Devuelve el contacto y el source_id.
 * @param {string} name - Nombre del contacto
 * @param {string} email - Email del contacto
 * @param {string} phone_number - Teléfono del contacto
 * @param {string} identifier - Identificador único del contacto
 * @returns {Promise<{contact: Object, sourceId: string|null}>}
 */
async function createContactIfNotExists(name, email, phone_number, identifier) {
    const result = await searchContactByEmail(email);

    if (!result.payload.length) {
        const contactData = {
            name,
            email,
            inbox_id: 2,
            // phone_number,
            identifier,
        };
        const response = await createContact(contactData);
        const contact = response.payload.contact;
        const sourceId = response.payload.contact_inbox?.source_id || null;
        return { contact, sourceId };
    } else {
        const contact = result.payload[0];
        const sourceId = (contact.contact_inboxes && contact.contact_inboxes[0])
            ? contact.contact_inboxes[0].source_id
            : null;
        return { contact, sourceId };
    }
}

/**
 * Obtiene la conversación más reciente de un contacto específico.
 * Endpoint: GET /api/v1/accounts/{account_id}/contacts/{id}/conversations
 * @param {number|string} contactId - El ID del contacto
 * @returns {Promise<Object|null>} - La conversación más reciente del contacto o null si no hay conversaciones
 */
async function getContactConversation(contactId) {
    const response = await chatwootRequest(`/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contactId}/conversations`);
    
    if (!response.payload || !response.payload.length) {
        return null;
    }

    // Ordenar las conversaciones por updated_at de más reciente a más antigua
    const sortedConversations = response.payload.sort((a, b) => {
        return new Date(b.updated_at) - new Date(a.updated_at);
    });

    // Obtener la conversación más reciente
    const conversation = sortedConversations[0];

    // Si la conversación no está abierta, la abrimos
    if (conversation.status !== 'open') {
        await toggleConversationStatus(conversation.id, 'open');
    }

    return conversation;
}

/**
 * Cambia el estado de una conversación (open/closed).
 * Endpoint: POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/toggle_status
 * @param {number|string} conversationId - El ID de la conversación
 * @param {string} status - El nuevo estado ('open' o 'closed')
 * @returns {Promise<Object>} - Respuesta con el estado actual y el ID de la conversación
 */
async function toggleConversationStatus(conversationId, status) {
    const payload = { status };
    return await chatwootRequest(`/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/toggle_status`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export {
    listUsers,
    createUser,
    listConversations,
    createConversation,
    sendMessage,
    listMessages,
    createContact,
    searchContactByEmail,
    createContactIfNotExists,
    getContactConversation,
    toggleConversationStatus
}; 