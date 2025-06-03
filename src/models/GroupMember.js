import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GroupMember = sequelize.define('GroupMember', {
    id: {
        type: DataTypes.INTEGER,
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
    firebase_uid: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'users',
            key: 'firebase_uid'
        }
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'member'
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'group_members'
});

export default GroupMember;
