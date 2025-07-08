import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DiffusionGroup = sequelize.define('DiffusionGroup', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
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
    tableName: 'diffusion_groups'
});

export default DiffusionGroup; 