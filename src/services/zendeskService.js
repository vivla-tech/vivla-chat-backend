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

// Mapeo de prioridades a valores de Zendesk
const PRIORITY_MAPPING = {
    'urgente': 'urgent',
    'alta': 'high',
    'normal': 'normal',
    'baja': 'low',
};

// Crear ticket en Zendesk
export const createTicket = async (userName, userEmail, agentName, message, priority, home, team, conversation_id, isAgentMessage = false) => {
    try {
        const formattedMessage = isAgentMessage
            ? `[Agente ${agentName} - ${new Date().toLocaleString()}]\n\n ${message}`
            : message;

        // Mapear el equipo al valor requerido por Zendesk
        const mappedTeam = TEAM_MAPPING[team] || team;
        // Mapear la prioridad al valor requerido por Zendesk
        const mappedPriority = PRIORITY_MAPPING[priority.toLowerCase()] || 'normal';

        const ticket = {
            ticket: {
                external_id: conversation_id,
                subject: `Chat del propietario ${userName} con ${agentName}`,
                comment: {
                    body: formattedMessage,
                    public: true
                },
                requester: {
                    name: userName,
                    email: userEmail
                },
                priority: mappedPriority,
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

/**
 * Maneja el cambio de estado de un ticket de Zendesk
 * @param {Object} ticketDetail - Detalles del ticket
 * @param {Object} event - Información del evento
 */
export const handleTicketStatusChange = async (ticketDetail, event) => {
    try {
        console.log('Processing ticket status change:', {
            ticketId: ticketDetail.id,
            previousStatus: event.previous,
            currentStatus: event.current,
            subject: ticketDetail.subject
        });

        // Aquí puedes implementar la lógica específica para manejar los cambios de estado
        // Por ejemplo:
        // - Actualizar el estado en tu base de datos
        // - Notificar a otros sistemas
        // - Enviar notificaciones
        // - etc.

        // Por ahora solo logueamos la información
        return {
            success: true,
            ticketId: ticketDetail.id,
            statusChange: {
                from: event.previous,
                to: event.current
            }
        };
    } catch (error) {
        console.error('Error handling ticket status change:', error);
        throw error;
    }
}; 