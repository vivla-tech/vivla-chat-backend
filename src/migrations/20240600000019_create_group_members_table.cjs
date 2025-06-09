'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Verificar si la tabla ya existe
        const tables = await queryInterface.showAllTables();
        if (tables.includes('group_members')) {
            console.log('La tabla group_members ya existe, saltando creación...');
            return;
        }

        await queryInterface.createTable('group_members', {
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
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            role: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'member'
            },
            joined_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
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
        const indexes = await queryInterface.showIndex('group_members');
        const indexNames = indexes.map(index => index.name);

        if (!indexNames.includes('group_members_group_id')) {
            await queryInterface.addIndex('group_members', ['group_id'], {
                name: 'group_members_group_id'
            });
        }

        if (!indexNames.includes('group_members_user_id')) {
            await queryInterface.addIndex('group_members', ['user_id'], {
                name: 'group_members_user_id'
            });
        }

        // Añadir índice único para evitar duplicados
        if (!indexNames.includes('group_members_unique_member')) {
            await queryInterface.addIndex('group_members', ['group_id', 'user_id'], {
                unique: true,
                name: 'group_members_unique_member'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('group_members');
    }
}; 