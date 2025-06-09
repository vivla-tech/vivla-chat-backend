'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Verificar si la tabla ya existe
        const tables = await queryInterface.showAllTables();
        if (tables.includes('groups')) {
            console.log('La tabla groups ya existe, saltando creación...');
            return;
        }

        await queryInterface.createTable('groups', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            owner_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            conversation_id: {
                type: Sequelize.INTEGER,
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
        const indexes = await queryInterface.showIndex('groups');
        const indexNames = indexes.map(index => index.name);

        if (!indexNames.includes('groups_owner_id')) {
            await queryInterface.addIndex('groups', ['owner_id'], {
                name: 'groups_owner_id'
            });
        }

        if (!indexNames.includes('groups_conversation_id')) {
            await queryInterface.addIndex('groups', ['conversation_id'], {
                name: 'groups_conversation_id'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('groups');
    }
}; 