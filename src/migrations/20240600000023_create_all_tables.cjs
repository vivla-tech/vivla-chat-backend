'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Crear tabla users
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
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
                allowNull: false
            },
            cw_source_id: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Chatwoot source ID para el usuario'
            },
            cw_contact_id: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Chatwoot contact ID para el usuario'
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            last_activity: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // Índices para users
        await queryInterface.addIndex('users', ['firebase_uid'], {
            name: 'users_firebase_uid'
        });
        await queryInterface.addIndex('users', ['email'], {
            name: 'users_email'
        });

        // 2. Crear tabla groups
        await queryInterface.createTable('groups', {
            group_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            owner_firebase_uid: {
                type: Sequelize.STRING,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'firebase_uid'
                }
            },
            cw_conversation_id: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Chatwoot conversation ID para el grupo'
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // Índices para groups
        await queryInterface.addIndex('groups', ['owner_firebase_uid'], {
            name: 'groups_owner_firebase_uid'
        });
        await queryInterface.addIndex('groups', ['cw_conversation_id'], {
            name: 'groups_cw_conversation_id'
        });

        // 3. Crear tabla messages
        await queryInterface.createTable('messages', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'groups',
                    key: 'group_id'
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
                defaultValue: Sequelize.NOW
            }
        });

        // Índices para messages
        await queryInterface.addIndex('messages', ['group_id'], {
            name: 'messages_group_id'
        });
        await queryInterface.addIndex('messages', ['sender_id'], {
            name: 'messages_sender_id'
        });
        await queryInterface.addIndex('messages', ['created_at'], {
            name: 'messages_created_at'
        });

        // 4. Crear tabla group_members
        await queryInterface.createTable('group_members', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'groups',
                    key: 'group_id'
                }
            },
            firebase_uid: {
                type: Sequelize.STRING,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'firebase_uid'
                }
            },
            role: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'member'
            },
            joined_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // Índices para group_members
        await queryInterface.addIndex('group_members', ['group_id', 'firebase_uid'], {
            unique: true,
            name: 'group_members_unique'
        });
        await queryInterface.addIndex('group_members', ['firebase_uid'], {
            name: 'group_members_firebase_uid'
        });

        // 5. Crear tabla invited_guests
        await queryInterface.createTable('invited_guests', {
            guest_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
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
            associated_group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'groups',
                    key: 'group_id'
                }
            },
            magic_token: {
                type: Sequelize.TEXT,
                allowNull: false,
                unique: true
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            last_seen_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // Índices para invited_guests
        await queryInterface.addIndex('invited_guests', ['associated_group_id'], {
            name: 'invited_guests_associated_group_id'
        });
        await queryInterface.addIndex('invited_guests', ['email'], {
            name: 'invited_guests_email'
        });
        await queryInterface.addIndex('invited_guests', ['magic_token'], {
            name: 'invited_guests_magic_token'
        });
    },

    async down(queryInterface, Sequelize) {
        // Eliminar tablas en orden inverso para respetar las dependencias
        await queryInterface.dropTable('invited_guests');
        await queryInterface.dropTable('group_members');
        await queryInterface.dropTable('messages');
        await queryInterface.dropTable('groups');
        await queryInterface.dropTable('users');
    }
}; 