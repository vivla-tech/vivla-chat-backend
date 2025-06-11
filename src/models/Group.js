import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Group = sequelize.define('Group', {
    group_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    owner_firebase_uid: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'users',
            key: 'firebase_uid'
        }
    },
    cw_conversation_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Chatwoot conversation ID para el grupo'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'groups'
});

export default Group; 