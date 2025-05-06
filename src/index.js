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
const createZendeskTicket = async (user, message, conversationId) => {
    try {
        const ticket = {
            ticket: {
                subject: `Chat con ${user.givenName} ${user.surname}`,
                comment: {
                    body: message
                },
                requester: {
                    name: `${user.givenName} ${user.surname}`,
                    email: user.email
                },
                priority: 'normal',
                tags: ['chat', 'sunshine', `conversation_${conversationId}`]
            }
        };

        const response = await zendeskClient.tickets.create(ticket);
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

// Endpoint para crear usuario en Sunshine
app.post('/api/v1/zendesk/users', async (req, res) => {
    try {
        const { givenName, surname, email, phone, properties } = req.body;

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
                externalId: `user_${Date.now()}`,
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

        if (!message || !externalId) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                message: 'Se requiere message y externalId'
            });
        }

        console.log('Enviando mensaje a Sunshine:', { message, externalId });

        const conversationData = await createConversation(externalId);
        const conversationId = conversationData.conversation.id;

        // Enviar mensaje a Sunshine con el nombre del usuario
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

        const zendeskTicket = await createZendeskTicket(user, message, conversationId);

        res.json({
            status: 'success',
            message: 'Mensaje enviado correctamente',
            data: {
                conversationId: conversationId,
                messageId: responseData.messages[0].id,
                timestamp: responseData.messages[0].received,
                content: responseData.messages[0].content,
                zendeskTicketId: zendeskTicket.id
            }
        });
    } catch (error) {
        console.error('Error:', error);
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

                // Verificar si es un comentario privado
                if (!comment.is_public) {
                    console.log('Ignorando comentario privado');
                    return res.status(200).json({ status: 'ignored', message: 'Comentario privado' });
                }

                // Buscar el ID de conversación en los tags
                const conversationId = ticket.tags.find(tag => tag.startsWith('conversation_'))?.split('_')[1];

                if (!conversationId) {
                    console.error('No se encontró ID de conversación en los tags del ticket:', ticket.tags);
                    return res.status(400).json({ error: 'No se encontró conversación asociada' });
                }

                console.log('Procesando comentario público:', {
                    ticketId: ticket.id,
                    conversationId,
                    commentId: comment.id,
                    author: comment.author.name,
                    message: comment.body.substring(0, 100) + '...' // Log solo los primeros 100 caracteres
                });

                try {
                    // Enviar el mensaje a Sunshine con el nombre del agente
                    await sendMessageToSunshine(conversationId, comment.body, 'business', comment.author.name);
                    console.log('Mensaje enviado exitosamente a Sunshine');

                    res.json({
                        status: 'success',
                        message: 'Mensaje enviado a Sunshine',
                        data: {
                            ticketId: ticket.id,
                            conversationId,
                            commentId: comment.id
                        }
                    });
                } catch (error) {
                    console.error('Error al enviar mensaje a Sunshine:', error);
                    // Intentamos reenviar el mensaje una vez más
                    try {
                        await sendMessageToSunshine(conversationId, comment.body, 'business', comment.author.name);
                        console.log('Mensaje reenviado exitosamente a Sunshine');
                        res.json({
                            status: 'success',
                            message: 'Mensaje reenviado a Sunshine',
                            data: {
                                ticketId: ticket.id,
                                conversationId,
                                commentId: comment.id
                            }
                        });
                    } catch (retryError) {
                        console.error('Error en reintento de envío a Sunshine:', retryError);
                        res.status(500).json({
                            error: 'Error al enviar mensaje a Sunshine',
                            details: retryError.message
                        });
                    }
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

        // Primero intentamos obtener la conversación
        const conversationResponse = await fetch(`${ZENDESK_CONFIG.API_URL}/apps/${ZENDESK_CONFIG.SUNSHINE_APP_ID}/conversations/${conversationId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${ZENDESK_CONFIG.APP_ID}:${ZENDESK_CONFIG.APP_SECRET}`).toString('base64')}`
            }
        });

        if (!conversationResponse.ok) {
            // Si la conversación no existe, devolvemos un array vacío en lugar de un error
            return res.json({ messages: [] });
        }

        const messages = await getConversationMessages(conversationId);
        res.json({ messages });
    } catch (error) {
        console.error('Error:', error);
        // En caso de error, devolvemos un array vacío en lugar de un error
        res.json({ messages: [] });
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