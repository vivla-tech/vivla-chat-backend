'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Primero eliminamos las restricciones de clave foránea existentes
        await queryInterface.removeConstraint('messages', 'messages_group_id_fkey');
        await queryInterface.removeConstraint('messages', 'messages_sender_firebase_uid_fkey');
        await queryInterface.removeConstraint('messages', 'messages_sender_guest_id_fkey');

        // Eliminamos las columnas que ya no necesitamos
        await queryInterface.removeColumn('messages', 'sender_firebase_uid');
        await queryInterface.removeColumn('messages', 'sender_guest_id');
        await queryInterface.removeColumn('messages', 'sender_display_name');
        await queryInterface.removeColumn('messages', 'text_content');
        await queryInterface.removeColumn('messages', 'media_url');

        // Eliminamos la columna message_id y creamos id como UUID
        await queryInterface.removeColumn('messages', 'message_id');
        await queryInterface.addColumn('messages', 'id', {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        });

        // Actualizamos group_id a UUID
        await queryInterface.changeColumn('messages', 'group_id', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'groups',
                key: 'id'
            }
        });

        // Añadimos sender_id como UUID
        await queryInterface.addColumn('messages', 'sender_id', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        });

        // Actualizamos message_type a STRING
        await queryInterface.changeColumn('messages', 'message_type', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'text'
        });

        // Añadimos content como TEXT
        await queryInterface.addColumn('messages', 'content', {
            type: Sequelize.TEXT,
            allowNull: false
        });

        // Aseguramos que created_at existe y tiene el valor por defecto
        await queryInterface.changeColumn('messages', 'created_at', {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        });
    },

    async down(queryInterface, Sequelize) {
        // Eliminamos las nuevas columnas y restricciones
        await queryInterface.removeConstraint('messages', 'messages_group_id_fkey');
        await queryInterface.removeConstraint('messages', 'messages_sender_id_fkey');
        await queryInterface.removeColumn('messages', 'sender_id');
        await queryInterface.removeColumn('messages', 'content');
        await queryInterface.removeColumn('messages', 'id');

        // Restauramos la estructura original
        await queryInterface.addColumn('messages', 'message_id', {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        });

        await queryInterface.changeColumn('messages', 'group_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'groups',
                key: 'group_id'
            }
        });

        await queryInterface.addColumn('messages', 'sender_firebase_uid', {
            type: Sequelize.STRING,
            allowNull: true,
            references: {
                model: 'users',
                key: 'firebase_uid'
            }
        });

        await queryInterface.addColumn('messages', 'sender_guest_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'invited_guests',
                key: 'guest_id'
            }
        });

        await queryInterface.addColumn('messages', 'sender_display_name', {
            type: Sequelize.STRING,
            allowNull: false
        });

        await queryInterface.changeColumn('messages', 'message_type', {
            type: Sequelize.ENUM('text', 'image', 'video'),
            allowNull: false,
            defaultValue: 'text'
        });

        await queryInterface.addColumn('messages', 'text_content', {
            type: Sequelize.TEXT,
            allowNull: true
        });

        await queryInterface.addColumn('messages', 'media_url', {
            type: Sequelize.STRING,
            allowNull: true
        });
    }
}; 