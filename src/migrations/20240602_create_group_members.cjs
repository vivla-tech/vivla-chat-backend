// Migración para crear la tabla group_members
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('group_members', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'groups',
                    key: 'group_id'
                },
                onDelete: 'CASCADE'
            },
            firebase_uid: {
                type: Sequelize.STRING,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'firebase_uid'
                },
                onDelete: 'CASCADE'
            },
            role: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'member'
            },
            joined_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('NOW')
            }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('group_members');
    }
}; 