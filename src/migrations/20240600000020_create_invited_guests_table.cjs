'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Verificar si la tabla ya existe
        const tables = await queryInterface.showAllTables();
        if (tables.includes('invited_guests')) {
            console.log('La tabla invited_guests ya existe, saltando creación...');
            return;
        }

        await queryInterface.createTable('invited_guests', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            group_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'groups',
                    key: 'id'
                }
            },
            magic_token: {
                type: Sequelize.TEXT,
                allowNull: false,
                unique: true
            },
            status: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'pending',
                validate: {
                    isIn: [['pending', 'accepted', 'rejected']]
                }
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
            },
            last_seen_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // Verificar si los índices existen antes de crearlos
        const indexes = await queryInterface.showIndex('invited_guests');
        const indexNames = indexes.map(index => index.name);

        if (!indexNames.includes('invited_guests_email')) {
            await queryInterface.addIndex('invited_guests', ['email'], {
                name: 'invited_guests_email'
            });
        }

        if (!indexNames.includes('invited_guests_magic_token')) {
            await queryInterface.addIndex('invited_guests', ['magic_token'], {
                name: 'invited_guests_magic_token'
            });
        }

        if (!indexNames.includes('invited_guests_group_id')) {
            await queryInterface.addIndex('invited_guests', ['group_id'], {
                name: 'invited_guests_group_id'
            });
        }

        if (!indexNames.includes('invited_guests_status')) {
            await queryInterface.addIndex('invited_guests', ['status'], {
                name: 'invited_guests_status'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('invited_guests');
    }
}; 