import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const InvitedGuest = sequelize.define('InvitedGuest', {
    guest_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    associated_group_id: {
        type: DataTypes.INTEGER,
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
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'last_seen_at',
    tableName: 'invited_guests'
});

export default InvitedGuest; 