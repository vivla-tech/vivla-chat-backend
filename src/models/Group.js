import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

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
    owner_firebase_uid: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'users',
            key: 'firebase_uid'
        }
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

// Definir la relación con el usuario propietario
Group.belongsTo(User, {
    foreignKey: 'owner_firebase_uid',
    targetKey: 'firebase_uid',
    as: 'owner'
});

export default Group; 