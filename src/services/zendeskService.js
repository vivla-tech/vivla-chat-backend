import { createClient } from 'node-zendesk';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Zendesk
const ZENDESK_CONFIG = {
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

// Crear ticket en Zendesk
export const createTicket = async (userName, userEmail, agentName, message, isAgentMessage = false) => {
    try {
        const formattedMessage = isAgentMessage
            ? `[Agente ${agentName} - ${new Date().toLocaleString()}] ${message}`
            : message;

        const ticket = {
            ticket: {
                subject: `Chat del propietario ${userName} con ${agentName}`,
                comment: {
                    body: formattedMessage,
                    public: true
                },
                requester: {
                    name: userName,
                    email: userEmail
                },
                priority: 'normal',
                status: 'new',
                tags: ['chat']
            }
        };

        console.log('Creando nuevo ticket con datos:', {
            user: userName,
            agent: agentName,
            tags: ticket.ticket.tags,
            messageType: isAgentMessage ? 'agent' : 'user'
        });

        const response = await zendeskClient.tickets.create(ticket);
        console.log('Ticket creado exitosamente:', {
            id: response.id,
            status: response.status,
            created_at: response.created_at
        });
        
        return response;
    } catch (error) {
        console.error('Error al crear ticket en Zendesk:', error);
        throw error;
    }
}; 