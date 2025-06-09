'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            firebase_uid: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            house_name: {
                type: Sequelize.STRING,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });

        // Verificar si los índices existen antes de crearlos
        const indexes = await queryInterface.showIndex('users');
        const indexNames = indexes.map(index => index.name);

        if (!indexNames.includes('users_firebase_uid')) {
            await queryInterface.addIndex('users', ['firebase_uid'], {
                name: 'users_firebase_uid'
            });
        }

        if (!indexNames.includes('users_email')) {
            await queryInterface.addIndex('users', ['email'], {
                name: 'users_email'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('users');
    }
}; 