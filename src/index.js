import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createClient } from 'node-zendesk';
import userRoutes from './routes/userRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de usuario
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/messages', messageRoutes);

// Configuración de la aplicación
const config = {
    PORT: process.env.PORT || 3000
};

// Configuración de Zendesk
const ZENDESK_CONFIG = {
    APP_ID: process.env.ZENDESK_APP_ID,
    APP_SECRET: process.env.ZENDESK_APP_SECRET,
    API_URL: 'https://api.smooch.io/v2',
    WEBHOOK_SECRET: process.env.ZENDESK_WEBHOOK_SECRET,
    SUNSHINE_APP_ID: process.env.SUNSHINE_APP_ID,
    // SUNSHINE_API_KEY: process.env.SUNSHINE_API_KEY,
    ZENDESK_EMAIL: process.env.ZENDESK_EMAIL,
    ZENDESK_TOKEN: process.env.ZENDESK_TOKEN,
    ZENDESK_SUBDOMAIN: process.env.ZENDESK_SUBDOMAIN
};

// Inicializar cliente de Zendesk
const zendeskClient = createClient({
    username: ZENDESK_CONFIG.ZENDESK_EMAIL,
    token: ZENDESK_CONFIG.ZENDESK_TOKEN,
    remoteUri: `https://${ZENDESK_CONFIG.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`
});

// Función para crear una conversación
const createConversation = async (externalId) => {
    const conversationResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
        },
        body: JSON.stringify({
            externalId: externalId,
            type: 'personal',
            participants: [{
                userExternalId: externalId
            }]
        })
    });

    if (!conversationResponse.ok) {
        const errorData = await conversationResponse.text();
        console.error('Error al crear conversación:', errorData);
        throw new Error(`Error al crear conversación: ${conversationResponse.status} - ${errorData}`);
    }

    const conversationData = await conversationResponse.json();
    console.log('Conversación creada:', conversationData);
    return conversationData;
};

// Función para buscar una conversación grupal existente con los mismos participantes
const findGroupConversation = async (externalIds) => {
    try {
        const participantsQuery = externalIds.map(id => `participants.userExternalId:${id}`).join(' ');
        const searchQuery = `type:group ${participantsQuery}`;
        const response = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations?filter[type]=group`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error al buscar conversaciones grupales:', errorData);
            return null;
        }
        const data = await response.json();
        // Buscar una conversación que tenga exactamente los mismos participantes
        const found = data.conversations && data.conversations.find(conv => {
            if (conv.type !== 'group') return false;
            const convIds = (conv.participants || []).map(p => p.userExternalId).sort();
            const idsSorted = [...externalIds].sort();
            return convIds.length === idsSorted.length && convIds.every((id, idx) => id === idsSorted[idx]);
        });
        if (found) {
            console.log('Conversación grupal existente encontrada:', found.id);
            return found;
        }
        return null;
    } catch (error) {
        console.error('Error en findGroupConversation:', error);
        return null;
    }
};

// Modificar createGroupConversation para reutilizar si ya existe
const createGroupConversation = async (externalIds) => {
    // Buscar primero si ya existe
    const existing = await findGroupConversation(externalIds);
    if (existing) {
        return { conversation: existing };
    }
    // Si no existe, crearla
    const conversationResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
        },
        body: JSON.stringify({
            type: 'sdkGroup',
            participants: externalIds.map(id => ({ userExternalId: id }))
        })
    });

    if (!conversationResponse.ok) {
        const errorData = await conversationResponse.text();
        console.error('Error al crear conversación grupal:', errorData);
        throw new Error(`Error al crear conversación grupal: ${conversationResponse.status} - ${errorData}`);
    }

    const conversationData = await conversationResponse.json();
    console.log('Conversación grupal creada:', conversationData);
    return conversationData;
};

// Función para enviar mensaje a Sunshine
const sendMessageToSunshine = async (conversationId, message, authorType = 'business', authorName = 'Agente') => {
    try {
        const response = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            },
            body: JSON.stringify({
                author: {
                    type: authorType,
                    displayName: authorName
                },
                content: {
                    type: 'text',
                    text: message
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error al enviar mensaje a Sunshine:', errorData);
            throw new Error(`Error al enviar mensaje: ${response.status} - ${errorData}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en sendMessageToSunshine:', error);
        throw error;
    }
};

// Función para buscar un ticket existente por conversación
const findTicketByConversation = async (conversationId) => {
    try {
        // Primero intentamos buscar por el tag específico
        const tagSearchQuery = `conversation_${conversationId}`;
        console.log('Buscando ticket por tag:', tagSearchQuery);

        // Intentamos primero con la API de búsqueda
        try {
            const searchResponse = await zendeskClient.search.query(tagSearchQuery);
            console.log('Respuesta de búsqueda completa:', JSON.stringify(searchResponse, null, 2));

            if (searchResponse.results && searchResponse.results.length > 0) {
                const ticket = searchResponse.results[0];
                console.log('Ticket encontrado por búsqueda:', {
                    id: ticket.id,
                    subject: ticket.subject,
                    tags: ticket.tags,
                    status: ticket.status
                });
                return ticket;
            }
        } catch (searchError) {
            console.error('Error en búsqueda por API:', searchError);
        }

        // Si la búsqueda falla, intentamos obtener todos los tickets y filtrar
        console.log('Intentando búsqueda alternativa...');
        try {
            const ticketsResponse = await zendeskClient.tickets.list();
            console.log('Total de tickets encontrados:', ticketsResponse.length);

            const matchingTicket = ticketsResponse.find(ticket =>
                ticket.tags &&
                ticket.tags.includes(`conversation_${conversationId}`) &&
                ['open', 'pending', 'new'].includes(ticket.status)
            );

            if (matchingTicket) {
                console.log('Ticket encontrado por listado:', {
                    id: matchingTicket.id,
                    subject: matchingTicket.subject,
                    tags: matchingTicket.tags,
                    status: matchingTicket.status
                });
                return matchingTicket;
            }
        } catch (listError) {
            console.error('Error en listado de tickets:', listError);
        }

        console.log('No se encontró ticket existente para la conversación:', conversationId);
        return null;
    } catch (error) {
        console.error('Error al buscar ticket existente:', error);
        throw error;
    }
};

// Buscar usuario en Zendesk por email
const findZendeskUserByEmail = async (email) => {
    try {
        const users = await zendeskClient.users.search({ query: email });
        if (users && users.length > 0) {
            return users[0];
        }
        return null;
    } catch (error) {
        console.error('Error buscando usuario en Zendesk:', error);
        return null;
    }
};

// Crear usuario en Zendesk
const createZendeskUser = async (user) => {
    try {
        const newUser = await zendeskClient.users.create({
            user: {
                name: `${user.givenName} ${user.surname}`,
                email: user.email,
                role: 'end-user'
            }
        });
        return newUser;
    } catch (error) {
        console.error('Error creando usuario en Zendesk:', error);
        return null;
    }
};

// Función para crear o actualizar un ticket en Zendesk
const createOrUpdateZendeskTicket = async (user, conversationId, message, isAgentMessage = false) => {
    try {
        // Buscar ticket existente
        const existingTicket = await findTicketByConversation(conversationId);

        // Si el mensaje es del usuario, buscamos o creamos el usuario en Zendesk
        let authorId = undefined;
        if (!isAgentMessage) {
            let zendeskUser = await findZendeskUserByEmail(user.email);
            if (!zendeskUser) {
                zendeskUser = await createZendeskUser(user);
            }
            if (zendeskUser && zendeskUser.id) {
                authorId = zendeskUser.id;
            }
        }

        if (existingTicket) {
            console.log('Ticket existente encontrado, actualizando...', {
                ticketId: existingTicket.id,
                status: existingTicket.status,
                tags: existingTicket.tags,
                isAgentMessage,
                authorId
            });

            // Formatear el mensaje según el tipo de usuario
            const formattedMessage = isAgentMessage
                ? `[Agente - ${new Date().toLocaleString()}] ${message}`
                : message;

            // Actualizar ticket existente
            const updateData = {
                ticket: {
                    comment: {
                        body: formattedMessage,
                        public: true,
                        ...(authorId ? { author_id: authorId } : {})
                    },
                    status: 'pending'
                }
            };

            const response = await zendeskClient.tickets.update(existingTicket.id, updateData);
            console.log('Ticket actualizado exitosamente:', {
                id: response.id,
                status: response.status,
                updated_at: response.updated_at,
                messageType: isAgentMessage ? 'agent' : 'user',
                authorId
            });
            return response;
        } else {
            console.log('No se encontró ticket existente, creando nuevo...');
            // Crear nuevo ticket
            const formattedMessage = message;

            const ticket = {
                ticket: {
                    subject: `Chat con ${user.givenName} ${user.surname}`,
                    comment: {
                        body: formattedMessage,
                        public: true,
                        ...(authorId ? { author_id: authorId } : {})
                    },
                    requester: {
                        name: `${user.givenName} ${user.surname}`,
                        email: user.email
                    },
                    priority: 'normal',
                    status: 'new',
                    tags: ['chat', 'sunshine', `conversation_${conversationId}`],
                    custom_fields: [
                        {
                            id: 20266554771484,
                            value: conversationId
                        }
                    ]
                }
            };

            console.log('Creando nuevo ticket con datos:', {
                conversationId,
                user: `${user.givenName} ${user.surname}`,
                tags: ticket.ticket.tags,
                messageType: 'user',
                authorId
            });

            const response = await zendeskClient.tickets.create(ticket);
            console.log('Ticket creado exitosamente:', {
                id: response.id,
                status: response.status,
                created_at: response.created_at,
                authorId
            });
            return response;
        }
    } catch (error) {
        console.error('Error al crear/actualizar ticket en Zendesk:', error);
        throw error;
    }
};

// Función para obtener mensajes de una conversación
const getConversationMessages = async (conversationId) => {
    try {
        const response = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations/${conversationId}/messages`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error al obtener mensajes:', errorData);
            throw new Error(`Error al obtener mensajes: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        return data.messages.map(msg => ({
            id: msg.id,
            text: msg.content.text,
            sender: msg.author.type === 'user' ? 'user' : 'agent',
            timestamp: msg.received
        }));
    } catch (error) {
        console.error('Error en getConversationMessages:', error);
        throw error;
    }
};

// Función para obtener la conversación de un usuario
const getUserConversation = async (externalId) => {
    try {
        // Primero obtenemos el usuario para conseguir su ID
        const userResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/users/${externalId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });

        if (!userResponse.ok) {
            console.log('Usuario no encontrado:', externalId);
            return null;
        }

        const userData = await userResponse.json();
        const userId = userData.user.id;

        // Ahora buscamos las conversaciones usando el userId
        const response = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations?filter[userId]=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log('No se encontró conversación para el usuario:', externalId);
                return null;
            }
            console.error('Error al obtener conversación:', response.status);
            throw new Error(`Error al obtener conversación: ${response.status}`);
        }

        const data = await response.json();
        if (data.conversations && data.conversations.length > 0) {
            console.log('Conversación existente encontrada:', data.conversations[0].id);
            return data.conversations[0];
        }

        console.log('No se encontró conversación para el usuario:', externalId);
        return null;
    } catch (error) {
        console.error('Error al buscar conversación:', error);
        throw error;
    }
};

// Función para buscar usuario en Sunshine por externalId
const findSunshineUserByExternalId = async (externalId) => {
    try {
        const response = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/users/${externalId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.user;
    } catch (error) {
        return null;
    }
};

// Endpoint para crear usuario en Sunshine
app.post('/api/v1/zendesk/users', async (req, res) => {
    try {
        const { givenName, surname, email, phone, properties, externalId, groupExternalIds } = req.body;

        if (!givenName || !surname || !email) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                message: 'Se requiere givenName, surname y email'
            });
        }

        console.log('Creando usuario en Sunshine...');

        // Buscar usuario antes de crearlo
        let userData = await findSunshineUserByExternalId(externalId);
        if (!userData) {
            const createUserResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
                },
                body: JSON.stringify({
                    externalId: externalId || `user_${Date.now()}`,
                    givenName,
                    surname,
                    email,
                    phone: phone || '',
                    properties: {
                        ...properties,
                        lastLogin: new Date().toISOString(),
                        platform: 'web'
                    }
                })
            });
            console.log('Status de creación de usuario:', createUserResponse.status);
            const userDataResp = await createUserResponse.json();
            console.log('Respuesta de creación de usuario:', userDataResp);
            if (!userDataResp.user || !userDataResp.user.id) {
                throw new Error(`Error en la respuesta de Sunshine: ${JSON.stringify(userDataResp)}`);
            }
            userData = userDataResp.user;
        } else {
            console.log('Usuario ya existe en Sunshine:', userData.id);
        }

        // Si se pasan varios externalIds, crear conversación grupal
        let conversationData;
        if (Array.isArray(groupExternalIds) && groupExternalIds.length > 1) {
            conversationData = await createGroupConversation(groupExternalIds);
        } else {
            // Conversación individual (personal)
            conversationData = await createConversation(userData.id);
        }
        console.log('Conversación inicial creada:', conversationData);

        res.json({
            status: 'success',
            message: 'Usuario creado correctamente',
            user: userData,
            conversation: conversationData.conversation
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Error al crear usuario',
            details: error.message
        });
    }
});

// Endpoint para enviar mensaje a un usuario
app.post('/api/v1/zendesk/messages', async (req, res) => {
    try {
        const { message, externalId, user, isAgentMessage = false } = req.body;

        console.log('Recibiendo solicitud de mensaje:', {
            message,
            externalId,
            user
        });

        if (!message || !externalId || !user) {
            console.error('Faltan campos requeridos:', { message, externalId, user });
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                message: 'Se requiere message, externalId y user'
            });
        }

        // Primero verificamos si el usuario existe
        let userResponse;
        try {
            console.log('Verificando usuario existente:', externalId);
            userResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/users/${externalId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
                }
            });
            console.log('Respuesta de verificación de usuario:', userResponse.status);
        } catch (error) {
            console.error('Error al verificar usuario:', error);
        }

        // Si el usuario no existe, lo creamos
        if (!userResponse || !userResponse.ok) {
            console.log('Usuario no encontrado, creando nuevo usuario...');
            const createUserResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
                },
                body: JSON.stringify({
                    externalId: externalId,
                    givenName: user.givenName,
                    surname: user.surname,
                    email: user.email,
                    phone: user.phone || '',
                    properties: {
                        ...user.properties,
                        lastLogin: new Date().toISOString(),
                        platform: 'mobile'
                    }
                })
            });

            if (!createUserResponse.ok) {
                const errorData = await createUserResponse.text();
                console.error('Error al crear usuario:', errorData);
                throw new Error(`Error al crear usuario: ${createUserResponse.status} - ${errorData}`);
            }

            userResponse = createUserResponse;
            console.log('Usuario creado exitosamente');
        }

        // Buscamos la conversación existente del usuario
        let conversation = await getUserConversation(externalId);
        let conversationId;

        if (!conversation) {
            // Si no existe conversación, creamos una nueva
            console.log('Creando nueva conversación para usuario:', externalId);
            const conversationData = await createConversation(externalId);
            conversationId = conversationData.conversation.id;
        } else {
            conversationId = conversation.id;
        }

        // Enviar mensaje a Sunshine
        console.log('Enviando mensaje a Sunshine:', {
            conversationId,
            message,
            user: `${user.givenName} ${user.surname}`
        });

        const response = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            },
            body: JSON.stringify({
                author: {
                    type: 'user',
                    userExternalId: externalId,
                    displayName: `${user.givenName} ${user.surname}`
                },
                content: {
                    type: 'text',
                    text: message
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error de Sunshine:', errorData);
            throw new Error(`Error al enviar mensaje: ${response.status} - ${errorData}`);
        }

        const responseData = await response.json();
        console.log('Mensaje enviado exitosamente:', responseData);

        // Crear ticket en Zendesk
        const zendeskTicket = await createOrUpdateZendeskTicket(user, conversationId, message, isAgentMessage);
        console.log('Ticket de Zendesk procesado:', zendeskTicket.id);

        // Obtener los mensajes actualizados de la conversación
        const messages = await getConversationMessages(conversationId);

        res.json({
            status: 'success',
            message: 'Mensaje enviado correctamente',
            data: {
                conversationId: conversationId,
                messageId: responseData.messages[0].id,
                timestamp: responseData.messages[0].received,
                content: responseData.messages[0].content,
                zendeskTicketId: zendeskTicket.id,
                messages: messages
            }
        });
    } catch (error) {
        console.error('Error en el proceso de envío de mensaje:', error);
        res.status(500).json({
            error: 'Error al enviar mensaje',
            details: error.message
        });
    }
});

// Endpoint traerte un usuario por id
app.get('/api/v1/zendesk/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        console.log('Obteniendo usuarios de Sunshine...');

        const response = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/users/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error de Sunshine:', errorData);
            throw new Error(`Error al obtener usuarios: ${response.status} - ${errorData}`);
        }

        const users = await response.json();
        console.log('Usuarios encontrados:', users);

        res.json({
            status: 'success',
            users: users
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Error al obtener usuarios',
            details: error.message
        });
    }
});

// Endpoint para recibir actualizaciones de tickets de Zendesk
app.post('/api/v1/zendesk/webhook', async (req, res) => {
    try {
        console.log('Webhook recibido de Zendesk:', JSON.stringify(req.body, null, 2));

        if (!req.body) {
            console.error('No hay datos en el webhook');
            return res.status(400).json({ error: 'No hay datos en el webhook' });
        }

        // Verificar el tipo de evento
        switch (req.body.type) {
            case 'zen:event-type:ticket.comment_added':
                const ticket = req.body.detail;
                const comment = req.body.event.comment;

                if (!ticket || !comment) {
                    console.error('Datos incompletos en el webhook:', { ticket, comment });
                    return res.status(400).json({ error: 'Datos incompletos' });
                }

                console.log('Detalles del comentario:', {
                    author: comment.author,
                    isPublic: comment.is_public,
                    body: comment.body,
                    type: req.body.type
                });

                // Buscar el ID de conversación en los tags
                const conversationId = ticket.tags.find(tag => tag.startsWith('conversation_'))?.split('_')[1];

                if (!conversationId) {
                    console.error('No se encontró ID de conversación en los tags del ticket:', ticket.tags);
                    return res.status(400).json({ error: 'No se encontró conversación asociada' });
                }

                // Ignorar comentarios privados del sistema
                if (!comment.is_public && comment.author.name === 'System') {
                    console.log('Ignorando comentario privado del sistema');
                    return res.status(200).json({ status: 'ignored', message: 'Comentario privado del sistema' });
                }

                // Solo procesamos comentarios públicos
                if (!comment.is_public) {
                    console.log('Ignorando comentario privado');
                    return res.status(200).json({ status: 'ignored', message: 'Comentario privado' });
                }

                try {
                    // Cuando es un mensaje del agente, pasamos isAgentMessage como true
                    await sendMessageToSunshine(conversationId, comment.body, 'business', comment.author.name);
                    console.log('Mensaje de agente enviado exitosamente a Sunshine');

                    // Actualizar el ticket con el mensaje del agente
                    await createOrUpdateZendeskTicket(
                        { givenName: comment.author.name, surname: '', email: comment.author.email },
                        conversationId,
                        comment.body,
                        true // Indicamos que es un mensaje del agente
                    );

                    res.json({
                        status: 'success',
                        message: 'Mensaje procesado correctamente',
                        data: {
                            ticketId: ticket.id,
                            conversationId,
                            commentId: comment.id
                        }
                    });
                } catch (error) {
                    console.error('Error al enviar mensaje a Sunshine:', error);
                    res.status(500).json({
                        error: 'Error al enviar mensaje a Sunshine',
                        details: error.message
                    });
                }
                break;

            case 'zen:event-type:ticket.created':
                console.log('Nuevo ticket creado:', req.body.detail.id);
                res.json({ status: 'success', message: 'Ticket creado recibido' });
                break;

            case 'zen:event-type:ticket.updated':
                console.log('Ticket actualizado:', req.body.detail.id);
                res.json({ status: 'success', message: 'Actualización de ticket recibida' });
                break;

            default:
                console.log('Evento no manejado:', req.body.type);
                res.json({
                    status: 'ignored',
                    message: 'Evento no manejado',
                    event: req.body.type
                });
        }
    } catch (error) {
        console.error('Error en webhook de Zendesk:', error);
        res.status(500).json({
            error: 'Error al procesar webhook',
            details: error.message
        });
    }
});

// Endpoint para obtener mensajes de una conversación
app.get('/api/v1/zendesk/conversations/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;
        console.log('Obteniendo mensajes para conversación:', conversationId);

        // Primero intentamos obtener la conversación
        const conversationResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations/${conversationId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });

        if (!conversationResponse.ok) {
            console.log('Conversación no encontrada:', conversationId);
            return res.json({ messages: [] });
        }

        console.log('Conversación encontrada, obteniendo mensajes...');
        const messages = await getConversationMessages(conversationId);
        console.log('Mensajes obtenidos:', messages.length);

        res.json({
            messages,
            conversationId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.json({
            messages: [],
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener las conversaciones de un usuario
app.get('/api/v1/zendesk/users/:externalId/conversations', async (req, res) => {
    try {
        const { externalId } = req.params;
        console.log('Obteniendo conversaciones para usuario:', externalId);

        const conversation = await getUserConversation(externalId);
        console.log('Conversación encontrada:', conversation ? 'Sí' : 'No');

        if (!conversation) {
            // Si no hay conversación, devolvemos un array vacío
            res.json({
                conversations: []
            });
            return;
        }

        // Obtenemos los mensajes de la conversación
        try {
            const messagesResponse = await fetch(
                `${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations/${conversation.id}/messages`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
                    }
                }
            );

            if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json();
                const messages = messagesData.messages || [];
                console.log('Mensajes obtenidos:', messages.length);

                res.json({
                    conversations: [{
                        id: conversation.id,
                        lastMessage: messages.length > 0 ? {
                            text: messages[messages.length - 1].content.text,
                            timestamp: messages[messages.length - 1].received
                        } : null,
                        participants: [
                            {
                                id: externalId,
                                type: 'user',
                                displayName: 'Usuario'
                            },
                            {
                                id: 'business',
                                type: 'business',
                                displayName: 'VIVLA'
                            }
                        ],
                        updatedAt: messages.length > 0 ? messages[messages.length - 1].received : conversation.updatedAt || new Date().toISOString()
                    }]
                });
                return;
            }
        } catch (error) {
            console.error('Error al obtener mensajes de la conversación:', error);
        }

        // Si no podemos obtener los mensajes, devolvemos la conversación sin mensajes
        res.json({
            conversations: [{
                id: conversation.id,
                lastMessage: null,
                participants: [
                    {
                        id: externalId,
                        type: 'user',
                        displayName: 'Usuario'
                    },
                    {
                        id: 'business',
                        type: 'business',
                        displayName: 'VIVLA'
                    }
                ],
                updatedAt: conversation.updatedAt || new Date().toISOString()
            }]
        });
    } catch (error) {
        console.error('Error al obtener conversaciones:', error);
        res.status(500).json({
            error: 'Error al obtener conversaciones',
            details: error.message
        });
    }
});

// Endpoint para añadir un participante a una conversación existente
app.post('/api/v1/zendesk/conversations/:conversationId/participants', async (req, res) => {
    const { conversationId } = req.params;
    const { userExternalId } = req.body;
    if (!userExternalId) {
        return res.status(400).json({ error: 'userExternalId es requerido' });
    }
    try {
        const response = await fetch(
            `${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations/${conversationId}/participants`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
                },
                body: JSON.stringify({ userExternalId })
            }
        );
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error al añadir participante:', errorData);
            return res.status(response.status).json({ error: errorData });
        }
        const data = await response.json();
        res.json({ status: 'success', participant: data });
    } catch (error) {
        console.error('Error en añadir participante:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para crear una conversación sdkGroup desde cero
app.post('/api/v1/zendesk/conversations/group', async (req, res) => {
    const { groupExternalIds } = req.body;
    if (!Array.isArray(groupExternalIds) || groupExternalIds.length < 2) {
        return res.status(400).json({ error: 'Debes proporcionar al menos dos externalIds en groupExternalIds' });
    }
    try {
        const conversationData = await createGroupConversation(groupExternalIds);
        res.json({ status: 'success', conversation: conversationData.conversation });
    } catch (error) {
        console.error('Error al crear conversación sdkGroup:', error);
        res.status(500).json({ error: error.message });
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '¡Algo salió mal!' });
});

// Iniciar el servidor
app.listen(config.PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${config.PORT}`);
});