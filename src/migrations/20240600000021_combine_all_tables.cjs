'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Crear tabla users
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

        // Índices para users
        await queryInterface.addIndex('users', ['firebase_uid'], {
            name: 'users_firebase_uid'
        });
        await queryInterface.addIndex('users', ['email'], {
            name: 'users_email'
        });

        // 2. Crear tabla groups
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

        // Índices para groups
        await queryInterface.addIndex('groups', ['owner_id'], {
            name: 'groups_owner_id'
        });
        await queryInterface.addIndex('groups', ['conversation_id'], {
            name: 'groups_conversation_id'
        });

        // 3. Crear tabla messages
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

        // Índices para group_members
        await queryInterface.addIndex('group_members', ['group_id', 'user_id'], {
            unique: true,
            name: 'group_members_unique'
        });
        await queryInterface.addIndex('group_members', ['user_id'], {
            name: 'group_members_user_id'
        });

        // 5. Crear tabla invited_guests
        await queryInterface.createTable('invited_guests', {
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
            email: {
                type: Sequelize.STRING,
                allowNull: false
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            magic_token: {
                type: Sequelize.STRING,
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
            }
        });

        // Índices para invited_guests
        await queryInterface.addIndex('invited_guests', ['group_id'], {
            name: 'invited_guests_group_id'
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