import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    firebase_uid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    house_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cw_source_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Chatwoot source ID para el usuario'
    },
    cw_contact_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Chatwoot contact ID para el usuario'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    last_activity: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    group_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'groups',
            key: 'group_id'
        }
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'last_activity',
    tableName: 'users'
});

// Añadir la asociación con Group
User.associate = (models) => {
    User.belongsTo(models.Group, {
        foreignKey: 'group_id',
        as: 'group'
    });
};

export default User; 