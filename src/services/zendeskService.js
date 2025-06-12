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

// Mapeo de equipos a valores de Zendesk
const TEAM_MAPPING = {
    'Owners': 'experiencia_del_cliente',
    'Properties': 'propiedades_y_mantenimiento',
    'VIVLA STUDIO': 'vivla_studio',
    'Otros': 'otros'
};

// Función para limpiar el mensaje del ticket eliminando las menciones
const cleanTicketMessage = (message) => {
    // Expresión regular que coincide con [@Zendesk](mention:xxxx) o [@Ticket](mention:xxxx)
    // Ignora mayúsculas/minúsculas y permite variaciones en el formato
    const mentionRegex = /\[@(?:Zendesk|Ticket|zendesk|ticket|ZENDESK|TICKET)\]\(mention:[^)]+\)\s*/i;
    
    // Reemplazar la mención con una cadena vacía
    return message.replace(mentionRegex, '').trim();
};

// Crear ticket en Zendesk
export const createTicket = async (userName, userEmail, agentName, message, priority, home, team, isAgentMessage = false) => {
    try {
        const cleanedMessage = cleanTicketMessage(message);
        const formattedMessage = isAgentMessage
            ? `[Agente ${agentName} - ${new Date().toLocaleString()}]\n\n ${cleanedMessage}`
            : cleanedMessage;

        // Mapear el equipo al valor requerido por Zendesk
        const mappedTeam = TEAM_MAPPING[team] || team;

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
                priority: priority.toLowerCase(),
                status: 'new',
                tags: ['chat'],
                custom_fields: [
                    {
                        id: 17925940459804,
                        value: home
                    },
                    {
                        id: 17926240467100,
                        value: mappedTeam
                    }
                ]
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