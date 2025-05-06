import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createClient } from 'node-zendesk';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
    SUNSHINE_API_KEY: process.env.SUNSHINE_API_KEY,
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

// Función para crear un ticket en Zendesk
const createZendeskTicket = async (user, conversationId, message) => {
    try {
        const ticket = {
            ticket: {
                subject: `Chat con ${user.givenName} ${user.surname}`,
                comment: {
                    body: message,
                    is_public: false,
                    author: {
                        type: 'user',
                        id: user.id,
                        name: `${user.givenName} ${user.surname}`
                    }
                },
                requester: {
                    name: `${user.givenName} ${user.surname}`,
                    email: user.email
                },
                priority: 'normal',
                tags: ['chat', 'sunshine', `conversation_${conversationId}`]
            }
        };

        console.log('Creando ticket en Zendesk:', JSON.stringify(ticket, null, 2));
        const response = await zendeskClient.tickets.create(ticket);
        console.log('Ticket creado exitosamente:', response.id);
        return response;
    } catch (error) {
        console.error('Error al crear ticket en Zendesk:', error);
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

// Endpoint para crear usuario en Sunshine
app.post('/api/v1/zendesk/users', async (req, res) => {
    try {
        const { givenName, surname, email, phone, properties, externalId } = req.body;

        if (!givenName || !surname || !email) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                message: 'Se requiere givenName, surname y email'
            });
        }

        console.log('Creando usuario en Sunshine...');

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
        const userData = await createUserResponse.json();
        console.log('Respuesta de creación de usuario:', userData);

        if (!userData.user || !userData.user.id) {
            throw new Error(`Error en la respuesta de Sunshine: ${JSON.stringify(userData)}`);
        }

        // Crear una conversación inicial para el usuario
        const conversationData = await createConversation(userData.user.id);
        console.log('Conversación inicial creada:', conversationData);

        res.json({
            status: 'success',
            message: 'Usuario creado correctamente',
            user: userData.user,
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
        const { message, externalId, user } = req.body;

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
        const zendeskTicket = await createZendeskTicket(user, conversationId);
        console.log('Ticket de Zendesk creado:', zendeskTicket.id);

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

                // Solo procesamos comentarios de agentes o admins
                if (comment.author.role !== 'agent' && comment.author.role !== 'admin') {
                    console.log('Ignorando comentario que no es de agente o admin');
                    return res.status(200).json({ status: 'ignored', message: 'Comentario no es de agente o admin' });
                }

                try {
                    await sendMessageToSunshine(conversationId, comment.body, 'business', comment.author.name);
                    console.log('Mensaje de agente enviado exitosamente a Sunshine');

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

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '¡Algo salió mal!' });
});

// Iniciar el servidor
app.listen(config.PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${config.PORT}`);
});