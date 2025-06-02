import sequelize from '../config/database.js';
import User from './User.js';
import Group from './Group.js';
import InvitedGuest from './InvitedGuest.js';
import Message from './Message.js';

// Aquí definiremos las relaciones entre modelos cuando los creemos
// Por ejemplo:
// User.hasMany(Group);
// Group.belongsTo(User);

// Definir relaciones
User.hasMany(Group, {
    foreignKey: 'owner_firebase_uid',
    sourceKey: 'firebase_uid',
    as: 'ownedGroups'
});

Group.hasMany(InvitedGuest, {
    foreignKey: 'associated_group_id',
    as: 'guests'
});

Group.hasMany(Message, {
    foreignKey: 'group_id',
    as: 'messages'
});

InvitedGuest.hasMany(Message, {
    foreignKey: 'sender_guest_id',
    as: 'messages'
});

User.hasMany(Message, {
    foreignKey: 'sender_firebase_uid',
    sourceKey: 'firebase_uid',
    as: 'messages'
});

export {
    sequelize,
    User,
    Group,
    InvitedGuest,
    Message
}; 