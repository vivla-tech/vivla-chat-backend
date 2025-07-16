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
    file_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nombre del archivo adjunto'
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Tamaño del archivo en bytes'
    },
    file_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Tipo MIME del archivo'
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
    tags: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array de tags para categorizar el mensaje (ej: ["estancia", "incidencia", "alquiler"])'
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