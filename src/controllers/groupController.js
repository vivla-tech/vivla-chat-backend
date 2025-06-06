import { Group, User, InvitedGuest } from '../db/models/index.js';

export const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findByPk(groupId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['name', 'email']
                },
                {
                    model: InvitedGuest,
                    as: 'invitedGuests',
                    attributes: ['guest_id', 'name', 'email', 'status', 'last_seen_at']
                }
            ]
        });

        if (!group) {
            return res.status(404).json({
                error: 'Grupo no encontrado',
                details: `No existe un grupo con el ID: ${groupId}`
            });
        }

        return res.json({
            group_id: group.group_id,
            name: group.name,
            created_at: group.created_at,
            owner: group.owner,
            invitedGuests: group.invitedGuests
        });
    } catch (error) {
        console.error('Error al obtener grupo:', error);
        return res.status(500).json({
            error: 'Error al obtener el grupo',
            details: error.message
        });
    }
}; 