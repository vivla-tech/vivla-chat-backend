import { DataTypes } from 'sequelize';
import { database as sequelize } from '../../config/index.js';

const InvitedGuest = sequelize.define('InvitedGuest', {
    guest_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    group_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'groups',
            key: 'group_id'
        }
    },
    magic_token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'expired'),
        allowNull: false,
        defaultValue: 'pending'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    last_seen_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'last_seen_at',
    tableName: 'invited_guests',
});

export default InvitedGuest; 