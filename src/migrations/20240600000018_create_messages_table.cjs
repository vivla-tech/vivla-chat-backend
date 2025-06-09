'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('messages', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            group_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'groups',
                    key: 'id'
                }
            },
            sender_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            message_type: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'text'
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false
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
        const indexes = await queryInterface.showIndex('messages');
        const indexNames = indexes.map(index => index.name);

        if (!indexNames.includes('messages_group_id')) {
            await queryInterface.addIndex('messages', ['group_id'], {
                name: 'messages_group_id'
            });
        }

        if (!indexNames.includes('messages_sender_id')) {
            await queryInterface.addIndex('messages', ['sender_id'], {
                name: 'messages_sender_id'
            });
        }

        if (!indexNames.includes('messages_created_at')) {
            await queryInterface.addIndex('messages', ['created_at'], {
                name: 'messages_created_at'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('messages');
    }
}; 