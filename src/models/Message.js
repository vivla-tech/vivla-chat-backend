import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    group_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'groups',
            key: 'id'
        }
    },
    sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    sender_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'text'
    },

    media_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    thumb_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL de la imagen thumbnail para mensajes de tipo media'
    },
    direction: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'incoming',
        validate: {
            isIn: [['incoming', 'outgoing']]
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'messages'
});

export default Message; 