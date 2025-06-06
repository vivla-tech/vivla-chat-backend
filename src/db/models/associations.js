import { User, Group, Message, InvitedGuest } from './index.js';

// Relaciones de User
User.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
User.hasMany(Message, {
    foreignKey: 'sender_id',
    as: 'messages'
});
User.hasMany(Group, { foreignKey: 'owner_id', as: 'ownedGroups' });

// Relaciones de Group
Group.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
Group.hasMany(InvitedGuest, { foreignKey: 'group_id', as: 'invitedGuests' });
Group.hasMany(Message, { foreignKey: 'group_id', as: 'messages' });

// Relaciones de Message
Message.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
Message.belongsTo(User, {
    foreignKey: 'sender_id',
    as: 'userSender'
});
Message.belongsTo(InvitedGuest, {
    foreignKey: 'sender_id',
    as: 'guestSender'
});

// Relaciones de InvitedGuest
InvitedGuest.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
InvitedGuest.hasMany(Message, {
    foreignKey: 'sender_id',
    as: 'messages'
}); 