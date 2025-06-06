import { DataTypes } from 'sequelize';
import { database as sequelize } from '../../config/index.js';

const Message = sequelize.define('Message', {
    message_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    group_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'groups',
            key: 'group_id'
        }
    },
    sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "UUID del remitente (puede ser usuario o invitado)"
    },
    sender_display_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message_type: {
        type: DataTypes.ENUM('text', 'image', 'video'),
        allowNull: false,
        defaultValue: 'text'
    },
    text_content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    media_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    chatwoot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "ID del mensaje en Chatwoot (opcional)"
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'messages',
    indexes: [
        {
            fields: ['group_id', 'created_at']
        },
        {
            fields: ['sender_id']
        },
        {
            fields: ['chatwoot_id']
        }
    ]
});

export default Message; 