import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DiffusionGroupMember = sequelize.define('DiffusionGroupMember', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    diffusion_group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'diffusion_groups',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'diffusion_group_members'
});

export default DiffusionGroupMember; 