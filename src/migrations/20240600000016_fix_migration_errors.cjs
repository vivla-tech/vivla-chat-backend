module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Función auxiliar para verificar si una columna existe
        const columnExists = async (tableName, columnName) => {
            const tableInfo = await queryInterface.describeTable(tableName);
            return !!tableInfo[columnName];
        };

        // Función auxiliar para verificar el tipo de una columna
        const getColumnType = async (tableName, columnName) => {
            const tableInfo = await queryInterface.describeTable(tableName);
            return tableInfo[columnName]?.type;
        };

        // 1. Verificar y renombrar created_by a owner_firebase_uid en groups si es necesario
        const hasCreatedBy = await columnExists('groups', 'created_by');
        const hasOwnerFirebaseUid = await columnExists('groups', 'owner_firebase_uid');

        if (hasCreatedBy && !hasOwnerFirebaseUid) {
            console.log('Renaming groups.created_by to owner_firebase_uid...');
            await queryInterface.renameColumn('groups', 'created_by', 'owner_firebase_uid');
        }

        // 2. Asegurarnos de que owner_firebase_uid es STRING
        if (await columnExists('groups', 'owner_firebase_uid')) {
            const ownerType = await getColumnType('groups', 'owner_firebase_uid');
            if (ownerType !== 'STRING') {
                console.log('Changing groups.owner_firebase_uid type to STRING...');
                await queryInterface.changeColumn('groups', 'owner_firebase_uid', {
                    type: Sequelize.STRING,
                    allowNull: false
                });
            }
        }

        // 3. Manejar el cambio de tipo de id en users de manera más segura
        const usersIdType = await getColumnType('users', 'id');
        if (usersIdType !== 'UUID') {
            console.log('Changing users.id column type to UUID...');
            
            // Primero eliminamos las foreign keys que dependen de users.id
            try {
                await queryInterface.sequelize.query(`
                    DO $$ 
                    DECLARE 
                        r RECORD;
                    BEGIN
                        FOR r IN (SELECT tc.constraint_name, tc.table_name
                                FROM information_schema.table_constraints tc
                                JOIN information_schema.constraint_column_usage ccu 
                                    ON tc.constraint_name = ccu.constraint_name
                                WHERE tc.constraint_type = 'FOREIGN KEY' 
                                AND ccu.table_name = 'users'
                                AND ccu.column_name = 'id')
                        LOOP
                            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                                   ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
                        END LOOP;
                    END $$;
                `);
                console.log('Removed foreign key constraints that depend on users.id');
            } catch (error) {
                console.log('Could not remove foreign key constraints:', error.message);
            }

            // Eliminamos la primary key
            try {
                await queryInterface.sequelize.query(
                    'ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey";'
                );
                console.log('Removed primary key constraint');
            } catch (error) {
                console.log('Could not remove primary key:', error.message);
            }

            // Cambiamos el tipo de la columna
            await queryInterface.sequelize.query(`
                ALTER TABLE "users" 
                ALTER COLUMN "id" TYPE UUID USING 
                CASE 
                    WHEN id ~ '^[0-9]+$' THEN 
                        uuid_generate_v4() 
                    ELSE 
                        id::UUID 
                END;
            `);
            console.log('Changed column type to UUID');

            // Recreamos la primary key
            await queryInterface.sequelize.query(
                'ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");'
            );
            console.log('Recreated primary key constraint');

            // Añadimos el valor por defecto
            await queryInterface.sequelize.query(`
                ALTER TABLE "users" 
                ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
            `);
            console.log('Added UUID default value');
        }

        // 4. Verificar y recrear las foreign keys
        try {
            // Foreign key para groups.owner_firebase_uid
            await queryInterface.addConstraint('groups', {
                fields: ['owner_firebase_uid'],
                type: 'foreign key',
                name: 'groups_owner_firebase_uid_fkey',
                references: {
                    table: 'users',
                    field: 'firebase_uid'
                }
            });
            console.log('Created foreign key for groups.owner_firebase_uid');
        } catch (error) {
            console.log('Could not create foreign key for groups.owner_firebase_uid:', error.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // No implementamos down ya que esta migración es de corrección
        console.log('This migration cannot be reverted as it is a correction migration');
    }
}; 