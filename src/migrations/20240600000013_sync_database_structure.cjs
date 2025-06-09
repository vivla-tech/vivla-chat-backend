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

        // Función auxiliar para verificar si un índice existe
        const indexExists = async (tableName, indexName) => {
            try {
                const indexes = await queryInterface.showIndex(tableName);
                return indexes.some(index => index.name === indexName);
            } catch (error) {
                return false;
            }
        };

        // Función auxiliar para eliminar una restricción única
        const removeUniqueConstraint = async (tableName, constraintName) => {
            try {
                await queryInterface.sequelize.query(
                    `ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${constraintName}";`
                );
                console.log(`Removed constraint ${constraintName} from ${tableName}`);
            } catch (error) {
                console.log(`Could not remove constraint ${constraintName}:`, error.message);
            }
        };

        // Actualizar tabla users
        const usersIdType = await getColumnType('users', 'id');
        if (usersIdType && usersIdType !== 'STRING') {
            console.log('Updating users.id column type to STRING...');
            await queryInterface.changeColumn('users', 'id', {
                type: Sequelize.STRING,
                primaryKey: true,
                allowNull: false
            });
        }

        // Actualizar tabla groups
        const groupsConversationIdType = await getColumnType('groups', 'cw_conversation_id');
        if (groupsConversationIdType && groupsConversationIdType !== 'STRING') {
            console.log('Updating groups.cw_conversation_id column type to STRING...');
            
            // Eliminar restricción única si existe
            const constraintName = 'groups_cw_conversation_id_key';
            await removeUniqueConstraint('groups', constraintName);

            // Cambiar tipo de columna
            await queryInterface.changeColumn('groups', 'cw_conversation_id', {
                type: Sequelize.STRING,
                allowNull: true
            });

            // Recrear restricción única
            console.log(`Creating unique constraint ${constraintName}...`);
            await queryInterface.sequelize.query(
                `ALTER TABLE "groups" ADD CONSTRAINT "${constraintName}" UNIQUE ("cw_conversation_id");`
            );
        }

        // Verificar y actualizar índices en users
        const usersIndices = ['users_email_key', 'users_firebase_uid_key'];
        for (const indexName of usersIndices) {
            if (!await indexExists('users', indexName)) {
                console.log(`Creating unique constraint ${indexName}...`);
                const column = indexName === 'users_email_key' ? 'email' : 'firebase_uid';
                await queryInterface.sequelize.query(
                    `ALTER TABLE "users" ADD CONSTRAINT "${indexName}" UNIQUE ("${column}");`
                );
            }
        }

        // Verificar y actualizar foreign keys
        const groupsCreatedByExists = await columnExists('groups', 'created_by');
        if (groupsCreatedByExists) {
            const fkName = 'groups_created_by_fkey';
            const fkExists = await indexExists('groups', fkName);
            
            if (!fkExists) {
                console.log(`Creating foreign key ${fkName}...`);
                try {
                    await queryInterface.addConstraint('groups', {
                        fields: ['created_by'],
                        type: 'foreign key',
                        name: fkName,
                        references: {
                            table: 'users',
                            field: 'id'
                        }
                    });
                } catch (error) {
                    console.log(`Could not create foreign key ${fkName}:`, error.message);
                }
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        // No implementamos down ya que esta migración es de sincronización
        // y no queremos revertir los cambios estructurales
        console.log('This migration cannot be reverted as it is a structural sync');
    }
}; 