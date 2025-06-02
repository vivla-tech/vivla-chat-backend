import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Group from './Group.js';
import InvitedGuest from './InvitedGuest.js';

const Message = sequelize.define('Message', {
    message_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'groups',
            key: 'group_id'
        }
    },
    sender_firebase_uid: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: 'users',
            key: 'firebase_uid'
        }
    },
    sender_guest_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'invited_guests',
            key: 'guest_id'
        }
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
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    tableName: 'messages',
    validate: {
        senderIsValid() {
            if (!this.sender_firebase_uid && !this.sender_guest_id) {
                throw new Error('El mensaje debe tener un remitente (usuario o invitado)');
            }
            if (this.sender_firebase_uid && this.sender_guest_id) {
                throw new Error('El mensaje no puede tener ambos tipos de remitente');
            }
        }
    }
});

// Definir las relaciones
Message.belongsTo(Group, {
    foreignKey: 'group_id',
    as: 'group'
});

Message.belongsTo(User, {
    foreignKey: 'sender_firebase_uid',
    targetKey: 'firebase_uid',
    as: 'sender'
});

Message.belongsTo(InvitedGuest, {
    foreignKey: 'sender_guest_id',
    as: 'guestSender'
});

export default Message; 