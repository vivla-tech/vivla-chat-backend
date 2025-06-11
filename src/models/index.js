import sequelize from '../config/database.js';
import User from './User.js';
import Group from './Group.js';
import Message from './Message.js';
import GroupMember from './GroupMember.js';
import InvitedGuest from './InvitedGuest.js';

// Aquí definiremos las relaciones entre modelos cuando los creemos
// Por ejemplo:
// User.hasMany(Group);
// Group.belongsTo(User);

// Relaciones de User
User.hasMany(Group, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    as: 'ownedGroups'
});

User.hasMany(Message, {
    foreignKey: 'sender_id',
    sourceKey: 'id',
    as: 'sentMessages'
});

User.hasMany(GroupMember, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    as: 'groupMemberships'
});

// Relaciones de Group
Group.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'owner'
});

Group.hasMany(Message, {
    foreignKey: 'group_id',
    sourceKey: 'group_id',
    as: 'groupMessages'
});

Group.hasMany(GroupMember, {
    foreignKey: 'group_id',
    sourceKey: 'group_id',
    as: 'members'
});

Group.hasMany(InvitedGuest, {
    foreignKey: 'associated_group_id',
    sourceKey: 'group_id',
    as: 'invitedGuests'
});

// Relaciones de GroupMember
GroupMember.belongsTo(Group, {
    foreignKey: 'group_id',
    targetKey: 'group_id',
    as: 'group'
});

GroupMember.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'member'
});

// Relaciones de Message
Message.belongsTo(Group, {
    foreignKey: 'group_id',
    targetKey: 'group_id',
    as: 'group'
});

Message.belongsTo(User, {
    foreignKey: 'sender_id',
    targetKey: 'id',
    as: 'messageSender'
});

// Relaciones de InvitedGuest
InvitedGuest.belongsTo(Group, {
    foreignKey: 'associated_group_id',
    targetKey: 'group_id',
    as: 'group'
});

export {
    sequelize,
    User,
    Group,
    Message,
    GroupMember,
    InvitedGuest
}; 