import sequelize from '../config/database.js';
import User from './User.js';
import Group from './Group.js';
import InvitedGuest from './InvitedGuest.js';
import Message from './Message.js';
import GroupMember from './GroupMember.js';

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

Group.hasMany(Message, {
    foreignKey: 'group_id',
    as: 'messages'
});

User.hasMany(Message, {
    foreignKey: 'sender_id',
    sourceKey: 'id',
    as: 'messages'
});

GroupMember.belongsTo(User, { foreignKey: 'firebase_uid', targetKey: 'firebase_uid', as: 'member' });
GroupMember.belongsTo(Group, { foreignKey: 'group_id', as: 'groupRef' });

Group.hasMany(InvitedGuest, {
    foreignKey: 'associated_group_id',
    as: 'guests'
});
InvitedGuest.belongsTo(Group, {
    foreignKey: 'associated_group_id',
    as: 'group'
});

Group.belongsTo(User, {
    foreignKey: 'owner_firebase_uid',
    targetKey: 'firebase_uid',
    as: 'owner'
});

Group.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

Group.hasMany(GroupMember, {
    foreignKey: 'group_id',
    as: 'members'
});

GroupMember.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

export {
    sequelize,
    User,
    Group,
    InvitedGuest,
    Message,
    GroupMember
}; 