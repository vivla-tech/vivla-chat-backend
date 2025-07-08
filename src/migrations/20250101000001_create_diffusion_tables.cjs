'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Crear tabla diffusion_groups
        await queryInterface.createTable('diffusion_groups', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // Índices para diffusion_groups
        await queryInterface.addIndex('diffusion_groups', ['name'], {
            name: 'diffusion_groups_name'
        });

        // 2. Crear tabla diffusion_group_members
        await queryInterface.createTable('diffusion_group_members', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            diffusion_group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'diffusion_groups',
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
            joined_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // Índices para diffusion_group_members
        await queryInterface.addIndex('diffusion_group_members', ['diffusion_group_id', 'user_id'], {
            unique: true,
            name: 'diffusion_group_members_unique'
        });
        await queryInterface.addIndex('diffusion_group_members', ['diffusion_group_id'], {
            name: 'diffusion_group_members_group_id'
        });
        await queryInterface.addIndex('diffusion_group_members', ['user_id'], {
            name: 'diffusion_group_members_user_id'
        });

        // 3. Crear tabla diffusion_messages
        await queryInterface.createTable('diffusion_messages', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            diffusion_group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'diffusion_groups',
                    key: 'id'
                }
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            message_type: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'text'
            },
            media_url: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            thumb_url: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'URL de la imagen thumbnail para mensajes de tipo media'
            },
            file_name: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Nombre del archivo adjunto'
            },
            file_size: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Tamaño del archivo en bytes'
            },
            file_type: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Tipo MIME del archivo'
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // Índices para diffusion_messages
        await queryInterface.addIndex('diffusion_messages', ['diffusion_group_id'], {
            name: 'diffusion_messages_group_id'
        });
        await queryInterface.addIndex('diffusion_messages', ['created_at'], {
            name: 'diffusion_messages_created_at'
        });
        await queryInterface.addIndex('diffusion_messages', ['message_type'], {
            name: 'diffusion_messages_type'
        });
    },

    async down(queryInterface, Sequelize) {
        // Eliminar tablas en orden inverso para respetar las foreign keys
        await queryInterface.dropTable('diffusion_messages');
        await queryInterface.dropTable('diffusion_group_members');
        await queryInterface.dropTable('diffusion_groups');
    }
}; 