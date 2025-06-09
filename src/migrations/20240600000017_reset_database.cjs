module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Primero eliminamos todas las tablas existentes
        console.log('Dropping all existing tables...');
        await queryInterface.sequelize.query(`
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                -- Desactivar triggers temporalmente
                SET session_replication_role = 'replica';
                
                -- Eliminar todas las tablas
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
                LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
                
                -- Reactivar triggers
                SET session_replication_role = 'origin';
            END $$;
        `);

        // Crear tabla users según el modelo
        console.log('Creating users table...');
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
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
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false
            },
            last_activity: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: true
            }
        });

        // Crear tabla groups según el modelo
        console.log('Creating groups table...');
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
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false
            }
        });

        // Crear tabla group_members según el modelo
        console.log('Creating group_members table...');
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
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false
            }
        });

        // Crear tabla invited_guests según el modelo
        console.log('Creating invited_guests table...');
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
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                allowNull: false
            },
            last_seen_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // Crear índices adicionales
        console.log('Creating additional indexes...');
        await queryInterface.addIndex('users', ['email']);
        await queryInterface.addIndex('users', ['firebase_uid']);
        await queryInterface.addIndex('groups', ['owner_firebase_uid']);
        await queryInterface.addIndex('group_members', ['group_id']);
        await queryInterface.addIndex('group_members', ['firebase_uid']);
        await queryInterface.addIndex('invited_guests', ['email']);
        await queryInterface.addIndex('invited_guests', ['magic_token']);
        await queryInterface.addIndex('invited_guests', ['associated_group_id']);
    },

    down: async (queryInterface, Sequelize) => {
        // No implementamos down ya que esta migración es de reset
        console.log('This migration cannot be reverted as it is a reset migration');
    }
}; 