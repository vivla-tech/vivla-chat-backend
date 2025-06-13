import { handleTicketStatusChange } from '../services/zendeskService.js';

/**
 * Maneja los webhooks de Zendesk
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const handleZendeskWebhook = async (req, res) => {
    try {
        const { type, detail, event } = req.body;

        // Verificar que es un evento de cambio de estado de ticket
        if (type === 'zen:event-type:ticket.status_changed') {
            await handleTicketStatusChange(detail, event);
            return res.status(200).json({ message: 'Webhook processed successfully' });
        }

        // Si no es un evento que manejamos, respondemos 200 pero no hacemos nada
        return res.status(200).json({ message: 'Event type not handled' });
    } catch (error) {
        console.error('Error processing Zendesk webhook:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}; 