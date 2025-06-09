module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Función auxiliar para verificar el tipo de una columna
        const getColumnType = async (tableName, columnName) => {
            const tableInfo = await queryInterface.describeTable(tableName);
            return tableInfo[columnName]?.type;
        };

        // 1. Actualizar cw_source_id y cw_contact_id en users
        const usersSourceIdType = await getColumnType('users', 'cw_source_id');
        const usersContactIdType = await getColumnType('users', 'cw_contact_id');

        if (usersSourceIdType === 'INTEGER') {
            console.log('Changing users.cw_source_id type to STRING...');
            await queryInterface.changeColumn('users', 'cw_source_id', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (usersContactIdType === 'INTEGER') {
            console.log('Changing users.cw_contact_id type to STRING...');
            await queryInterface.changeColumn('users', 'cw_contact_id', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        // 2. Actualizar house_name en users
        const usersHouseNameInfo = await queryInterface.describeTable('users');
        if (usersHouseNameInfo.house_name.allowNull) {
            console.log('Making users.house_name NOT NULL...');
            await queryInterface.changeColumn('users', 'house_name', {
                type: Sequelize.STRING,
                allowNull: false
            });
        }

        // 3. Asegurarnos de que owner_firebase_uid en groups es STRING
        const groupsOwnerType = await getColumnType('groups', 'owner_firebase_uid');
        if (groupsOwnerType !== 'STRING') {
            console.log('Changing groups.owner_firebase_uid type to STRING...');
            await queryInterface.changeColumn('groups', 'owner_firebase_uid', {
                type: Sequelize.STRING,
                allowNull: false
            });
        }

        // 4. Asegurarnos de que firebase_uid en group_members es STRING
        const groupMembersFirebaseType = await getColumnType('group_members', 'firebase_uid');
        if (groupMembersFirebaseType !== 'STRING') {
            console.log('Changing group_members.firebase_uid type to STRING...');
            await queryInterface.changeColumn('group_members', 'firebase_uid', {
                type: Sequelize.STRING,
                allowNull: false
            });
        }

        // 5. Verificar y recrear las foreign keys si es necesario
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

        try {
            // Foreign key para group_members.firebase_uid
            await queryInterface.addConstraint('group_members', {
                fields: ['firebase_uid'],
                type: 'foreign key',
                name: 'group_members_firebase_uid_fkey',
                references: {
                    table: 'users',
                    field: 'firebase_uid'
                }
            });
            console.log('Created foreign key for group_members.firebase_uid');
        } catch (error) {
            console.log('Could not create foreign key for group_members.firebase_uid:', error.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // No implementamos down ya que esta migración es de corrección
        console.log('This migration cannot be reverted as it is a correction migration');
    }
}; 